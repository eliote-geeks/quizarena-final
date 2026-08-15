// Bracket à élimination directe — capacité toujours une puissance de 2
// (4/8/16, §payout.ts) : aucun bye au tirage initial, chaque round est
// intégralement rempli. Le seul cas de "bye" possible est un accident en
// cours de route (double défaut de présentation, §engine.ts
// resolveTournamentWalkover) — géré ici par cascade récursive, pas par
// construction.

import { prisma } from "../../lib/prisma.js";
import { credit } from "../wallet/ledger.js";
import { scheduleTournamentWalkover, TOURNAMENT_WALKOVER_MS } from "../duel/engine.js";
import { tournamentShares } from "./payout.js";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Appelé après chaque inscription — démarre le tournoi dès que la
 * capacité est atteinte (jamais avant : pas de tournoi à moitié rempli). */
export async function maybeStartTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUniqueOrThrow({
    where: { id: tournamentId },
    include: { entries: true },
  });
  if (tournament.status !== "REGISTERING") return;
  if (tournament.entries.length < tournament.capacity) return;

  const seeded = shuffle(tournament.entries.map((e) => e.userId));
  await prisma.$transaction(
    seeded.map((userId, i) =>
      prisma.tournamentEntry.updateMany({ where: { tournamentId, userId }, data: { seed: i } })
    )
  );

  await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "IN_PROGRESS", startedAt: new Date() } });

  for (let i = 0; i < seeded.length; i += 2) {
    const row = await prisma.tournamentMatch.create({
      data: { tournamentId, round: 1, slot: i / 2, playerAId: seeded[i]!, playerBId: seeded[i + 1]!, status: "READY" },
    });
    scheduleTournamentWalkover(row.id, TOURNAMENT_WALKOVER_MS);
  }
}

/** Appelé par le moteur de duel (via duel/hooks.ts) quand un
 * TournamentMatch se termine — vraie partie jouée ou walkover. */
export async function advanceBracket(tournamentMatchId: string, winnerId: string | null) {
  const match = await prisma.tournamentMatch.findUnique({ where: { id: tournamentMatchId } });
  if (!match || match.status === "COMPLETED") return; // déjà traité (garde-fou double appel)

  await prisma.tournamentMatch.update({
    where: { id: tournamentMatchId },
    data: { status: "COMPLETED", winnerId, completedAt: new Date() },
  });

  const eliminated = [match.playerAId, match.playerBId].filter((id): id is string => !!id && id !== winnerId);
  if (eliminated.length) {
    await prisma.tournamentEntry.updateMany({
      where: { tournamentId: match.tournamentId, userId: { in: eliminated } },
      data: { eliminatedRound: match.round },
    });
  }

  // Les deux matches d'un même round finissent souvent à quelques
  // millisecondes d'écart (deux WebSocket en parallèle) : sans
  // sérialisation, les deux appels concurrents à advanceBracket peuvent
  // chacun constater "round complet" et créer DEUX fois le round
  // suivant (bug constaté en test — la finale se retrouvait dupliquée,
  // une copie jamais jouée, et completeTournament() piochait au hasard
  // laquelle des deux regarder). Un seul process Node (§engine.ts même
  // principe que `reserving`) : un verrou en mémoire par tournoi suffit.
  await withTournamentLock(match.tournamentId, () => maybeAdvanceRound(match.tournamentId, match.round));
}

const tournamentLocks = new Map<string, Promise<unknown>>();

/** Sérialise tout ce qui touche à un même tournoi (inscriptions ET
 * avancement de bracket) — un seul process Node, donc un verrou en
 * mémoire suffit à éliminer les courses (double inscription qui dépasse
 * la capacité, double génération du round suivant, §advanceBracket). */
