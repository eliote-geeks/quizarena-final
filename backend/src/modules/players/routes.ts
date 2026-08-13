import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";

export async function playerRoutes(app: FastifyInstance) {
  app.get("/api/leaderboard", { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });

    const top = await prisma.user.findMany({
      where: { accountStatus: { in: ["ACTIVE", "WATCHED"] } },
      orderBy: { eloRating: "desc" },
      take: 50,
      select: { id: true, username: true, eloRating: true, region: true },
    });

    const leaderboard = top.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      username: u.username,
      eloRating: u.eloRating,
      region: u.region,
      me: u.id === me.id,
    }));

    // Si le joueur courant n'est pas dans le top 50, on calcule son rang
    // réel plutôt que de le laisser invisible — c'est lui qui regarde.
    let myRank = leaderboard.find((r) => r.me)?.rank ?? null;
    if (myRank === null) {
      const better = await prisma.user.count({
        where: { accountStatus: { in: ["ACTIVE", "WATCHED"] }, eloRating: { gt: me.eloRating } },
      });
      myRank = better + 1;
    }

    return reply.send({ leaderboard, myRank, myElo: me.eloRating });
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
