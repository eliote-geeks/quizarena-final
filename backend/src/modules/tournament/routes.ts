import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { credit, debit, getBalance, InsufficientBalanceError } from "../wallet/ledger.js";
import { TOURNAMENT_CAPACITIES, isTournamentCapacity } from "./payout.js";
import { maybeStartTournament, withTournamentLock } from "./bracket.js";
import { QUESTIONS_PER_SESSION } from "../quiz/questions.js";

const createSchema = z.object({
  categoryId: z.string().min(1),
  stakeCoins: z.number().int().min(100).max(50_000),
  capacity: z.number().int().refine(isTournamentCapacity, "capacité invalide (4, 8 ou 16)"),
});

/** Vue résumée pour une liste (écran "tournois ouverts"). */
async function serializeSummary(t: {
  id: string;
  categoryId: string;
  stakeCoins: number;
  capacity: number;
  status: string;
  createdAt: Date;
  entries: { userId: string }[];
}) {
  const category = await prisma.category.findUnique({ where: { id: t.categoryId }, select: { nameFr: true } });
  return {
    id: t.id,
    categoryId: t.categoryId,
    categoryName: category?.nameFr ?? t.categoryId,
    stakeCoins: t.stakeCoins,
    capacity: t.capacity,
    status: t.status,
    entryCount: t.entries.length,
    createdAt: t.createdAt,
  };
}

/** Vue détaillée pour l'écran d'un tournoi précis — bracket complet avec
 * pseudos résolus, et le prochain match du joueur courant s'il y en a un. */
async function serializeDetail(tournamentId: string, myUserId: string) {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      entries: { include: { user: { select: { username: true } } }, orderBy: { seed: "asc" } },
      matches: { orderBy: [{ round: "asc" }, { slot: "asc" }] },
    },
  });
  if (!t) return null;

  const category = await prisma.category.findUnique({ where: { id: t.categoryId }, select: { nameFr: true } });
  const userIds = new Set<string>();
  for (const m of t.matches) {
    if (m.playerAId) userIds.add(m.playerAId);
    if (m.playerBId) userIds.add(m.playerBId);
  }
  const users = await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, username: true } });
  const usernameOf = new Map(users.map((u) => [u.id, u.username]));

  const rounds = new Map<number, typeof t.matches>();
  for (const m of t.matches) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round)!.push(m);
  }

  const totalRounds = Math.log2(t.capacity);
  const bracket = [...rounds.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, matches]) => ({
      round,
      label: round === totalRounds ? "Finale" : round === totalRounds - 1 ? "Demi-finale" : `Tour ${round}`,
      matches: matches
        .sort((a, b) => a.slot - b.slot)
        .map((m) => ({
          id: m.id,
          playerA: m.playerAId ? { id: m.playerAId, username: usernameOf.get(m.playerAId) ?? "?" } : null,
          playerB: m.playerBId ? { id: m.playerBId, username: usernameOf.get(m.playerBId) ?? "?" } : null,
          winnerId: m.winnerId,
          status: m.status,
        })),
    }));

  // Le match que CE joueur doit aller jouer maintenant, s'il y en a un.
  const myMatch = t.matches.find(
    (m) =>
      (m.playerAId === myUserId || m.playerBId === myUserId) &&
      (m.status === "READY" || m.status === "IN_PROGRESS")
  );

  const myEntry = t.entries.find((e) => e.userId === myUserId) ?? null;

  return {
    id: t.id,
    categoryId: t.categoryId,
    categoryName: category?.nameFr ?? t.categoryId,
    stakeCoins: t.stakeCoins,
    capacity: t.capacity,
    status: t.status,
    entries: t.entries.map((e) => ({
      userId: e.userId,
      username: e.user.username,
      eliminatedRound: e.eliminatedRound,
      placement: e.placement,
      payoutCoins: e.payoutCoins,
    })),
    bracket,
    myEntry: myEntry && { joined: true, placement: myEntry.placement, payoutCoins: myEntry.payoutCoins },
    myNextMatchId: myMatch?.id ?? null,
    createdAt: t.createdAt,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
  };
}