export function withTournamentLock<T>(tournamentId: string, fn: () => Promise<T>): Promise<T> {
  const prev = tournamentLocks.get(tournamentId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  tournamentLocks.set(
    tournamentId,
    run.catch(() => {})
  );
  return run;
}

async function maybeAdvanceRound(tournamentId: string, round: number) {
  const roundMatches = await prisma.tournamentMatch.findMany({ where: { tournamentId, round }, orderBy: { slot: "asc" } });
  if (roundMatches.some((m) => m.status !== "COMPLETED")) return; // round pas fini, on attend les autres matches

  const tournament = await prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
  const totalRounds = Math.log2(tournament.capacity);

  if (round >= totalRounds) {
    if (tournament.status === "COMPLETED") return; // déjà traité par un appel concurrent (§withTournamentLock)
    await completeTournament(tournament, totalRounds);
    return;
  }

  const nextRound = round + 1;
  // Idempotence : les deux matches d'un round complètent chacun leur
  // propre écriture COMPLETED avant même d'entrer dans le verrou (voir
  // advanceBracket) — sans ce garde-fou, le second appel, une fois son
  // tour venu dans la file du verrou, verrait lui aussi "round complet"
  // et recréerait le round suivant en double (bug constaté en test).
  const already = await prisma.tournamentMatch.findFirst({ where: { tournamentId, round: nextRound } });
  if (already) return;

  const nextIds: string[] = [];
  for (let i = 0; i < roundMatches.length; i += 2) {
    const m1 = roundMatches[i]!;
    const m2 = roundMatches[i + 1]!;
    const row = await prisma.tournamentMatch.create({
      data: {
        tournamentId,
        round: nextRound,
        slot: i / 2,
        playerAId: m1.winnerId,
        playerBId: m2.winnerId,
        status: m1.winnerId && m2.winnerId ? "READY" : "PENDING",
      },
    });
    nextIds.push(row.id);
  }

  for (const id of nextIds) {
    const row = await prisma.tournamentMatch.findUniqueOrThrow({ where: { id } });
    if (row.status === "READY") {
      scheduleTournamentWalkover(row.id, TOURNAMENT_WALKOVER_MS);
    } else {
      // Un des deux côtés n'a produit aucun vainqueur (double défaut au
      // tour précédent) : le seul joueur restant avance sans jouer.
      // Cascade récursive possible jusqu'à la finale dans le pire des cas.
      const lone = row.playerAId ?? row.playerBId ?? null;
      await advanceBracket(row.id, lone);
    }
  }
}

async function completeTournament(tournament: { id: string; capacity: number; stakeCoins: number }, totalRounds: number) {
  const finalMatch = await prisma.tournamentMatch.findFirstOrThrow({ where: { tournamentId: tournament.id, round: totalRounds } });
  const winnerId = finalMatch.winnerId;
  const runnerUpId = winnerId
    ? finalMatch.playerAId === winnerId
      ? finalMatch.playerBId
      : finalMatch.playerAId
    : null;

  const semiRound = totalRounds - 1;
  const semiMatches = await prisma.tournamentMatch.findMany({ where: { tournamentId: tournament.id, round: semiRound } });
  const semiLoserIds = semiMatches
    .filter((m) => m.winnerId) // ignore les matches sans vainqueur identifiable (double défaut)
    .map((m) => (m.playerAId === m.winnerId ? m.playerBId : m.playerAId))
    .filter((id): id is string => !!id);

  const pot = tournament.stakeCoins * tournament.capacity;
  const shares = tournamentShares(pot);

  const payouts: { userId: string; amount: number; placement: number }[] = [];
  if (winnerId) payouts.push({ userId: winnerId, amount: shares.first, placement: 1 });
  if (runnerUpId) payouts.push({ userId: runnerUpId, amount: shares.second, placement: 2 });
  for (const id of semiLoserIds) payouts.push({ userId: id, amount: shares.semiEach, placement: 3 });

  for (const p of payouts) {
    if (p.amount > 0) {
      await credit({ userId: p.userId, type: "PAYOUT", amountCoins: p.amount, metadata: { tournamentId: tournament.id, placement: p.placement } });
    }
    await prisma.tournamentEntry.updateMany({
      where: { tournamentId: tournament.id, userId: p.userId },
      data: { placement: p.placement, payoutCoins: p.amount },
    });
  }
  // Tout le reste des inscrits : éliminés plus tôt, placement=0 (pas de
  // gain) — distingue explicitement "traité, rien gagné" de "pas encore
  // connu" (null), utile pour l'écran "mes tournois" côté front.
  await prisma.tournamentEntry.updateMany({
    where: { tournamentId: tournament.id, placement: null },
    data: { placement: 0, payoutCoins: 0 },
  });

  await prisma.tournament.update({ where: { id: tournament.id }, data: { status: "COMPLETED", completedAt: new Date() } });
}
