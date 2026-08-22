import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { credit, getBalance } from "../wallet/ledger.js";
import { resolveClanWarWalkover, sendToUser } from "../duel/engine.js";

const WAR_DURATION_MS = 24 * 60 * 60_000;
const MIN_TEAM_SIZE = 1;
const MAX_TEAM_SIZE = 20;
const MAX_ACTIVE_WARS = 1;
const ACTIVE_STATUSES = ["TEAM_SELECTION", "IN_PROGRESS"] as const;
const PENDING_STATUS = "PENDING" as const;
const MAX_WAR_STAKE = 1_000_000;
const WAR_HOUSE_CUT = 0.10;

function validStake(stakeCoins: number) {
  return Number.isInteger(stakeCoins) && stakeCoins >= 0 && stakeCoins <= MAX_WAR_STAKE;
}

function validTeamSize(teamSize: number) {
  return Number.isInteger(teamSize) && teamSize >= MIN_TEAM_SIZE && teamSize <= MAX_TEAM_SIZE;
}

async function staffClan(userId: string) {
  return prisma.clanMember.findUnique({ where: { userId }, include: { clan: true } });
}

async function winningsByUser(userIds: string[]) {
  const rows = await prisma.transaction.groupBy({ by: ["userId"], where: { userId: { in: userIds }, type: "PAYOUT", status: "COMPLETED" }, _sum: { amountCoins: true } });
  return new Map(rows.map((row) => [row.userId, row._sum.amountCoins ?? 0]));
}

async function activeWarForClan(clanId: string) {
  return prisma.clanWar.findFirst({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      OR: [{ challengerClanId: clanId }, { defenderClanId: clanId }],
    },
    include: { challengerClan: true, defenderClan: true },
  });
}

/** Débite les deux chefs, puis seulement ouvre la sélection des équipes.
 * La mise est exacte et identique des deux côtés. Si le second débit
 * échoue, le premier est remboursé immédiatement et la guerre reste en
 * attente afin que les chefs puissent corriger leur solde ou la refuser. */
async function activateWar(warId: string) {
  const activated = await prisma.$transaction(async (tx) => {
    // Un verrou unique sérialise toutes les acceptations de guerre. Les deux
    // débits et le passage en TEAM_SELECTION font partie du même commit :
    // impossible de débiter un seul chef ou d'ouvrir deux guerres à la fois.
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext('clan-war-activation'))");
    const war = await tx.clanWar.findUniqueOrThrow({ where: { id: warId }, include: { challengerClan: true, defenderClan: true } });
    if (war.status !== PENDING_STATUS) throw new Error("WAR_ALREADY_HANDLED");
    const active = await tx.clanWar.findFirst({
      where: { id: { not: war.id }, status: { in: [...ACTIVE_STATUSES] }, OR: [{ challengerClanId: { in: [war.challengerClanId, war.defenderClanId] } }, { defenderClanId: { in: [war.challengerClanId, war.defenderClanId] } }] },
    });
    if (active) throw new Error("CLAN_ALREADY_ACTIVE");

    let challengerStakeTxId: string | undefined;
    let defenderStakeTxId: string | undefined;
    if (war.stakeCoins > 0) {
      const [challengerBalance, defenderBalance] = await Promise.all([
        tx.transaction.aggregate({ where: { userId: war.challengerClan.leaderId, status: "COMPLETED" }, _sum: { amountCoins: true } }),
        tx.transaction.aggregate({ where: { userId: war.defenderClan.leaderId, status: "COMPLETED" }, _sum: { amountCoins: true } }),
      ]);
      if ((challengerBalance._sum.amountCoins ?? 0) < war.stakeCoins || (defenderBalance._sum.amountCoins ?? 0) < war.stakeCoins) throw new Error("INSUFFICIENT_WAR_BALANCE");
      const challengerTx = await tx.transaction.create({ data: { userId: war.challengerClan.leaderId, type: "STAKE", amountCoins: -war.stakeCoins, status: "COMPLETED", metadata: { kind: "clan_war_stake", clanWarId: war.id, clanId: war.challengerClanId } } });
      const defenderTx = await tx.transaction.create({ data: { userId: war.defenderClan.leaderId, type: "STAKE", amountCoins: -war.stakeCoins, status: "COMPLETED", metadata: { kind: "clan_war_stake", clanWarId: war.id, clanId: war.defenderClanId } } });
      challengerStakeTxId = challengerTx.id;
      defenderStakeTxId = defenderTx.id;
    }
    const now = new Date();
    await tx.clanWar.updateMany({ where: { id: { not: war.id }, status: PENDING_STATUS, OR: [{ challengerClanId: { in: [war.challengerClanId, war.defenderClanId] } }, { defenderClanId: { in: [war.challengerClanId, war.defenderClanId] } }] }, data: { status: "DECLINED", completedAt: now } });
    await tx.clanWarSearch.deleteMany({ where: { clanId: { in: [war.challengerClanId, war.defenderClanId] } } });
    return tx.clanWar.update({ where: { id: war.id }, data: { status: "TEAM_SELECTION", startsAt: now, endsAt: new Date(now.getTime() + WAR_DURATION_MS), challengerStakeTxId, defenderStakeTxId }, include: { challengerClan: true, defenderClan: true } });
  });
  return activated;
}

