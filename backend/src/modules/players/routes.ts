import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { randomUUID } from "crypto";
import { getOnlineUserIds } from "../duel/engine.js";

// Prisma as any — les modèles ClanMember, UserReport et les relations
// clanMembership/stats sur User sont ajoutés par une migration SQL manuelle ;
// le client TypeScript local n'est pas regénéré (pas de DB locale) donc le
// compilateur ne les voit pas. À l'exécution le client Prisma du VPS est
// correctement regénéré (npx prisma generate après migration).
const db = prisma as any;

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

  // Historique réel des duels du joueur. L'ancienne interface 3010
  // affichait des « replays » inventés ; tant que les permutations de
  // chaque question ne sont pas persistées, on expose un récapitulatif
  // honnête (adversaire, score, mise, résultat) plutôt qu'une fausse vidéo.
  app.get("/api/duel/history", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { page = "1", perPage = "20" } = req.query as { page?: string; perPage?: string };
    const currentPage = Math.max(1, parseInt(page) || 1);
    const size = Math.min(50, Math.max(1, parseInt(perPage) || 20));
    const where = {
      status: "COMPLETED" as const,
      OR: [{ playerAId: req.user.userId }, { playerBId: req.user.userId }],
    };
    const [matches, total] = await Promise.all([
      prisma.duelMatch.findMany({
        where,
        orderBy: { completedAt: "desc" },
        skip: (currentPage - 1) * size,
        take: size,
        include: {
          playerA: { select: { id: true, username: true } },
          playerB: { select: { id: true, username: true } },
          tournamentMatch: { select: { tournamentId: true } },
          clanWarMatch: { select: { id: true } },
        },
      }),
      prisma.duelMatch.count({ where }),
    ]);
    return reply.send({
      matches: matches.map((match) => ({
        id: match.id,
        playerA: match.playerA.username,
        playerB: match.playerB.username,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        stakeCoins: match.stakeCoins,
        winnerId: match.winnerId,
        result: match.winnerId === req.user.userId ? "win" : match.winnerId ? "loss" : "draw",
        context: match.tournamentMatch ? "TOURNAMENT" : match.clanWarMatch ? "CLAN_WAR" : "STANDARD",
        completedAt: match.completedAt,
      })),
      total,
      page: currentPage,
      pages: Math.ceil(total / size),
    });
  });

  // ── Recherche joueurs ─────────────────────────────────────────────
  app.get("/api/players/search", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 2) return reply.send({ players: [] });
    const users = await db.user.findMany({
      where: {
        username: { contains: q.trim(), mode: "insensitive" },
        isBot: false,
        accountStatus: { in: ["ACTIVE", "WATCHED"] },
      },
      select: { id: true, username: true, region: true, createdAt: true, clanMembership: { include: { clan: { select: { name: true, tag: true, bannerColor: true, emblemKey: true } } } } },
      take: 20,
      orderBy: { username: "asc" },
    });
    const online = new Set(getOnlineUserIds());
    return reply.send({
      players: users.map((u: any) => ({
        id: u.id, username: u.username, region: u.region,
        online: online.has(u.id),
        clan: u.clanMembership?.clan ?? null,
      })),
    });
  });

  // ── Joueurs en ligne ─────────────────────────────────────────────
  app.get("/api/players/online", { preHandler: [app.authenticate] }, async (_req, reply) => {
    const ids = getOnlineUserIds();
    if (ids.length === 0) return reply.send({ online: [] });
    const users = await db.user.findMany({
      where: { id: { in: ids }, isBot: false, accountStatus: { in: ["ACTIVE", "WATCHED"] } },
      select: { id: true, username: true, region: true, clanMembership: { include: { clan: { select: { name: true, tag: true, bannerColor: true, emblemKey: true } } } } },
      take: 50,
    });
    return reply.send({
      online: users.map((u: any) => ({
        id: u.id, username: u.username, region: u.region,
        clan: u.clanMembership?.clan ?? null,
      })),
    });
  });

  // ── Profil public d'un joueur ─────────────────────────────────────
  app.get("/api/players/profile/:username", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { username } = req.params as { username: string };
    const user = await db.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, isBot: false },
      select: {
        id: true, username: true, region: true, createdAt: true,
        accountStatus: true,
        stats: true,
        clanMembership: { include: { clan: true } },
      },
    });
    if (!user) return reply.notFound("Joueur introuvable");

    const online = new Set(getOnlineUserIds());

    // Totaux financiers
    const [winnings, duelsWon, duelsPlayed] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: user.id, type: "PAYOUT", status: "COMPLETED" },
        _sum: { amountCoins: true },
      }),
      prisma.duelMatch.count({ where: { winnerId: user.id, status: "COMPLETED" } }),
      prisma.duelMatch.count({ where: { OR: [{ playerAId: user.id }, { playerBId: user.id }], status: "COMPLETED" } }),
    ]);

    // Derniers duels (public : pas de mise ni de gains)
    const recentDuels = await prisma.duelMatch.findMany({
      where: { OR: [{ playerAId: user.id }, { playerBId: user.id }], status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: {
        id: true, scoreA: true, scoreB: true, winnerId: true, completedAt: true, stakeCoins: true,
        playerA: { select: { id: true, username: true } },
        playerB: { select: { id: true, username: true } },
      },
    });

    return reply.send({
      id: user.id,
      username: user.username,
      region: user.region,
      createdAt: user.createdAt,
      online: online.has(user.id),
      clan: user.clanMembership?.clan ?? null,
      clanRole: user.clanMembership?.role ?? null,
      stats: {
        totalGames: user.stats?.totalGames ?? 0,
        winRateGlobal: user.stats?.winRateGlobal ?? 0,
        avgScore: user.stats?.avgScore ?? 0,
        games7d: user.stats?.games7d ?? 0,
        winRate7d: user.stats?.winRate7d ?? 0,
        duelsWon,
        duelsPlayed,
        winningsCoins: winnings._sum.amountCoins ?? 0,
      },
      recentDuels: recentDuels.map((d) => ({
        id: d.id,
        playerA: d.playerA.username,
        playerB: d.playerB.username,
        scoreA: d.scoreA,
        scoreB: d.scoreB,
        winnerId: d.winnerId,
        completedAt: d.completedAt,
        stakeCoins: d.stakeCoins,
      })),
    });
  });

  // ── Signaler un joueur ────────────────────────────────────────────
  app.post("/api/players/report", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { targetUsername, reason, detail } = req.body as {
      targetUsername: string; reason: string; detail?: string;
    };
    const VALID_REASONS = ["CHEATING", "HARASSMENT", "SPAM", "BUG", "OTHER"];
    if (!VALID_REASONS.includes(reason)) return reply.badRequest("Raison invalide");

    const target = await prisma.user.findFirst({ where: { username: targetUsername, isBot: false } });
    if (!target) return reply.notFound("Joueur introuvable");
    if (target.id === req.user.userId) return reply.badRequest("Tu ne peux pas te signaler toi-même");

    // Anti-spam : 1 signalement par cible par 24h
    const recent = await (prisma as any).userReport.findFirst({
      where: {
        reporterId: req.user.userId, targetId: target.id,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recent) return reply.tooManyRequests("Tu as déjà signalé ce joueur récemment");

    await (prisma as any).userReport.create({
      data: { id: randomUUID(), reporterId: req.user.userId, targetId: target.id, reason, detail: detail?.trim() || null },
    });

    return reply.send({ ok: true });
  });
}
