import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

/** Gains totaux (somme des PAYOUT réglés) d'un joueur — c'est ça le
 * classement, pas un ELO. Ne compte que ce qui a réellement été crédité
 * (COMPLETED) : un gain en quarantaine anti-triche ne fait pas monter au
 * classement tant qu'il n'est pas confirmé. */
async function totalWinnings(userId: string) {
  const r = await prisma.transaction.aggregate({
    where: { userId, type: "PAYOUT", status: "COMPLETED" },
    _sum: { amountCoins: true },
  });
  return r._sum.amountCoins ?? 0;
}

export async function playerRoutes(app: FastifyInstance) {
  app.get("/api/leaderboard", { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });

    const grouped = await prisma.transaction.groupBy({
      by: ["userId"],
      where: { type: "PAYOUT", status: "COMPLETED" },
      _sum: { amountCoins: true },
      orderBy: { _sum: { amountCoins: "desc" } },
      take: 50,
    });

    const users = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) }, accountStatus: { in: ["ACTIVE", "WATCHED"] }, isBot: false },
      select: { id: true, username: true, region: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const leaderboard = grouped
      .filter((g) => byId.has(g.userId))
      .map((g, i) => {
        const u = byId.get(g.userId)!;
        return {
          rank: i + 1,
          id: u.id,
          username: u.username,
          winningsCoins: g._sum.amountCoins ?? 0,
          region: u.region,
          me: u.id === me.id,
        };
      });

    const myWinnings = await totalWinnings(me.id);

    // Si le joueur courant n'est pas dans le top 50, on calcule son rang
    // réel plutôt que de le laisser invisible — c'est lui qui regarde.
    let myRank = leaderboard.find((r) => r.me)?.rank ?? null;
    if (myRank === null) {
      const better = await prisma.transaction.groupBy({
        by: ["userId"],
        where: { type: "PAYOUT", status: "COMPLETED" },
        _sum: { amountCoins: true },
        having: { amountCoins: { _sum: { gt: myWinnings } } },
      });
      myRank = better.length + 1;
    }

    return reply.send({ leaderboard, myRank, myWinnings });
  });

  app.get("/api/quiz/history", { preHandler: [app.authenticate] }, async (req, reply) => {
    const sessions = await prisma.quizSession.findMany({
      where: { userId: req.user.userId, status: "SUBMITTED" },
      orderBy: { startedAt: "desc" },
      take: 30,
      include: {
        category: { select: { nameFr: true } },
        transactions: { where: { type: "PAYOUT" }, select: { amountCoins: true, status: true } },
      },
    });

    const history = sessions.map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      categoryName: s.category.nameFr,
      mode: s.mode,
      scoreServer: s.scoreServer,
      totalQuestions: (s.questionIds as unknown[]).length,
      stakeCoins: s.stakeCoins,
      payoutCoins: s.transactions[0]?.amountCoins ?? 0,
      eloDelta: s.eloDelta,
      startedAt: s.startedAt,
    }));

    return reply.send({ history });
  });
}
