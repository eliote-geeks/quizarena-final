import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { randomUUID } from "crypto";
import { getOnlineUserIds } from "../duel/engine.js";
import { getBalance } from "../wallet/ledger.js";

/** Modèle Clan/ClanMember — accès via prisma as any car Prisma Client est
 * régénéré séparément du build TypeScript (npx prisma generate). Le type
 * est correct à l'exécution, seul le compilateur TS ne le voit pas encore. */
const db = prisma as any;
const JOIN_POLICIES = ["OPEN", "APPROVAL", "CLOSED"] as const;
const INVITE_TTL_MS = 7 * 24 * 60 * 60_000;
const MAX_CLAN_MEMBERS = 20;
const CLAN_EMBLEMS = ["shogun", "kitsune", "ronin", "sakura", "titan", "neon", "dragon", "celestial"] as const;

function admissionLabel(policy: string) {
  return policy === "OPEN" ? "Ouvert" : policy === "APPROVAL" ? "Sur candidature" : "Fermé";
}

async function assertEligibleForClan(userId: string, clan: any) {
  const [user, balance, memberCount] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, include: { stats: { select: { totalGames: true } } } }),
    getBalance(userId),
    db.clanMember.count({ where: { clanId: clan.id } }),
  ]);
  if (!user) throw new Error("Compte introuvable");
  if (memberCount >= clan.maxMembers) throw new Error("Ce clan a atteint sa capacité maximale");
  if (balance < clan.minimumCoins) throw new Error(`Il faut au moins ${clan.minimumCoins.toLocaleString("fr-FR")} F de solde pour rejoindre ce clan`);
  if ((user.stats?.totalGames ?? 0) < clan.minimumGames) throw new Error(`Il faut avoir terminé au moins ${clan.minimumGames} parties pour rejoindre ce clan`);
}

async function clanCapacityReached(clanId: string) {
  const [clan, count] = await Promise.all([
    db.clan.findUnique({ where: { id: clanId }, select: { maxMembers: true } }),
    db.clanMember.count({ where: { clanId } }),
  ]);
  return Boolean(clan && count >= Math.min(clan.maxMembers, MAX_CLAN_MEMBERS));
}