async function refundWarStakes(war: {
  id: string; stakeCoins: number; challengerStakeTxId: string | null; defenderStakeTxId: string | null;
  challengerClan: { leaderId: string }; defenderClan: { leaderId: string };
}, reason: string) {
  if (!war.stakeCoins) return;
  const tasks = [];
  if (war.challengerStakeTxId) tasks.push(credit({ userId: war.challengerClan.leaderId, type: "REFUND", amountCoins: war.stakeCoins, relatedTransactionId: war.challengerStakeTxId, metadata: { kind: "clan_war_refund", clanWarId: war.id, reason } }));
  if (war.defenderStakeTxId) tasks.push(credit({ userId: war.defenderClan.leaderId, type: "REFUND", amountCoins: war.stakeCoins, relatedTransactionId: war.defenderStakeTxId, metadata: { kind: "clan_war_refund", clanWarId: war.id, reason } }));
  await Promise.all(tasks);
}

async function detail(id: string, userId: string) {
  const [war, viewerMember] = await Promise.all([prisma.clanWar.findUnique({
    where: { id },
    include: { challengerClan: true, defenderClan: true, members: true, matches: { orderBy: { id: "asc" } } },
  }), staffClan(userId)]);
  if (!war) return null;
  const ids = [...new Set([...war.members.map((m) => m.userId), ...war.matches.flatMap((m) => [m.playerAId, m.playerBId])])];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
  const names = new Map(users.map((u) => [u.id, u.username]));
  return {
    ...war,
    myClanId: viewerMember?.clanId ?? null,
    myRole: viewerMember?.role ?? null,
    isClanWar: true,
    returnPath: `/clan-wars/${war.id}`,
    myClanResult: !viewerMember || war.status !== "COMPLETED"
      ? null
      : war.winnerClanId === null
        ? "draw"
        : war.winnerClanId === viewerMember.clanId ? "win" : "loss",
    members: war.members.map((m) => ({ ...m, username: names.get(m.userId) ?? "?" })),
    matches: war.matches.map((m) => ({ ...m, playerAUsername: names.get(m.playerAId) ?? "?", playerBUsername: names.get(m.playerBId) ?? "?", mine: m.playerAId === userId || m.playerBId === userId })),
    myNextMatchId: war.matches.find((m) => (m.playerAId === userId || m.playerBId === userId) && (m.status === "READY" || m.status === "IN_PROGRESS"))?.id ?? null,
  };
}

async function maybeCreateMatches(warId: string) {
  const war = await prisma.clanWar.findUniqueOrThrow({ where: { id: warId }, include: { members: true, matches: true } });
  if (war.matches.length || war.status !== "TEAM_SELECTION") return;
  const a = war.members.filter((m) => m.clanId === war.challengerClanId);
  const b = war.members.filter((m) => m.clanId === war.defenderClanId);
  if (a.length !== war.teamSize || b.length !== war.teamSize) return;
  const gains = await winningsByUser([...a, ...b].map((m) => m.userId));
  a.sort((x, y) => (gains.get(y.userId) ?? 0) - (gains.get(x.userId) ?? 0));
  b.sort((x, y) => (gains.get(y.userId) ?? 0) - (gains.get(x.userId) ?? 0));
  await prisma.$transaction([
    ...a.map((member, index) => prisma.clanWarMatch.create({ data: { warId, playerAId: member.userId, playerBId: b[index]!.userId } })),
    prisma.clanWar.update({ where: { id: warId }, data: { status: "IN_PROGRESS" } }),
  ]);
}

