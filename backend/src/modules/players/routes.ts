import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { randomUUID } from "crypto";
import { getOnlineUserIds } from "../duel/engine.js";
import { resolveVipStatus, VIP_WINDOW_DAYS } from "../vip/service.js";

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

/** Statut VIP en lot pour une liste de joueurs — un seul groupBy plutôt
 * qu'un aller-retour DB par joueur affiché (§getVipStatus fait ça pour un
 * seul compte, pas adapté à une liste). Visible publiquement depuis le
 * 31/08 (retour Paul : "le statut des membres doit être visible") — sur
 * l'annuaire, la recherche, les connectés et le profil public, jamais sur
 * accountStatus qui reste interne (§10 anti-triche : ne jamais révéler à
 * quelqu'un qu'il est surveillé). */
async function batchVipStatus(users: { id: string; vipGrantedAt: Date | null; isAdmin: boolean }[]) {
  if (users.length === 0) return new Map<string, boolean>();
  const since = new Date(Date.now() - VIP_WINDOW_DAYS * 24 * 60 * 60_000);
  const winsAgg = await db.duelMatch.groupBy({
    by: ["winnerId"],
    where: { winnerId: { in: users.map((u) => u.id) }, status: "COMPLETED", completedAt: { gte: since } },
    _count: { winnerId: true },
  });
  const winsMap = Object.fromEntries(winsAgg.map((r: any) => [r.winnerId, r._count.winnerId]));
  return new Map(users.map((u) => [u.id, resolveVipStatus(u.vipGrantedAt, winsMap[u.id] ?? 0, u.isAdmin).isVip]));
}