export async function tournamentRoutes(app: FastifyInstance) {
  app.get("/api/tournaments", { preHandler: [app.authenticate] }, async (req, reply) => {
    const open = await prisma.tournament.findMany({
      where: { status: "REGISTERING" },
      include: { entries: { select: { userId: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const mine = await prisma.tournamentEntry.findMany({
      where: { userId: req.user.userId },
      include: { tournament: { include: { entries: { select: { userId: true } } } } },
      orderBy: { joinedAt: "desc" },
      take: 20,
    });

    return reply.send({
      open: await Promise.all(open.map(serializeSummary)),
      mine: await Promise.all(mine.map((e) => serializeSummary(e.tournament))),
      capacities: TOURNAMENT_CAPACITIES,
    });
  });

  app.get("/api/tournaments/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const detail = await serializeDetail(id, req.user.userId);
    if (!detail) return reply.notFound("Tournoi introuvable");
    return reply.send(detail);
  });

  app.post("/api/tournaments", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = createSchema.parse(req.body);
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
      include: { _count: { select: { questions: { where: { active: true } } } } },
    });
    if (!category) return reply.badRequest("Catégorie inconnue");
    // Chaque match du bracket pioche QUESTIONS_PER_SESSION questions
    // dans cette catégorie (§duel/engine.ts createTournamentMatch) —
    // sans assez de contenu vérifié, un round planterait en plein
    // tournoi une fois les droits d'entrée déjà débités.
    if (category._count.questions < QUESTIONS_PER_SESSION) return reply.badRequest("Catégorie pas encore assez fournie pour un tournoi");

    const balance = await getBalance(req.user.userId);
    if (balance < body.stakeCoins) return reply.badRequest("Solde insuffisant pour ce droit d'entrée");

    const tournament = await prisma.tournament.create({
      data: { categoryId: body.categoryId, stakeCoins: body.stakeCoins, capacity: body.capacity },
    });

    try {
      await debit({ userId: req.user.userId, type: "STAKE", amountCoins: body.stakeCoins, metadata: { tournamentId: tournament.id } });
    } catch (err) {
      await prisma.tournament.delete({ where: { id: tournament.id } });
      if (err instanceof InsufficientBalanceError) return reply.badRequest("Solde insuffisant pour ce droit d'entrée");
      throw err;
    }
    await prisma.tournamentEntry.create({ data: { tournamentId: tournament.id, userId: req.user.userId } });

    await maybeStartTournament(tournament.id); // ne démarre jamais ici : une seule inscription, capacité min 4

    return reply.send(await serializeSummary({ ...tournament, entries: [{ userId: req.user.userId }] }));
  });

  app.post("/api/tournaments/:id/join", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    // Sérialisé par tournoi : sans ça, deux inscriptions concurrentes
    // pour la dernière place pourraient toutes les deux lire "pas encore
    // complet" et dépasser la capacité (§bracket.ts withTournamentLock).
    const result = await withTournamentLock(id, async () => {
      const tournament = await prisma.tournament.findUnique({ where: { id }, include: { entries: true } });
      if (!tournament) return { error: "notFound" as const };
      if (tournament.status !== "REGISTERING") return { error: "badRequest" as const, message: "Ce tournoi n'accepte plus d'inscriptions" };
      if (tournament.entries.length >= tournament.capacity) return { error: "badRequest" as const, message: "Tournoi complet" };
      if (tournament.entries.some((e) => e.userId === req.user.userId)) return { error: "badRequest" as const, message: "Déjà inscrit à ce tournoi" };

      try {
        await debit({ userId: req.user.userId, type: "STAKE", amountCoins: tournament.stakeCoins, metadata: { tournamentId: tournament.id } });
      } catch (err) {
        if (err instanceof InsufficientBalanceError) return { error: "badRequest" as const, message: "Solde insuffisant pour ce droit d'entrée" };
        throw err;
      }
      await prisma.tournamentEntry.create({ data: { tournamentId: tournament.id, userId: req.user.userId } });
      await maybeStartTournament(tournament.id);
      return { error: null };
    });

    if (result.error === "notFound") return reply.notFound("Tournoi introuvable");
    if (result.error === "badRequest") return reply.badRequest(result.message);

    const detail = await serializeDetail(id, req.user.userId);
    return reply.send(detail);
  });

  app.post("/api/tournaments/:id/leave", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return reply.notFound("Tournoi introuvable");
    if (tournament.status !== "REGISTERING") return reply.badRequest("Le tournoi a déjà commencé, impossible de se désinscrire");

    const entry = await prisma.tournamentEntry.findUnique({ where: { tournamentId_userId: { tournamentId: id, userId: req.user.userId } } });
    if (!entry) return reply.badRequest("Pas inscrit à ce tournoi");

    const stakeTx = await prisma.transaction.findFirst({
      where: { userId: req.user.userId, type: "STAKE", metadata: { path: ["tournamentId"], equals: id } },
      orderBy: { createdAt: "desc" },
    });
    if (stakeTx) {
      await credit({ userId: req.user.userId, type: "REFUND", amountCoins: tournament.stakeCoins, relatedTransactionId: stakeTx.id, metadata: { tournamentId: id, reason: "leave_before_start" } });
    }
    await prisma.tournamentEntry.delete({ where: { id: entry.id } });

    return reply.send({ ok: true });
  });
}