export async function finalizeClanWarMatch(matchId: string, winnerId: string | null) {
  const current = await prisma.clanWarMatch.findUnique({ where: { id: matchId } });
  if (!current || current.status === "COMPLETED" || current.status === "FORFEIT") return;
  await prisma.clanWarMatch.update({ where: { id: matchId }, data: { winnerId, status: winnerId ? "COMPLETED" : "FORFEIT", completedAt: new Date() } });
  const war = await prisma.clanWar.findUniqueOrThrow({ where: { id: current.warId }, include: { members: true, matches: true, challengerClan: true, defenderClan: true } });
  if (war.matches.some((m) => m.status !== "COMPLETED" && m.status !== "FORFEIT")) return;
  const clanOf = new Map(war.members.map((m) => [m.userId, m.clanId]));
  let challengerScore = 0; let defenderScore = 0;
  for (const match of war.matches) {
    const clanId = match.winnerId ? clanOf.get(match.winnerId) : null;
    if (clanId === war.challengerClanId) challengerScore += 1;
    if (clanId === war.defenderClanId) defenderScore += 1;
  }
  const winnerClanId = challengerScore === defenderScore ? null : challengerScore > defenderScore ? war.challengerClanId : war.defenderClanId;
  const payoutCoins = war.stakeCoins > 0 && winnerClanId ? Math.round(war.stakeCoins * 2 * (1 - WAR_HOUSE_CUT)) : 0;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext('clan-war-payout'))");
    const fresh = await tx.clanWar.findUniqueOrThrow({ where: { id: war.id } });
    if (fresh.status !== "IN_PROGRESS") return;

    if (!winnerClanId) {
      const drawRefund = Math.round(war.stakeCoins * 0.95);
      if (drawRefund > 0) {
        await tx.transaction.create({ data: { userId: war.challengerClan.leaderId, type: "PAYOUT", amountCoins: drawRefund, status: "COMPLETED", relatedTransactionId: war.challengerStakeTxId ?? undefined, metadata: { kind: "clan_war_draw", clanWarId: war.id } } });
        await tx.transaction.create({ data: { userId: war.defenderClan.leaderId, type: "PAYOUT", amountCoins: drawRefund, status: "COMPLETED", relatedTransactionId: war.defenderStakeTxId ?? undefined, metadata: { kind: "clan_war_draw", clanWarId: war.id } } });
      }
      await tx.clan.update({ where: { id: war.challengerClanId }, data: { warDraws: { increment: 1 } } });
      await tx.clan.update({ where: { id: war.defenderClanId }, data: { warDraws: { increment: 1 } } });
    } else {
      const loserClanId = winnerClanId === war.challengerClanId ? war.defenderClanId : war.challengerClanId;
      const winners = war.members.filter((member) => member.clanId === winnerClanId);
      const baseShare = winners.length ? Math.floor(payoutCoins / winners.length) : 0;
      let remainder = winners.length ? payoutCoins % winners.length : 0;
      for (const winner of winners) {
        const share = baseShare + (remainder-- > 0 ? 1 : 0);
        if (share > 0) await tx.transaction.create({ data: { userId: winner.userId, type: "PAYOUT", amountCoins: share, status: "COMPLETED", metadata: { kind: "clan_war_win", clanWarId: war.id, clanId: winnerClanId, teamSize: war.teamSize } } });
      }
      await tx.clan.update({ where: { id: winnerClanId }, data: { warWins: { increment: 1 }, warEarnings: { increment: payoutCoins } } });
      await tx.clan.update({ where: { id: loserClanId }, data: { warLosses: { increment: 1 } } });
    }
    await tx.clanWar.update({ where: { id: war.id }, data: { status: "COMPLETED", challengerScore, defenderScore, winnerClanId, payoutCoins, payoutDistributedAt: new Date(), completedAt: new Date() } });
  });
}

export async function sweepExpiredClanWars() {
  const now = new Date();
  await prisma.clanWar.updateMany({ where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - WAR_DURATION_MS) } }, data: { status: "EXPIRED", completedAt: now } });
  const expired = await prisma.clanWar.findMany({ where: { status: { in: ["TEAM_SELECTION", "IN_PROGRESS"] }, endsAt: { lte: now } }, include: { matches: true, challengerClan: true, defenderClan: true } });
  for (const war of expired) {
    if (war.status === "TEAM_SELECTION") {
      const claimed = await prisma.clanWar.updateMany({ where: { id: war.id, status: "TEAM_SELECTION" }, data: { status: "EXPIRED", completedAt: now } });
      if (claimed.count) await refundWarStakes(war, "team_selection_expired");
    }
    else for (const match of war.matches.filter((m) => m.status === "READY" || m.status === "IN_PROGRESS")) await resolveClanWarWalkover(match.id);
  }
}

