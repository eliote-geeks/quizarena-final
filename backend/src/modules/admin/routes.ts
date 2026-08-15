import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

/**
 * Dashboard admin — jamais accessible par inscription publique
 * (§isAdmin sur User, §scripts/make-admin.mjs). Sert directement une
 * page HTML statique (voir server.ts) + cette API JSON qu'elle
 * consomme, avec le même JWT que le reste du produit (un admin est un
 * User comme les autres, juste avec isAdmin=true — pas un second
 * système d'auth à maintenir).
 *
 * Portée volontairement resserrée sur ce qui est bloqué SANS
 * intervention humaine aujourd'hui :
 *  - Transaction.status=QUARANTINED ne se libère jamais tout seul
 *    (§quiz/routes.ts action="quarantine_hard/soft") — l'argent d'un
 *    joueur honnête mais suspecté à tort restait coincé indéfiniment.
 *  - Flag.resolved ne passe jamais à true tout seul.
 *  - Question.active=false (relecture IA, §scripts/generate-questions.mjs)
 *    n'a jusqu'ici été activée qu'à la main via psql.
 */
export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireAdmin);

  // ── Vue d'ensemble ────────────────────────────────────────────────
  app.get("/api/admin/overview", async (_req, reply) => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      userCount,
      activeToday,
      newThisWeek,
      sums,
      quarantinedAgg,
      pendingAgg,
      flagsUnresolved,
      questionsPending,
      tournamentsActive,
      duelsToday,
    ] = await Promise.all([
      prisma.user.count({ where: { isBot: false } }),
      prisma.user.count({ where: { isBot: false, lastLoginAt: { gte: dayAgo } } }),
      prisma.user.count({ where: { isBot: false, createdAt: { gte: weekAgo } } }),
      prisma.transaction.groupBy({ by: ["type"], where: { status: "COMPLETED" }, _sum: { amountCoins: true } }),
      prisma.transaction.aggregate({ where: { status: "QUARANTINED" }, _sum: { amountCoins: true }, _count: true }),
      prisma.transaction.aggregate({ where: { status: "PENDING" }, _sum: { amountCoins: true }, _count: true }),
      prisma.flag.count({ where: { resolved: false } }),
      prisma.question.count({ where: { active: false } }),
      prisma.tournament.count({ where: { status: { in: ["REGISTERING", "IN_PROGRESS"] } } }),
      prisma.duelMatch.count({ where: { startedAt: { gte: dayAgo } } }),
    ]);

    const byType = Object.fromEntries(sums.map((s) => [s.type, s._sum.amountCoins ?? 0]));
    // Solde total dû aux joueurs = somme signée de TOUT ce qui est COMPLETED
    // (c'est la définition même du solde, §wallet/ledger.ts getBalance — ici
    // juste non groupé par utilisateur).
    const balanceLiability = Object.values(byType).reduce((a, b) => a + b, 0);

    return reply.send({
      users: { total: userCount, activeToday, newThisWeek },
      balanceLiability,
      byType: {
        deposits: byType.DEPOSIT ?? 0,
        withdrawals: Math.abs(byType.WITHDRAWAL ?? 0),
        stakes: Math.abs(byType.STAKE ?? 0),
        payouts: byType.PAYOUT ?? 0,
        refunds: byType.REFUND ?? 0,
        bonuses: byType.BONUS ?? 0,
      },
      quarantine: { count: quarantinedAgg._count, amountCoins: quarantinedAgg._sum.amountCoins ?? 0 },
      pending: { count: pendingAgg._count, amountCoins: pendingAgg._sum.amountCoins ?? 0 },
      flagsUnresolved,
      questionsPending,
      tournamentsActive,
      duelsToday,
    });
  });

  // ── Quarantaine anti-triche (§ANTICHEAT_SPEC.md §4.2) ──────────────
  app.get("/api/admin/quarantine", async (_req, reply) => {
    const txs = await prisma.transaction.findMany({
      where: { status: "QUARANTINED" },
      include: {
        user: { select: { id: true, username: true, phone: true, accountStatus: true, riskScore: true } },
        quizSession: { select: { id: true, mode: true, scoreServer: true, suspicionScore: true, suspicionFlags: true, categoryId: true } },
        duelMatch: { select: { id: true, scoreA: true, scoreB: true } },
      },
      orderBy: { createdAt: "asc" }, // les plus anciennes d'abord — celles qui traînent le plus
    });
    return reply.send({ transactions: txs });
  });

  app.post("/api/admin/quarantine/:id/release", async (req, reply) => {
    const { id } = req.params as { id: string };
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.status !== "QUARANTINED") return reply.badRequest("Transaction introuvable ou déjà traitée");
    const updated = await prisma.transaction.update({ where: { id }, data: { status: "COMPLETED", releasedAt: new Date() } });
    return reply.send({ transaction: updated });
  });

  app.post("/api/admin/quarantine/:id/reject", async (req, reply) => {
    const { id } = req.params as { id: string };
    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.status !== "QUARANTINED") return reply.badRequest("Transaction introuvable ou déjà traitée");
    // FAILED, jamais supprimée : la ligne reste comme trace de la
    // décision (§ledger.ts, principe append-only). Le joueur ne
    // récupère ni le gain ni la mise (déjà débitée séparément avant la
    // partie, §quiz/routes.ts start — rejeter le gain suffit, pas de
    // remboursement à faire en plus).
    const updated = await prisma.transaction.update({ where: { id }, data: { status: "FAILED" } });
    return reply.send({ transaction: updated });
  });

  // ── Signalements anti-triche ────────────────────────────────────────
  app.get("/api/admin/flags", async (req, reply) => {
    const { resolved } = req.query as { resolved?: string };
    const flags = await prisma.flag.findMany({
      where: resolved === undefined ? {} : { resolved: resolved === "true" },
      include: { user: { select: { id: true, username: true, phone: true, accountStatus: true, riskScore: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return reply.send({ flags });
  });

  app.post("/api/admin/flags/:id/resolve", async (req, reply) => {
    const { id } = req.params as { id: string };
    const flag = await prisma.flag.update({ where: { id }, data: { resolved: true } });
    return reply.send({ flag });
  });

  // ── Joueurs ──────────────────────────────────────────────────────
  const statusSchema = z.object({
    status: z.enum(["ACTIVE", "WATCHED", "RESTRICTED", "SUSPENDED", "BANNED"]),
  });

  app.get("/api/admin/users", async (req, reply) => {
    const { q } = req.query as { q?: string };
    const users = await prisma.user.findMany({
      where: {
        isBot: false,
        ...(q ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
      },
      select: {
        id: true, username: true, phone: true, accountStatus: true, riskScore: true,
        createdAt: true, lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const balances = await prisma.transaction.groupBy({
      by: ["userId"],
      where: { userId: { in: users.map((u) => u.id) }, status: "COMPLETED" },
      _sum: { amountCoins: true },
    });
    const balanceByUser = new Map(balances.map((b) => [b.userId, b._sum.amountCoins ?? 0]));
    return reply.send({
      users: users.map((u) => ({ ...u, balanceCoins: balanceByUser.get(u.id) ?? 0 })),
    });
  });

  app.post("/api/admin/users/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = statusSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id }, data: { accountStatus: body.status } });
    return reply.send({ user: { id: user.id, username: user.username, accountStatus: user.accountStatus } });
  });

  // ── Questions (relecture du contenu généré, §scripts/generate-questions.mjs) ──
  app.get("/api/admin/questions", async (req, reply) => {
    const { active } = req.query as { active?: string };
    const questions = await prisma.question.findMany({
      where: active === undefined ? {} : { active: active === "true" },
      include: { category: { select: { nameFr: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return reply.send({
      questions: questions.map((q) => ({
        id: q.id,
        categoryId: q.categoryId,
        categoryName: q.category.nameFr,
        textFr: q.textFr,
        options: q.options,
        answerIndex: q.answerIndex,
        active: q.active,
        source: q.source,
        createdAt: q.createdAt,
      })),
    });
  });

  app.post("/api/admin/questions/:id/activate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const question = await prisma.question.update({ where: { id }, data: { active: true } });
    return reply.send({ question });
  });

  app.delete("/api/admin/questions/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.question.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}
