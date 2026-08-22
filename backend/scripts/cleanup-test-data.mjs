#!/usr/bin/env node
/**
 * Nettoyage de préproduction demandé avant ouverture publique.
 *
 * Par défaut : inventaire uniquement.
 * Exécution : node --env-file=.env scripts/cleanup-test-data.mjs --execute
 *
 * Garanties :
 * - conserve paul_test, tous les admins et le compte bot ;
 * - supprime tous les clans et tournois de test ;
 * - préserve le ledger de paul_test quand un duel contre un compte test
 *   disparaît (la référence duelMatchId est détachée, pas la transaction).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const execute = process.argv.includes("--execute");

async function main() {
  const users = await prisma.user.findMany({
    where: { isBot: false },
    select: { id: true, username: true, isAdmin: true },
    orderBy: { createdAt: "asc" },
  });
  const targets = users.filter((user) => !user.isAdmin && user.username !== "paul_test");
  const targetIds = targets.map((user) => user.id);
  const [clans, tournaments, duelMatches, quizSessions] = await Promise.all([
    prisma.clan.count(),
    prisma.tournament.count(),
    prisma.duelMatch.findMany({ where: { OR: [{ playerAId: { in: targetIds } }, { playerBId: { in: targetIds } }] }, select: { id: true } }),
    prisma.quizSession.findMany({ where: { userId: { in: targetIds } }, select: { id: true } }),
  ]);

  const report = {
    execute,
    preserved: users.filter((user) => user.isAdmin || user.username === "paul_test").map((user) => user.username),
    usersToDelete: targets.map((user) => user.username),
    counts: { users: targets.length, clans, tournaments, duelMatches: duelMatches.length, quizSessions: quizSessions.length },
  };
  console.log(JSON.stringify(report, null, 2));
  if (!execute) return;

  const duelIds = duelMatches.map((match) => match.id);
  const sessionIds = quizSessions.map((session) => session.id);

  await prisma.$transaction(async (tx) => {
    // Les clans emportent recherches, candidatures, invitations, guerres,
    // équipes et confrontations via leurs cascades déclarées.
    await tx.clan.deleteMany();

    // Prisma n'a pas de cascade sur le bracket de tournoi.
    await tx.tournamentMatch.deleteMany();
    await tx.tournamentEntry.deleteMany();
    await tx.tournament.deleteMany();

    // Conserver l'historique financier du compte paul_test, tout en
    // supprimant la FK vers les duels de comptes tests.
    if (duelIds.length) {
      await tx.transaction.updateMany({ where: { duelMatchId: { in: duelIds }, userId: { notIn: targetIds } }, data: { duelMatchId: null } });
      await tx.duelAnswer.deleteMany({ where: { duelMatchId: { in: duelIds } } });
      await tx.transaction.deleteMany({ where: { duelMatchId: { in: duelIds }, userId: { in: targetIds } } });
      await tx.duelMatch.deleteMany({ where: { id: { in: duelIds } } });
    }

    if (sessionIds.length) {
      await tx.quizAnswer.deleteMany({ where: { sessionId: { in: sessionIds } } });
    }
    await tx.transaction.deleteMany({ where: { userId: { in: targetIds } } });
    await tx.quizSession.deleteMany({ where: { userId: { in: targetIds } } });
    await tx.flag.deleteMany({ where: { userId: { in: targetIds } } });
    await tx.playerStats.deleteMany({ where: { userId: { in: targetIds } } });
    await tx.userReport.deleteMany({ where: { OR: [{ reporterId: { in: targetIds } }, { targetId: { in: targetIds } }] } });
    await tx.clanJoinRequest.deleteMany({ where: { userId: { in: targetIds } } });
    await tx.clanMember.deleteMany({ where: { userId: { in: targetIds } } });
    await tx.user.deleteMany({ where: { id: { in: targetIds } } });
  }, { timeout: 120_000 });

  const finalUsers = await prisma.user.findMany({ where: { isBot: false }, select: { username: true, isAdmin: true }, orderBy: { username: "asc" } });
  console.log(JSON.stringify({
    deleted: report.counts,
    remainingUsers: finalUsers,
    remainingClans: await prisma.clan.count(),
    remainingTournaments: await prisma.tournament.count(),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