export async function clanWarRoutes(app: FastifyInstance) {
  app.get("/api/clan-wars", { preHandler: [app.authenticate] }, async (req, reply) => {
    await sweepExpiredClanWars();
    const member = await staffClan(req.user.userId);
    if (!member) return reply.send({ wars: [], clan: null });
    const rawQuery = req.query as { page?: string; perPage?: string };
    const page = Math.max(1, Number.parseInt(rawQuery.page ?? "1", 10) || 1);
    const perPage = Math.min(12, Math.max(4, Number.parseInt(rawQuery.perPage ?? "6", 10) || 6));
    const clanWarWhere = { OR: [{ challengerClanId: member.clanId }, { defenderClanId: member.clanId }] };
    let [search, clanMemberCount, activeWar, pendingWars, history, historyTotal, openRequests] = await Promise.all([
      prisma.clanWarSearch.findUnique({ where: { clanId: member.clanId } }),
      prisma.clanMember.count({ where: { clanId: member.clanId } }),
      prisma.clanWar.findFirst({ where: { ...clanWarWhere, status: { in: [...ACTIVE_STATUSES] } }, include: { challengerClan: true, defenderClan: true }, orderBy: { startsAt: "desc" } }),
      prisma.clanWar.findMany({ where: { ...clanWarWhere, status: PENDING_STATUS }, include: { challengerClan: true, defenderClan: true }, orderBy: { createdAt: "desc" } }),
      prisma.clanWar.findMany({ where: { ...clanWarWhere, status: { in: ["COMPLETED", "DECLINED", "EXPIRED"] } }, include: { challengerClan: true, defenderClan: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage }),
      prisma.clanWar.count({ where: { ...clanWarWhere, status: { in: ["COMPLETED", "DECLINED", "EXPIRED"] } } }),
      prisma.clanWarSearch.findMany({
        where: { clanId: { not: member.clanId } },
        include: { clan: { include: { _count: { select: { members: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 24,
      }),
    ]);
    // Une recherche peut devenir impossible si un membre quitte le clan.
    // On la retire au lieu de laisser le chef bloqué indéfiniment sur un
    // ancien format (ex. recherche 2v2 alors que le clan n'a plus qu'un membre).
    if (search && search.teamSize > clanMemberCount) {
      await prisma.clanWarSearch.delete({ where: { clanId: member.clanId } });
      search = null;
    }
    // Une offre dont le clan vient d'entrer en guerre ne doit plus être
    // proposée. La vérification est répétée à l'acceptation côté serveur.
    const openClanIds = openRequests.map((request) => request.clanId);
    const busy = openClanIds.length ? await prisma.clanWar.findMany({
      where: { status: { in: [...ACTIVE_STATUSES] }, OR: [{ challengerClanId: { in: openClanIds } }, { defenderClanId: { in: openClanIds } }] },
      select: { challengerClanId: true, defenderClanId: true },
    }) : [];
    const busyIds = new Set(busy.flatMap((war) => [war.challengerClanId, war.defenderClanId]));
    const availableRequests = openRequests.filter((request) => request.clan._count.members >= request.teamSize && !busyIds.has(request.clanId));
    const wars = [...pendingWars, ...(activeWar ? [activeWar] : []), ...history];
    return reply.send({
      wars,
      activeWar,
      incomingChallenges: pendingWars.filter((war) => war.defenderClanId === member.clanId),
      outgoingChallenges: pendingWars.filter((war) => war.challengerClanId === member.clanId),
      history,
      historyPage: page,
      historyPages: Math.max(1, Math.ceil(historyTotal / perPage)),
      historyTotal,
      openRequests: availableRequests,
      clan: member.clan,
      clanMemberCount,
      myRole: member.role,
      search,
      maxActiveWars: MAX_ACTIVE_WARS,
    });
  });

  app.post("/api/clan-wars/search", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { teamSize, stakeCoins = 0 } = req.body as { teamSize: number; stakeCoins?: number };
    const member = await staffClan(req.user.userId);
    if (!member || member.role !== "leader") return reply.forbidden("Seul le chef peut lancer une recherche");
    if (!validTeamSize(teamSize)) return reply.badRequest("Choisis entre 1 et 20 combattants");
    if (!validStake(stakeCoins)) return reply.badRequest("Mise de guerre invalide");
    const ownCount = await prisma.clanMember.count({ where: { clanId: member.clanId } });
    if (ownCount < teamSize) return reply.badRequest(`Ton clan doit compter au moins ${teamSize} membres`);
    if (await activeWarForClan(member.clanId)) return reply.badRequest("Ton clan a déjà une guerre en cours");
    if (stakeCoins > 0 && await getBalance(member.clan.leaderId) < stakeCoins) return reply.badRequest("Solde insuffisant pour garantir cette mise de clan");

    const result = await prisma.$transaction(async (tx) => {
      // Verrou global très court : deux recherches simultanées ne peuvent pas
      // sélectionner le même clan en attente.
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext('clan-war-matchmaking'))");
      const activeWars = await tx.clanWar.findMany({
        where: { status: { in: [...ACTIVE_STATUSES] } },
        select: { challengerClanId: true, defenderClanId: true },
      });
      const activeIds = new Set(activeWars.flatMap((war) => [war.challengerClanId, war.defenderClanId]));
      if (activeIds.has(member.clanId)) throw new Error("MAX_ACTIVE_WARS");

      const queued = await tx.clanWarSearch.findMany({
        where: { teamSize, stakeCoins, clanId: { not: member.clanId } },
        include: { clan: { include: { _count: { select: { members: true } } } } },
      });
      const compatible = queued.filter((candidate) => {
        if (candidate.clan._count.members < teamSize || activeIds.has(candidate.clanId)) return false;
        return true;
      });
      const opponent = compatible.length ? compatible[Math.floor(Math.random() * compatible.length)]! : null;
      if (!opponent) {
        const search = await tx.clanWarSearch.upsert({
          where: { clanId: member.clanId },
          update: { teamSize, stakeCoins, requestedById: req.user.userId, createdAt: new Date() },
          create: { clanId: member.clanId, requestedById: req.user.userId, teamSize, stakeCoins },
        });
        return { matched: false as const, search };
      }

      await tx.clanWarSearch.deleteMany({ where: { clanId: { in: [member.clanId, opponent.clanId] } } });
      const war = await tx.clanWar.create({
        data: {
          challengerClanId: opponent.clanId,
          defenderClanId: member.clanId,
          createdById: opponent.requestedById,
          teamSize,
          stakeCoins,
          status: PENDING_STATUS,
        },
      });
      return { matched: true as const, warId: war.id };
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === "MAX_ACTIVE_WARS") return null;
      throw error;
    });

    if (!result) return reply.badRequest("Ton clan a déjà une guerre en cours");
    if (!result.matched) return reply.code(202).send(result);
    try {
      const activated = await activateWar(result.warId);
      sendToUser(activated.challengerClan.leaderId, { type: "clan_war_accepted", warId: activated.id, opponentClanName: activated.defenderClan.name, stakeCoins: activated.stakeCoins });
      sendToUser(activated.defenderClan.leaderId, { type: "clan_war_accepted", warId: activated.id, opponentClanName: activated.challengerClan.name, stakeCoins: activated.stakeCoins });
      return reply.code(201).send({ matched: true, war: await detail(result.warId, req.user.userId) });
    } catch (error) {
      await prisma.clanWar.updateMany({ where: { id: result.warId, status: PENDING_STATUS }, data: { status: "DECLINED", completedAt: new Date() } });
      if (error instanceof Error && error.message === "INSUFFICIENT_WAR_BALANCE") return reply.badRequest("Un des deux chefs n'a plus le solde nécessaire pour cette mise");
      throw error;
    }
  });

  app.delete("/api/clan-wars/search", { preHandler: [app.authenticate] }, async (req, reply) => {
    const member = await staffClan(req.user.userId);
    if (!member || member.role !== "leader") return reply.forbidden("Seul le chef peut annuler la recherche");
    await prisma.clanWarSearch.deleteMany({ where: { clanId: member.clanId } });
    return reply.send({ ok: true });
  });

  // Accepter une offre visible dans « demandes de guerre ». Le format et la
  // mise sont ceux publiés : aucun montant implicite ou différent en face.
  app.post("/api/clan-wars/search/:clanId/accept", { preHandler: [app.authenticate] }, async (req, reply) => {
    const targetClanId = (req.params as { clanId: string }).clanId;
    const member = await staffClan(req.user.userId);
    if (!member || member.role !== "leader") return reply.forbidden("Seul le chef peut accepter une guerre");
    if (member.clanId === targetClanId) return reply.badRequest("Impossible d'accepter sa propre demande");
    if (await activeWarForClan(member.clanId)) return reply.badRequest("Ton clan a déjà une guerre en cours");
    const offer = await prisma.clanWarSearch.findUnique({ where: { clanId: targetClanId }, include: { clan: { include: { _count: { select: { members: true } } } } } });
    if (!offer) return reply.notFound("Cette demande n'est plus disponible");
    if (await activeWarForClan(targetClanId)) return reply.badRequest("Ce clan vient d'entrer en guerre");
    const ownCount = await prisma.clanMember.count({ where: { clanId: member.clanId } });
    if (ownCount < offer.teamSize || offer.clan._count.members < offer.teamSize) return reply.badRequest("Les deux clans n'ont plus assez de combattants");

    const war = await prisma.clanWar.create({
      data: { challengerClanId: targetClanId, defenderClanId: member.clanId, createdById: offer.requestedById, teamSize: offer.teamSize, stakeCoins: offer.stakeCoins },
    });
    try {
      const activated = await activateWar(war.id);
      sendToUser(activated.challengerClan.leaderId, { type: "clan_war_accepted", warId: activated.id, opponentClanName: activated.defenderClan.name, stakeCoins: activated.stakeCoins });
      sendToUser(activated.defenderClan.leaderId, { type: "clan_war_accepted", warId: activated.id, opponentClanName: activated.challengerClan.name, stakeCoins: activated.stakeCoins });
      return reply.code(201).send({ war: await detail(war.id, req.user.userId) });
    } catch (error) {
      await prisma.clanWar.updateMany({ where: { id: war.id, status: PENDING_STATUS }, data: { status: "DECLINED", completedAt: new Date() } });
      if (error instanceof Error && error.message === "INSUFFICIENT_WAR_BALANCE") return reply.badRequest("Un des deux chefs n'a plus le solde nécessaire pour cette mise");
      if (error instanceof Error && error.message === "CLAN_ALREADY_ACTIVE") return reply.badRequest("Un des clans vient d'entrer dans une autre guerre");
      throw error;
    }
  });

  app.get("/api/clan-wars/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    await sweepExpiredClanWars(); const result = await detail((req.params as any).id, req.user.userId);
    return result ? reply.send(result) : reply.notFound("Guerre introuvable");
  });

  app.post("/api/clan-wars", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { defenderClanId, teamSize, stakeCoins = 0 } = req.body as { defenderClanId: string; teamSize: number; stakeCoins?: number };
    const member = await staffClan(req.user.userId);
    if (!member || member.role !== "leader") return reply.forbidden("Seul le chef peut lancer une guerre");
    if (!validTeamSize(teamSize)) return reply.badRequest("Choisis entre 1 et 20 combattants");
    if (!validStake(stakeCoins)) return reply.badRequest("Mise de guerre invalide");
    if (defenderClanId === member.clanId) return reply.badRequest("Impossible de défier son propre clan");
    const defender = await prisma.clan.findUnique({ where: { id: defenderClanId }, include: { _count: { select: { members: true } } } });
    const ownCount = await prisma.clanMember.count({ where: { clanId: member.clanId } });
    if (!defender) return reply.notFound("Clan adverse introuvable");
    if (ownCount < teamSize || defender._count.members < teamSize) return reply.badRequest("Les deux clans doivent avoir assez de membres");
    const active = await prisma.clanWar.findFirst({ where: { status: { in: [...ACTIVE_STATUSES] }, OR: [{ challengerClanId: member.clanId }, { defenderClanId: member.clanId }, { challengerClanId: defenderClanId }, { defenderClanId }] } });
    if (active) return reply.badRequest("Un des clans a déjà une guerre active");
    if (stakeCoins > 0 && await getBalance(member.clan.leaderId) < stakeCoins) return reply.badRequest("Solde insuffisant pour garantir cette mise de clan");
    const existingPending = await prisma.clanWar.findFirst({ where: { status: PENDING_STATUS, challengerClanId: member.clanId } });
    if (existingPending) return reply.badRequest("Ton clan a déjà un défi envoyé en attente");
    const war = await prisma.clanWar.create({ data: { challengerClanId: member.clanId, defenderClanId, createdById: req.user.userId, teamSize, stakeCoins } });
    sendToUser(defender.leaderId, { type: "clan_war_challenge", warId: war.id, clanName: member.clan.name, clanTag: member.clan.tag, teamSize, stakeCoins });
    return reply.code(201).send(await detail(war.id, req.user.userId));
  });

  app.patch("/api/clan-wars/:id/respond", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { accept } = req.body as { accept: boolean }; const id = (req.params as any).id;
    const member = await staffClan(req.user.userId); const war = await prisma.clanWar.findUnique({ where: { id } });
    if (!member || member.role !== "leader" || !war || member.clanId !== war.defenderClanId) return reply.forbidden("Réservé au chef défié");
    if (war.status !== "PENDING") return reply.badRequest("Ce défi a déjà été traité");
    if (!accept) {
      await prisma.clanWar.update({ where: { id }, data: { status: "DECLINED", completedAt: new Date() } });
      const challenger = await prisma.clan.findUnique({ where: { id: war.challengerClanId } });
      if (challenger) sendToUser(challenger.leaderId, { type: "clan_war_declined", warId: war.id });
      return reply.send(await detail(id, req.user.userId));
    }
    try {
      const activated = await activateWar(id);
      sendToUser(activated.challengerClan.leaderId, { type: "clan_war_accepted", warId: activated.id, opponentClanName: activated.defenderClan.name, stakeCoins: activated.stakeCoins });
      sendToUser(activated.defenderClan.leaderId, { type: "clan_war_accepted", warId: activated.id, opponentClanName: activated.challengerClan.name, stakeCoins: activated.stakeCoins });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_WAR_BALANCE") return reply.badRequest("Un des deux chefs n'a pas le solde nécessaire pour cette mise");
      if (error instanceof Error && error.message === "CLAN_ALREADY_ACTIVE") return reply.badRequest("Un des clans a déjà une guerre en cours");
      throw error;
    }
    return reply.send(await detail(id, req.user.userId));
  });

  app.delete("/api/clan-wars/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const member = await staffClan(req.user.userId);
    const war = await prisma.clanWar.findUnique({ where: { id }, include: { defenderClan: true } });
    if (!member || member.role !== "leader" || !war || member.clanId !== war.challengerClanId) return reply.forbidden("Seul le chef qui a envoyé le défi peut l'annuler");
    if (war.status !== PENDING_STATUS) return reply.badRequest("Cette guerre ne peut plus être annulée");
    await prisma.clanWar.update({ where: { id }, data: { status: "DECLINED", completedAt: new Date() } });
    sendToUser(war.defenderClan.leaderId, { type: "clan_war_cancelled", warId: war.id });
    return reply.send({ ok: true });
  });

  app.put("/api/clan-wars/:id/team", { preHandler: [app.authenticate] }, async (req, reply) => {
    const id = (req.params as any).id; const { userIds } = req.body as { userIds: string[] };
    const member = await staffClan(req.user.userId); const war = await prisma.clanWar.findUnique({ where: { id } });
    if (!member || member.role !== "leader" || !war || ![war.challengerClanId, war.defenderClanId].includes(member.clanId)) return reply.forbidden("Réservé aux chefs concernés");
    if (war.status !== "TEAM_SELECTION" || !war.endsAt || war.endsAt <= new Date()) return reply.badRequest("La sélection est terminée");
    if (!Array.isArray(userIds) || new Set(userIds).size !== war.teamSize) return reply.badRequest(`Sélectionne exactement ${war.teamSize} joueurs`);
    const valid = await prisma.clanMember.count({ where: { clanId: member.clanId, userId: { in: userIds } } });
    if (valid !== war.teamSize) return reply.badRequest("Un joueur sélectionné n'appartient pas au clan");
    await prisma.$transaction([prisma.clanWarMember.deleteMany({ where: { warId: id, clanId: member.clanId } }), ...userIds.map((userId) => prisma.clanWarMember.create({ data: { warId: id, clanId: member.clanId, userId } }))]);
    await maybeCreateMatches(id); return reply.send(await detail(id, req.user.userId));
  });
}