export async function playerRoutes(app: FastifyInstance) {
  app.get("/api/leaderboard", { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });
    // Pagination (31/08, retour Paul : "je ne vois pas de menu de
    // navigation") — avant ça, le classement s'arrêtait net à 50 sans
    // aucun moyen d'aller plus loin. `perPage` par défaut à 50 pour ne
    // rien changer aux appels existants qui ne passent pas ces params.
    const { page = "1", perPage = "50" } = req.query as { page?: string; perPage?: string };
    const take = Math.min(100, Math.max(1, parseInt(perPage) || 50));
    const currentPage = Math.max(1, parseInt(page) || 1);

    const [grouped, totalEarners] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["userId"],
        where: { type: "PAYOUT", status: "COMPLETED" },
        _sum: { amountCoins: true },
        orderBy: { _sum: { amountCoins: "desc" } },
        skip: (currentPage - 1) * take,
        take,
      }),
      prisma.transaction.groupBy({
        by: ["userId"],
        where: { type: "PAYOUT", status: "COMPLETED" },
        _sum: { amountCoins: true },
      }).then((rows) => rows.length),
    ]);

    const users = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) }, accountStatus: { in: ["ACTIVE", "WATCHED"] }, isBot: false },
      select: { id: true, username: true, region: true, avatarUrl: true, vipGrantedAt: true, isAdmin: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const vip = await batchVipStatus(users);

    const leaderboard = grouped
      .filter((g) => byId.has(g.userId))
      .map((g, i) => {
        const u = byId.get(g.userId)!;
        return {
          rank: (currentPage - 1) * take + i + 1,
          id: u.id,
          username: u.username,
          winningsCoins: g._sum.amountCoins ?? 0,
          region: u.region,
          avatarUrl: u.avatarUrl ?? null,
          isVip: vip.get(u.id) ?? false,
          me: u.id === me.id,
        };
      });

    const myWinnings = await totalWinnings(me.id);

    // Rang réel du joueur courant, qu'il soit visible sur cette page ou
    // non — c'est lui qui regarde, jamais invisible pour lui-même.
    const better = await prisma.transaction.groupBy({
      by: ["userId"],
      where: { type: "PAYOUT", status: "COMPLETED" },
      _sum: { amountCoins: true },
      having: { amountCoins: { _sum: { gt: myWinnings } } },
    });
    const myRank = better.length + 1;

    return reply.send({
      leaderboard, myRank, myWinnings,
      page: currentPage,
      totalPages: Math.max(1, Math.ceil(totalEarners / take)),
    });
  });

  app.get("/api/quiz/history", { preHandler: [app.authenticate] }, async (req, reply) => {
    const sessions = await prisma.quizSession.findMany({
      where: { userId: req.user.userId, status: { in: ["SUBMITTED", "EXPIRED"] } },
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
      outcome: s.status === "EXPIRED" ? "ABANDONNÉ" : "TERMINÉ",
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
          playerA: { select: { id: true, username: true, avatarUrl: true } },
          playerB: { select: { id: true, username: true, avatarUrl: true } },
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
        playerAAvatarUrl: match.playerA.avatarUrl ?? null,
        playerBAvatarUrl: match.playerB.avatarUrl ?? null,
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
  // ── Annuaire complet, paginé ───────────────────────────────────────
  // Avant le 31/08, /players n'avait aucun moyen de "juste tout voir" —
  // seulement une recherche par pseudo ou la liste des connectés. Ordre
  // alphabétique : stable d'une page à l'autre même si des comptes sont
  // créés entre deux chargements (contrairement à un tri par date).
  app.get("/api/players", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { page = "1", perPage = "24" } = req.query as { page?: string; perPage?: string };
    const take = Math.min(50, Math.max(1, parseInt(perPage) || 24));
    const current = Math.max(1, parseInt(page) || 1);

    const where = { isBot: false, accountStatus: { in: ["ACTIVE", "WATCHED"] as const } };
    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        select: { id: true, username: true, region: true, avatarUrl: true, vipGrantedAt: true, isAdmin: true },
        orderBy: { username: "asc" },
        skip: (current - 1) * take,
        take,
      }),
    ]);

    const online = new Set(getOnlineUserIds());
    const since = new Date(Date.now() - VIP_WINDOW_DAYS * 24 * 60 * 60_000);
    const winsAgg = await db.duelMatch.groupBy({
      by: ["winnerId"],
      where: { winnerId: { in: users.map((u: any) => u.id) }, status: "COMPLETED", completedAt: { gte: since } },
      _count: { winnerId: true },
    });
    const winsMap = Object.fromEntries(winsAgg.map((r: any) => [r.winnerId, r._count.winnerId]));

    return reply.send({
      players: users.map((u: any) => ({
        id: u.id, username: u.username, region: u.region, avatarUrl: u.avatarUrl ?? null,
        online: online.has(u.id),
        isVip: resolveVipStatus(u.vipGrantedAt, winsMap[u.id] ?? 0, u.isAdmin).isVip,
      })),
      page: current,
      totalPages: Math.max(1, Math.ceil(total / take)),
      total,
    });
  });

  app.get("/api/players/search", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 2) return reply.send({ players: [] });
    const users = await db.user.findMany({
      where: {
        username: { contains: q.trim(), mode: "insensitive" },
        isBot: false,
        accountStatus: { in: ["ACTIVE", "WATCHED"] },
      },
      select: { id: true, username: true, region: true, createdAt: true, avatarUrl: true, vipGrantedAt: true, isAdmin: true, clanMembership: { include: { clan: { select: { name: true, tag: true, bannerColor: true, emblemKey: true } } } } },
      take: 20,
      orderBy: { username: "asc" },
    });
    const online = new Set(getOnlineUserIds());
    const vip = await batchVipStatus(users);
    return reply.send({
      players: users.map((u: any) => ({
        id: u.id, username: u.username, region: u.region, avatarUrl: u.avatarUrl ?? null,
        online: online.has(u.id),
        isVip: vip.get(u.id) ?? false,
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
      select: {
        id: true, username: true, region: true, avatarUrl: true, vipGrantedAt: true, isAdmin: true,
        stats: { select: { totalGames: true } },
        clanMembership: { include: { clan: { select: { name: true, tag: true, bannerColor: true, emblemKey: true } } } },
      },
      take: 50,
    });
    // Wins = duels gagnés; winningsCoins = somme des gains validés.
    // Bug réel du 31/08 (retour Paul, capture "V 4 D 0 P 0") : "défaites"
    // et "parties" étaient calculées en mélangeant les stats du Solo
    // (u.stats.totalGames) avec les victoires de Duel (wins) — deux jeux
    // différents. Un joueur qui n'a jamais fait de Solo affichait donc
    // toujours 0 défaite et 0 partie, quel que soit son historique réel de
    // duels. Recalculé à partir des vrais DuelMatch joués.
    const userIds = users.map((u: any) => u.id);
    const [winsAgg, playedAAgg, playedBAgg, winningsAgg, vip] = await Promise.all([
      db.duelMatch.groupBy({
        by: ["winnerId"],
        where: { winnerId: { in: userIds }, status: "COMPLETED" },
        _count: { winnerId: true },
      }),
      db.duelMatch.groupBy({
        by: ["playerAId"],
        where: { playerAId: { in: userIds }, status: "COMPLETED" },
        _count: { playerAId: true },
      }),
      db.duelMatch.groupBy({
        by: ["playerBId"],
        where: { playerBId: { in: userIds }, status: "COMPLETED" },
        _count: { playerBId: true },
      }),
      db.transaction.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, type: "PAYOUT", status: "COMPLETED" },
        _sum: { amountCoins: true },
      }),
      batchVipStatus(users),
    ]);
    const winsMap = Object.fromEntries(winsAgg.map((r: any) => [r.winnerId, r._count.winnerId]));
    const winMap  = Object.fromEntries(winningsAgg.map((r: any) => [r.userId, r._sum.amountCoins ?? 0]));
    const playedMap: Record<string, number> = {};
    for (const r of playedAAgg as any[]) playedMap[r.playerAId] = (playedMap[r.playerAId] ?? 0) + r._count.playerAId;
    for (const r of playedBAgg as any[]) playedMap[r.playerBId] = (playedMap[r.playerBId] ?? 0) + r._count.playerBId;
    return reply.send({
      online: users.map((u: any) => {
        const duelsWon = winsMap[u.id] ?? 0;
        const duelsPlayed = playedMap[u.id] ?? 0;
        return {
          id: u.id, username: u.username, region: u.region, avatarUrl: u.avatarUrl ?? null,
          isVip: vip.get(u.id) ?? false,
          clan: u.clanMembership?.clan ?? null,
          totalGames: u.stats?.totalGames ?? 0, // Solo uniquement — conservé pour compat, ne plus utiliser pour les défaites de duel
          wins: duelsWon,
          duelsPlayed,
          duelsLost: Math.max(0, duelsPlayed - duelsWon),
          winningsCoins: winMap[u.id] ?? 0,
        };
      }),
    });
  });

  // ── Profil public d'un joueur ─────────────────────────────────────
  app.get("/api/players/profile/:username", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { username } = req.params as { username: string };
    // Pagination des duels récents (31/08, retour Paul : "pagine ici avec
    // les boutons de navigation car on doit voir tous les duels de
    // l'utilisateur") — avant, seuls les 5 plus récents étaient jamais
    // accessibles, sans aucun moyen de remonter plus loin.
    const { page = "1", perPage = "5" } = req.query as { page?: string; perPage?: string };
    const duelsPage = Math.max(1, parseInt(page) || 1);
    const duelsPerPage = Math.min(50, Math.max(1, parseInt(perPage) || 5));
    const user = await db.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, isBot: false },
      select: {
        id: true, username: true, region: true, createdAt: true, avatarUrl: true,
        vipGrantedAt: true, isAdmin: true,
        accountStatus: true,
        stats: true,
        clanMembership: { include: { clan: true } },
      },
    });
    if (!user) return reply.notFound("Joueur introuvable");

    const online = new Set(getOnlineUserIds());
    const isVip = (await batchVipStatus([user])).get(user.id) ?? false;

    // Totaux financiers
    const [winnings, duelsWon, duelsPlayed] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: user.id, type: "PAYOUT", status: "COMPLETED" },
        _sum: { amountCoins: true },
      }),
      prisma.duelMatch.count({ where: { winnerId: user.id, status: "COMPLETED" } }),
      prisma.duelMatch.count({ where: { OR: [{ playerAId: user.id }, { playerBId: user.id }], status: "COMPLETED" } }),
    ]);

    // Derniers duels, paginés (public : pas de mise ni de gains cachés,
    // juste le résultat — la mise reste affichée, ce n'est pas un secret).
    const recentDuels = await prisma.duelMatch.findMany({
      where: { OR: [{ playerAId: user.id }, { playerBId: user.id }], status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      skip: (duelsPage - 1) * duelsPerPage,
      take: duelsPerPage,
      select: {
        id: true, scoreA: true, scoreB: true, winnerId: true, completedAt: true, stakeCoins: true,
        playerA: { select: { id: true, username: true, avatarUrl: true } },
        playerB: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    return reply.send({
      id: user.id,
      username: user.username,
      region: user.region,
      avatarUrl: user.avatarUrl ?? null,
      isVip,
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
        playerAAvatarUrl: d.playerA.avatarUrl ?? null,
        playerBAvatarUrl: d.playerB.avatarUrl ?? null,
        scoreA: d.scoreA,
        scoreB: d.scoreB,
        winnerId: d.winnerId,
        completedAt: d.completedAt,
        stakeCoins: d.stakeCoins,
      })),
      duelsPage,
      duelsTotalPages: Math.max(1, Math.ceil(duelsPlayed / duelsPerPage)),
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