export async function clanRoutes(app: FastifyInstance) {
  // ── Liste des clans (classement par membres, puis par date) ──────
  app.get("/api/clans", { preHandler: [app.authenticate] }, async (req, reply) => {
    const query = req.query as { page?: string; perPage?: string };
    const page = Math.max(1, Number(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(query.perPage) || 12));
    const [clans, total] = await Promise.all([db.clan.findMany({
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }), db.clan.count()]);

    // Clan du demandeur
    const myMembership = await db.clanMember.findUnique({
      where: { userId: req.user.userId },
      include: { clan: true },
    });

    const online = new Set(getOnlineUserIds());

    return reply.send({
      clans: clans.map((c: any) => ({
        id: c.id,
        name: c.name,
        tag: c.tag,
        description: c.description,
        bannerColor: c.bannerColor,
        emblemKey: c.emblemKey,
        joinPolicy: c.joinPolicy,
        joinPolicyLabel: admissionLabel(c.joinPolicy),
        minimumCoins: c.minimumCoins,
        minimumGames: c.minimumGames,
        maxMembers: c.maxMembers,
        leaderId: c.leaderId,
        memberCount: c._count.members,
        createdAt: c.createdAt,
      })),
      myClan: myMembership ? {
        clan: myMembership.clan,
        role: myMembership.role,
      } : null,
      pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
    });
  });

  // ── Classement officiel — gains réels du ledger, jamais une valeur client ──
  app.get("/api/clans/ranking", { preHandler: [app.authenticate] }, async (_req, reply) => {
    const clans = await db.clan.findMany({ include: { members: { select: { userId: true } }, _count: { select: { members: true } } } });
    const userIds = clans.flatMap((clan: any) => clan.members.map((member: any) => member.userId));
    const payouts = userIds.length ? await prisma.transaction.groupBy({
      by: ["userId"], where: { userId: { in: userIds }, type: "PAYOUT", status: "COMPLETED" }, _sum: { amountCoins: true },
    }) : [];
    const payoutByUser = new Map(payouts.map((item) => [item.userId, item._sum.amountCoins ?? 0]));
    const ranked = clans.map((clan: any) => ({
      id: clan.id, name: clan.name, tag: clan.tag, bannerColor: clan.bannerColor, emblemKey: clan.emblemKey,
      memberCount: clan._count.members,
      winningsCoins: clan.members.reduce((sum: number, member: any) => sum + (payoutByUser.get(member.userId) ?? 0), 0),
      warWins: clan.warWins, warLosses: clan.warLosses, warDraws: clan.warDraws, warEarnings: clan.warEarnings,
    })).sort((a: any, b: any) => b.winningsCoins - a.winningsCoins || b.warWins - a.warWins || a.name.localeCompare(b.name));
    return reply.send({ clans: ranked.map((clan: any, index: number) => ({ ...clan, rank: index + 1, certified: index < 3 })) });
  });

  // ── Profil d'un clan ─────────────────────────────────────────────
  app.get("/api/clans/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const clan = await db.clan.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, region: true, stats: { select: { totalGames: true, winRateGlobal: true } } },
            },
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        },
      },
    });
    if (!clan) return reply.notFound("Clan introuvable");

    const online = new Set(getOnlineUserIds());

    // Gains cumulés de tous les membres
    const memberIds = clan.members.map((m: any) => m.userId);
    const winAgg = await prisma.transaction.groupBy({
      by: ["userId"],
      where: { userId: { in: memberIds }, type: "PAYOUT", status: "COMPLETED" },
      _sum: { amountCoins: true },
    });
    const winById = new Map(winAgg.map((r: any) => [r.userId, r._sum.amountCoins ?? 0]));
    const totalWinnings = winAgg.reduce((s: number, r: any) => s + (r._sum.amountCoins ?? 0), 0);

    const myMembership = await db.clanMember.findUnique({ where: { userId: req.user.userId } });

    return reply.send({
      id: clan.id,
      name: clan.name,
      tag: clan.tag,
      description: clan.description,
      bannerColor: clan.bannerColor,
      emblemKey: clan.emblemKey,
      joinPolicy: clan.joinPolicy,
      joinPolicyLabel: admissionLabel(clan.joinPolicy),
      minimumCoins: clan.minimumCoins,
      minimumGames: clan.minimumGames,
      maxMembers: clan.maxMembers,
      warWins: clan.warWins,
      warLosses: clan.warLosses,
      warDraws: clan.warDraws,
      warEarnings: clan.warEarnings,
      leaderId: clan.leaderId,
      totalWinnings,
      createdAt: clan.createdAt,
      members: clan.members.map((m: any) => ({
        userId: m.userId,
        username: m.user.username,
        region: m.user.region,
        role: m.role,
        joinedAt: m.joinedAt,
        online: online.has(m.userId),
        totalGames: m.user.stats?.totalGames ?? 0,
        winRate: m.user.stats?.winRateGlobal ?? 0,
        winnings: winById.get(m.userId) ?? 0,
      })),
      myRole: clan.members.find((m: any) => m.userId === req.user.userId)?.role ?? null,
      isMember: myMembership?.clanId === clan.id,
    });
  });

  // ── Modifier l'identité (chef uniquement) ───────────────────────
  app.patch("/api/clans/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { name, description, bannerColor, emblemKey } = req.body as { name?: string; description?: string; bannerColor?: string; emblemKey?: string };
    const clan = await db.clan.findUnique({ where: { id } });
    if (!clan || clan.leaderId !== req.user.userId) return reply.forbidden("Réservé au chef du clan");
    const data: Record<string, unknown> = {};
    if (name !== undefined) { if (name.trim().length < 2 || name.trim().length > 30) return reply.badRequest("Nom invalide"); data.name = name.trim(); }
    if (description !== undefined) { if (description.length > 100) return reply.badRequest("Description trop longue"); data.description = description.trim() || null; }
    if (bannerColor !== undefined) { if (!/^#[0-9a-fA-F]{6}$/.test(bannerColor)) return reply.badRequest("Couleur invalide"); data.bannerColor = bannerColor; }
    if (emblemKey !== undefined) { if (!CLAN_EMBLEMS.includes(emblemKey as any)) return reply.badRequest("Emblème invalide"); data.emblemKey = emblemKey; }
    return reply.send({ clan: await db.clan.update({ where: { id }, data }) });
  });

  // ── Dissoudre le clan (chef uniquement) ──────────────────────────
  app.delete("/api/clans/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const clan = await db.clan.findUnique({ where: { id } });
    if (!clan || clan.leaderId !== req.user.userId) return reply.forbidden("Réservé au chef du clan");
    await db.clan.delete({ where: { id } });
    return reply.send({ ok: true, dissolved: true });
  });

  // ── Créer un clan ─────────────────────────────────────────────────
  app.post("/api/clans", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { name, tag, description, bannerColor, emblemKey = "shogun", joinPolicy = "OPEN", minimumCoins = 0, minimumGames = 0, maxMembers = MAX_CLAN_MEMBERS } = req.body as {
      name: string; tag: string; description?: string; bannerColor?: string;
      emblemKey?: string; joinPolicy?: string; minimumCoins?: number; minimumGames?: number; maxMembers?: number;
    };

    if (!name?.trim() || name.trim().length < 2) return reply.badRequest("Nom trop court (min 2 caractères)");
    if (!tag?.trim() || tag.trim().length < 2 || tag.trim().length > 5)
      return reply.badRequest("Tag doit faire 2 à 5 caractères");

    const cleanTag = tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleanTag.length < 2) return reply.badRequest("Tag invalide — lettres et chiffres uniquement");
    if (!JOIN_POLICIES.includes(joinPolicy as any)) return reply.badRequest("Mode d'admission invalide");
    if (!CLAN_EMBLEMS.includes(emblemKey as any)) return reply.badRequest("Emblème invalide");
    if (!Number.isInteger(minimumCoins) || minimumCoins < 0 || minimumCoins > 1_000_000) return reply.badRequest("Solde minimum invalide");
    if (!Number.isInteger(minimumGames) || minimumGames < 0 || minimumGames > 100_000) return reply.badRequest("Nombre de parties minimum invalide");
    if (!Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > MAX_CLAN_MEMBERS) return reply.badRequest("Capacité invalide (2 à 20 membres)");

    // Vérifier que le joueur n'est pas déjà dans un clan
    const existing = await db.clanMember.findUnique({ where: { userId: req.user.userId } });
    if (existing) return reply.badRequest("Tu es déjà membre d'un clan. Quitte-le avant d'en créer un.");

    // Créer le clan + l'adhésion leader
    const clanId = randomUUID();
    const clan = await db.$transaction(async (tx: any) => {
      const created = await tx.clan.create({
        data: {
          id: clanId,
          name: name.trim(),
          tag: cleanTag,
          description: description?.trim() || null,
          bannerColor: bannerColor || "#f59e0b",
          emblemKey,
          leaderId: req.user.userId,
          joinPolicy,
          minimumCoins,
          minimumGames,
          maxMembers,
        },
      });
      await tx.clanMember.create({
        data: { userId: req.user.userId, clanId, role: "leader" },
      });
      return created;
    });

    return reply.code(201).send({ clan });
  });

  // ── Rejoindre un clan ─────────────────────────────────────────────
  app.post("/api/clans/:id/join", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const clan = await db.clan.findUnique({ where: { id } });
    if (!clan) return reply.notFound("Clan introuvable");

    const existing = await db.clanMember.findUnique({ where: { userId: req.user.userId } });
    if (existing) return reply.badRequest("Tu es déjà dans un clan");
    try {
      await assertEligibleForClan(req.user.userId, clan);
    } catch (error: any) {
      return reply.badRequest(error.message);
    }
    if (clan.joinPolicy === "CLOSED") return reply.forbidden("Ce clan est fermé aux nouvelles adhésions");
    if (clan.joinPolicy === "APPROVAL") {
      await db.clanJoinRequest.upsert({
        where: { clanId_userId: { clanId: id, userId: req.user.userId } },
        create: { clanId: id, userId: req.user.userId },
        update: {},
      });
      return reply.code(202).send({ ok: true, pending: true, message: "Candidature envoyée au chef du clan" });
    }

    try {
      await db.clanMember.create({ data: { userId: req.user.userId, clanId: id, role: "member" } });
    } catch (error) {
      if (await clanCapacityReached(id)) return reply.badRequest("Ce clan a atteint sa capacité maximale");
      throw error;
    }
    return reply.send({ ok: true, clanId: id });
  });

  // ── Règles d'admission (chef uniquement) ─────────────────────────
  app.patch("/api/clans/:id/settings", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { joinPolicy, minimumCoins, minimumGames, maxMembers } = req.body as Record<string, unknown>;
    const clan = await db.clan.findUnique({ where: { id } });
    if (!clan || clan.leaderId !== req.user.userId) return reply.forbidden("Réservé au chef du clan");
    const data: Record<string, unknown> = {};
    if (joinPolicy !== undefined) {
      if (typeof joinPolicy !== "string" || !JOIN_POLICIES.includes(joinPolicy as any)) return reply.badRequest("Mode d'admission invalide");
      data.joinPolicy = joinPolicy;
    }
    for (const [key, value, maximum] of [["minimumCoins", minimumCoins, 1_000_000], ["minimumGames", minimumGames, 100_000], ["maxMembers", maxMembers, MAX_CLAN_MEMBERS]] as const) {
      if (value !== undefined) {
        if (typeof value !== "number" || !Number.isInteger(value) || value < (key === "maxMembers" ? 2 : 0) || value > maximum) return reply.badRequest(`${key} invalide`);
        data[key] = value;
      }
    }
    if (typeof data.maxMembers === "number") {
      const currentMembers = await db.clanMember.count({ where: { clanId: id } });
      if (data.maxMembers < currentMembers) return reply.badRequest(`Ce clan compte déjà ${currentMembers} membres`);
    }
    const updated = await db.clan.update({ where: { id }, data });
    return reply.send({ clan: updated });
  });

  // ── Liens d'invitation ───────────────────────────────────────────
  app.get("/api/clans/:id/invites", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const member = await db.clanMember.findUnique({ where: { userId: req.user.userId } });
    if (!member || member.clanId !== id || !["leader", "officer"].includes(member.role)) return reply.forbidden("Réservé au staff du clan");
    const invites = await db.clanInvite.findMany({ where: { clanId: id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
    return reply.send({ invites: invites.map((invite: any) => ({ ...invite, availableUses: Math.max(0, invite.maxUses - invite.uses) })) });
  });

  app.post("/api/clans/:id/invites", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { maxUses = 10 } = req.body as { maxUses?: number };
    const member = await db.clanMember.findUnique({ where: { userId: req.user.userId } });
    if (!member || member.clanId !== id || !["leader", "officer"].includes(member.role)) return reply.forbidden("Réservé au staff du clan");
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 50) return reply.badRequest("Nombre d'utilisations invalide");
    const token = randomUUID().replaceAll("-", "");
    const invite = await db.clanInvite.create({ data: { clanId: id, token, createdBy: req.user.userId, maxUses, expiresAt: new Date(Date.now() + INVITE_TTL_MS) } });
    return reply.code(201).send({ invite: { ...invite, url: `/clan-invite/${token}` } });
  });

  app.delete("/api/clans/:id/invites/:inviteId", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id, inviteId } = req.params as { id: string; inviteId: string };
    const member = await db.clanMember.findUnique({ where: { userId: req.user.userId } });
    if (!member || member.clanId !== id || !["leader", "officer"].includes(member.role)) return reply.forbidden("Réservé au staff du clan");
    await db.clanInvite.deleteMany({ where: { id: inviteId, clanId: id } });
    return reply.send({ ok: true });
  });

  app.post("/api/clan-invites/:token/accept", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { token } = req.params as { token: string };
    const invite = await db.clanInvite.findUnique({ where: { token }, include: { clan: true } });
    if (!invite || invite.expiresAt <= new Date() || invite.uses >= invite.maxUses) return reply.notFound("Lien d'invitation expiré ou invalide");
    if (await db.clanMember.findUnique({ where: { userId: req.user.userId } })) return reply.badRequest("Tu es déjà dans un clan");
    try { await assertEligibleForClan(req.user.userId, invite.clan); } catch (error: any) { return reply.badRequest(error.message); }
    try {
      await db.$transaction([
        db.clanMember.create({ data: { userId: req.user.userId, clanId: invite.clanId, role: "member" } }),
        db.clanInvite.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } }),
      ]);
    } catch (error) {
      if (await clanCapacityReached(invite.clanId)) return reply.badRequest("Ce clan a atteint sa capacité maximale");
      throw error;
    }
    return reply.send({ ok: true, clanId: invite.clanId });
  });

  // ── Candidatures (chef/officiers) ─────────────────────────────────
  app.get("/api/clans/:id/join-requests", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const membership = await db.clanMember.findUnique({ where: { userId: req.user.userId } });
    if (!membership || membership.clanId !== id || !["leader", "officer"].includes(membership.role)) return reply.forbidden("Réservé au staff du clan");
    const requests = await db.clanJoinRequest.findMany({
      where: { clanId: id }, orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, username: true, region: true, stats: { select: { totalGames: true } } } } },
    });
    const enriched = await Promise.all(requests.map(async (request: any) => ({ ...request, balanceCoins: await getBalance(request.userId) })));
    return reply.send({ requests: enriched });
  });

  app.patch("/api/clans/:id/join-requests/:requestId", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id, requestId } = req.params as { id: string; requestId: string };
    const { action } = req.body as { action: "accept" | "reject" };
    if (action !== "accept" && action !== "reject") return reply.badRequest("Action invalide");
    const membership = await db.clanMember.findUnique({ where: { userId: req.user.userId } });
    if (!membership || membership.clanId !== id || !["leader", "officer"].includes(membership.role)) return reply.forbidden("Réservé au staff du clan");
    const request = await db.clanJoinRequest.findFirst({ where: { id: requestId, clanId: id } });
    if (!request) return reply.notFound("Candidature introuvable");
    if (action === "reject") {
      await db.clanJoinRequest.delete({ where: { id: requestId } });
      return reply.send({ ok: true, action });
    }
    const [clan, existing] = await Promise.all([db.clan.findUnique({ where: { id } }), db.clanMember.findUnique({ where: { userId: request.userId } })]);
    if (!clan || existing) return reply.badRequest("Ce joueur appartient déjà à un clan");
    try { await assertEligibleForClan(request.userId, clan); } catch (error: any) { return reply.badRequest(error.message); }
    try {
      await db.$transaction([
        db.clanMember.create({ data: { userId: request.userId, clanId: id, role: "member" } }),
        db.clanJoinRequest.delete({ where: { id: requestId } }),
      ]);
    } catch (error) {
      if (await clanCapacityReached(id)) return reply.badRequest("Ce clan a atteint sa capacité maximale");
      throw error;
    }
    return reply.send({ ok: true, action });
  });

  // ── Quitter un clan ───────────────────────────────────────────────
  app.delete("/api/clans/leave", { preHandler: [app.authenticate] }, async (req, reply) => {
    const membership = await db.clanMember.findUnique({ where: { userId: req.user.userId } });
    if (!membership) return reply.badRequest("Tu n'es pas dans un clan");

    const clan = await db.clan.findUnique({ where: { id: membership.clanId } });
    if (!clan) return reply.notFound("Clan introuvable");

    // Si le leader quitte → transférer ou dissoudre
    if (clan.leaderId === req.user.userId) {
      const otherMembers = await db.clanMember.findMany({
        where: { clanId: clan.id, userId: { not: req.user.userId } },
        orderBy: { joinedAt: "asc" },
        take: 1,
      });

      if (otherMembers.length > 0) {
        // Transférer au membre le plus ancien
        const newLeader = otherMembers[0];
        await Promise.all([
          db.clan.update({ where: { id: clan.id }, data: { leaderId: newLeader.userId } }),
          db.clanMember.update({ where: { userId: newLeader.userId }, data: { role: "leader" } }),
          db.clanMember.delete({ where: { userId: req.user.userId } }),
        ]);
        return reply.send({ ok: true, transferred: true, newLeader: newLeader.userId });
      } else {
        // Dernier membre → dissoudre le clan
        await db.clan.delete({ where: { id: clan.id } }); // CASCADE supprime les membres
        return reply.send({ ok: true, dissolved: true });
      }
    }

    await db.clanMember.delete({ where: { userId: req.user.userId } });
    return reply.send({ ok: true });
  });

  // ── Exclure un membre (leader/officer) ───────────────────────────
  app.delete("/api/clans/:id/kick/:targetUserId", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id, targetUserId } = req.params as { id: string; targetUserId: string };

    const myMembership = await db.clanMember.findUnique({ where: { userId: req.user.userId } });
    if (!myMembership || myMembership.clanId !== id) return reply.forbidden("Tu n'es pas dans ce clan");
    if (!["leader", "officer"].includes(myMembership.role)) return reply.forbidden("Permissions insuffisantes");
    if (targetUserId === req.user.userId) return reply.badRequest("Tu ne peux pas t'expulser toi-même");

    const target = await db.clanMember.findUnique({ where: { userId: targetUserId } });
    if (!target || target.clanId !== id) return reply.notFound("Ce joueur n'est pas dans le clan");
    if (target.role === "leader") return reply.forbidden("Impossible d'expulser le leader");

    await db.clanMember.delete({ where: { userId: targetUserId } });
    return reply.send({ ok: true });
  });

  // ── Promouvoir un membre (leader seulement) ───────────────────────
  app.patch("/api/clans/:id/members/:targetUserId/role", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id, targetUserId } = req.params as { id: string; targetUserId: string };
    const { role } = req.body as { role: "officer" | "member" };

    const clan = await db.clan.findUnique({ where: { id } });
    if (!clan || clan.leaderId !== req.user.userId) return reply.forbidden("Réservé au leader");
    if (!["officer", "member"].includes(role)) return reply.badRequest("Rôle invalide");

    const target = await db.clanMember.findUnique({ where: { userId: targetUserId } });
    if (!target || target.clanId !== id) return reply.notFound("Membre introuvable");

    await db.clanMember.update({ where: { userId: targetUserId }, data: { role } });
    return reply.send({ ok: true });
  });
}
