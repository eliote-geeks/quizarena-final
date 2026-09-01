import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";
import { configuredTournamentCover, isTournamentCover, TOURNAMENT_COVER_IMAGES } from "../tournament/covers.js";
import { loadSettings, saveSettings } from "../../lib/settings.js";
import { credit, debit, InsufficientBalanceError } from "../wallet/ledger.js";
import { resolveVipStatus, VIP_WIN_TARGET } from "../vip/service.js";

const MUSIC_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../../music.json");
type MusicTrack = { id: string; title: string; url: string; type: "relaxing" | "action"; mood?: string; active: boolean; createdAt: string; builtin?: boolean };
type MusicConfig = { version: number; initialized: boolean; tracks: MusicTrack[] };
// Sources d'actualité explicitement autorisées. Les URLs utilisateur ne sont
// jamais suivies hors de cette liste : c'est à la fois un garde-fou éditorial
// et une protection contre les requêtes serveur vers des hôtes arbitraires.
const CURRENT_SOURCE_HOSTS = new Set([
  "bbc.com", "france24.com", "rfi.fr", "reuters.com", "apnews.com",
  "cafonline.com", "fifa.com", "olympics.com", "who.int", "un.org", "nasa.gov",
]);

function isAllowedCurrentSource(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && [...CURRENT_SOURCE_HOSTS].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}

function extractArticleText(html: string) {
  // Suffisant pour fournir un contexte borné au modèle; ce n'est pas un
  // extracteur de contenu publié ni un contournement des conditions du média.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 14_000);
}
const BUILTIN_MUSIC: MusicTrack[] = [
  { id: "builtin-ambient-1", title: "Ambiment — Kevin MacLeod", url: "/audio/ambient-1.mp3", type: "relaxing", mood: "Ambiance", active: true, builtin: true, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "builtin-ambient-2", title: "Airport Lounge — Kevin MacLeod", url: "/audio/ambient-2.mp3", type: "relaxing", mood: "Ambiance", active: true, builtin: true, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "builtin-ambient-3", title: "At Rest — Kevin MacLeod", url: "/audio/ambient-3.mp3", type: "relaxing", mood: "Détente", active: true, builtin: true, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "builtin-ambient-4", title: "Bathed in the Light — Kevin MacLeod", url: "/audio/ambient-4.mp3", type: "relaxing", mood: "Détente", active: true, builtin: true, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "builtin-war-1", title: "Five Armies — Kevin MacLeod", url: "/audio/theme-five-armies.mp3", type: "action", mood: "Guerre", active: true, builtin: true, createdAt: "2026-08-22T00:00:00.000Z" },
  { id: "builtin-war-2", title: "Heroic Age — Kevin MacLeod", url: "/audio/theme-heroic-age.mp3", type: "action", mood: "Épique", active: true, builtin: true, createdAt: "2026-08-22T00:00:00.000Z" },
  { id: "builtin-anime-1", title: "Pixelland — Kevin MacLeod", url: "/audio/theme-pixelland.mp3", type: "action", mood: "Anime & gaming", active: true, builtin: true, createdAt: "2026-08-22T00:00:00.000Z" },
  { id: "builtin-relax-1", title: "Carefree — Kevin MacLeod", url: "/audio/theme-carefree.mp3", type: "relaxing", mood: "Détente", active: true, builtin: true, createdAt: "2026-08-22T00:00:00.000Z" },
  { id: "builtin-ambient-5", title: "Floating Cities — Kevin MacLeod", url: "/audio/theme-floating-cities.mp3", type: "relaxing", mood: "Ambiance", active: true, builtin: true, createdAt: "2026-08-22T00:00:00.000Z" },
  { id: "builtin-world-1", title: "Desert City — Kevin MacLeod", url: "/audio/theme-desert-city.mp3", type: "relaxing", mood: "Monde", active: true, builtin: true, createdAt: "2026-08-22T00:00:00.000Z" },
  { id: "builtin-game-1", title: "Townie Loop — Kevin MacLeod", url: "/audio/theme-townie-loop.mp3", type: "relaxing", mood: "Anime & gaming", active: true, builtin: true, createdAt: "2026-08-22T00:00:00.000Z" },
];
function getMusic(): MusicConfig {
  if (!existsSync(MUSIC_PATH)) return { version: 2, initialized: false, tracks: BUILTIN_MUSIC.map((track) => ({ ...track })) };
  try {
    const parsed = JSON.parse(readFileSync(MUSIC_PATH, "utf8"));
    if (parsed.version !== 2) {
      const previous = Array.isArray(parsed.tracks) ? parsed.tracks : [];
      const previousIds = new Set(previous.map((track: MusicTrack) => track.id));
      const defaults = new Map(BUILTIN_MUSIC.map((track) => [track.id, track]));
      const migrated = previous.map((track: MusicTrack) => ({ ...(defaults.get(track.id) ?? {}), ...track }));
      return { version: 2, initialized: false, tracks: [...migrated, ...BUILTIN_MUSIC.filter((track) => !previousIds.has(track.id))] };
    }
    return { version: 2, initialized: true, tracks: (parsed.tracks ?? []).map((track: MusicTrack) => ({ ...track, active: track.active !== false })) };
  } catch { return { version: 2, initialized: false, tracks: BUILTIN_MUSIC.map((track) => ({ ...track })) }; }
}
function saveMusic(data: { tracks: MusicTrack[] }) {
  writeFileSync(MUSIC_PATH, JSON.stringify({ version: 2, initialized: true, tracks: data.tracks }, null, 2));
}

function validPublicAudioUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch { return false; }
}

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
      // Alias plats conservés pour le dashboard statique et les anciens
      // clients d'administration.
      totalUsers: userCount,
      balanceLiability,
      byType: {
        deposits: byType.DEPOSIT ?? 0,
        withdrawals: Math.abs(byType.WITHDRAWAL ?? 0),
        stakes: Math.abs(byType.STAKE ?? 0),
        payouts: byType.PAYOUT ?? 0,
        refunds: byType.REFUND ?? 0,
        bonuses: byType.BONUS ?? 0,
        DEPOSIT: byType.DEPOSIT ?? 0,
        WITHDRAWAL: Math.abs(byType.WITHDRAWAL ?? 0),
        STAKE: Math.abs(byType.STAKE ?? 0),
        PAYOUT: byType.PAYOUT ?? 0,
      },
      quarantine: { count: quarantinedAgg._count, amountCoins: quarantinedAgg._sum.amountCoins ?? 0 },
      quarantineCount: quarantinedAgg._count,
      pending: { count: pendingAgg._count, amountCoins: pendingAgg._sum.amountCoins ?? 0 },
      flagsUnresolved,
      flags: flagsUnresolved,
      questionsPending,
      tournamentsActive,
      activeTournaments: tournamentsActive,
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

  // ── Signalements joueur (remontés par d'autres joueurs) ─────────
  app.get("/api/admin/user-reports", async (_req, reply) => {
    const reports = await (prisma as any).userReport.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    // enrichir avec les usernames
    const ids = [...new Set([...reports.map((r: any) => r.reporterId), ...reports.map((r: any) => r.targetId)])];
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
    const byId = new Map(users.map((u) => [u.id, u.username]));
    return reply.send({
      reports: reports.map((r: any) => ({
        ...r,
        reporterUsername: byId.get(r.reporterId) ?? "?",
        targetUsername: byId.get(r.targetId) ?? "?",
      })),
    });
  });

  app.post("/api/admin/user-reports/:id/resolve", async (req, reply) => {
    const { id } = req.params as { id: string };
    await (prisma as any).userReport.update({ where: { id }, data: { resolved: true } });
    return reply.send({ ok: true });
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
        createdAt: true, lastLoginAt: true, isAdmin: true, vipGrantedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const [balances, wins] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((u) => u.id) }, status: "COMPLETED" },
        _sum: { amountCoins: true, bonusAmountCoins: true },
      }),
      prisma.duelMatch.groupBy({
        by: ["winnerId"],
        where: { winnerId: { in: users.map((u) => u.id) }, status: "COMPLETED", completedAt: { gte: since30d } },
        _count: { _all: true },
      }),
    ]);
    const balanceByUser = new Map(balances.map((b) => [b.userId, b._sum.amountCoins ?? 0]));
    const bonusByUser = new Map(balances.map((b) => [b.userId, b._sum.bonusAmountCoins ?? 0]));
    const winsByUser = new Map(wins.map((row) => [row.winnerId, row._count._all]));
    return reply.send({
      users: users.map((u) => {
        const balanceCoins = balanceByUser.get(u.id) ?? 0;
        const bonusCoins = Math.max(0, Math.min(balanceCoins, bonusByUser.get(u.id) ?? 0));
        const vip = resolveVipStatus(u.vipGrantedAt, winsByUser.get(u.id) ?? 0, u.isAdmin);
        return { ...u, balanceCoins, bonusCoins, withdrawableCoins: balanceCoins - bonusCoins, vip };
      }),
      vipWinTarget: VIP_WIN_TARGET,
    });
  });

  app.post("/api/admin/users/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = statusSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id }, data: { accountStatus: body.status } });
    return reply.send({ user: { id: user.id, username: user.username, accountStatus: user.accountStatus } });
  });

  const vipSchema = z.object({ enabled: z.boolean() });
  app.post("/api/admin/users/:id/vip", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { enabled } = vipSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id },
      data: { vipGrantedAt: enabled ? new Date() : null },
      select: { id: true, username: true, vipGrantedAt: true, isAdmin: true },
    });
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const wins = await prisma.duelMatch.count({
      where: { winnerId: id, status: "COMPLETED", completedAt: { gte: since30d } },
    });
    req.log.info({ targetUserId: id, enabled, adminUserId: req.user.userId }, "VIP attribution updated");
    return reply.send({ user, vip: resolveVipStatus(user.vipGrantedAt, wins, user.isAdmin) });
  });

  // ── Questions (relecture du contenu généré, §scripts/generate-questions.mjs) ──
  app.get("/api/admin/questions", async (req, reply) => {
    const { active, categoryId, source, q, page = "1" } = req.query as Record<string, string>;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const take = 50;
    const where = {
      ...(active === undefined ? {} : { active: active === "true" }),
      ...(categoryId ? { categoryId } : {}),
      ...(source ? { source } : {}),
      ...(q ? { textFr: { contains: q, mode: "insensitive" as const } } : {}),
    };
    const [questions, total, activeCount, pendingCount, sources] = await Promise.all([
      prisma.question.findMany({
        where,
        include: { category: { select: { nameFr: true } } },
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * take,
        take,
      }),
      prisma.question.count({ where }),
      prisma.question.count({ where: { active: true } }),
      prisma.question.count({ where: { active: false } }),
      prisma.question.groupBy({ by: ["source"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    ]);
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
        subcategory: q.subcategory,
        mediaUrl: q.mediaUrl,
        mediaAlt: q.mediaAlt,
        sourceUrl: q.sourceUrl,
        verifiedAt: q.verifiedAt,
        expiresAt: q.expiresAt,
        tournamentEligible: q.tournamentEligible,
        createdAt: q.createdAt,
      })),
      total,
      activeCount,
      pendingCount,
      sources: sources.map((item) => ({ source: item.source, count: item._count.id })),
      page: currentPage,
      pages: Math.max(1, Math.ceil(total / take)),
    });
  });

  const editorialSchema = z.object({
    subcategory: z.string().trim().min(2).max(80).nullable().optional(),
    mediaUrl: z.string().url().max(1_500).nullable().optional(),
    mediaAlt: z.string().trim().min(3).max(180).nullable().optional(),
    sourceUrl: z.string().url().max(1_500).nullable().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    tournamentEligible: z.boolean().optional(),
    verified: z.boolean().optional(),
  });

  // Métadonnées éditoriales : l'admin peut associer une image sous licence,
  // une source et une échéance à une question sans toucher à la réponse.
  app.patch("/api/admin/questions/:id/editorial", async (req, reply) => {
    const body = editorialSchema.parse(req.body);
    if (body.mediaUrl && !body.mediaAlt) return reply.badRequest("Un texte alternatif est obligatoire pour l'image");
    const question = await prisma.question.update({
      where: { id: (req.params as { id: string }).id },
      data: {
        ...(body.subcategory !== undefined ? { subcategory: body.subcategory || null } : {}),
        ...(body.mediaUrl !== undefined ? { mediaUrl: body.mediaUrl } : {}),
        ...(body.mediaAlt !== undefined ? { mediaAlt: body.mediaAlt } : {}),
        ...(body.sourceUrl !== undefined ? { sourceUrl: body.sourceUrl } : {}),
        ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt } : {}),
        ...(body.tournamentEligible !== undefined ? { tournamentEligible: body.tournamentEligible } : {}),
        ...(body.verified ? { verifiedAt: new Date() } : {}),
      },
    });
    return reply.send({ question });
  });

  app.get("/api/admin/content-coverage", async (_req, reply) => {
    const rows = await prisma.category.findMany({
      select: { id: true, nameFr: true, _count: { select: { questions: { where: { active: true } } } } },
      orderBy: { nameFr: "asc" },
    });
    const media = await prisma.question.groupBy({ by: ["categoryId"], where: { active: true, mediaUrl: { not: null } }, _count: { id: true } });
    const mediaByCategory = new Map(media.map((row) => [row.categoryId, row._count.id]));
    return reply.send({
      targetTotal: 20_000,
      targetImageShare: 0.30,
      categories: rows.map((row) => ({
        id: row.id, nameFr: row.nameFr, active: row._count.questions,
        media: mediaByCategory.get(row.id) ?? 0,
        imageShare: row._count.questions ? (mediaByCategory.get(row.id) ?? 0) / row._count.questions : 0,
      })),
    });
  });

  app.post("/api/admin/questions/:id/activate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const candidate = await prisma.question.findUnique({ where: { id }, select: { source: true, sourceUrl: true, verifiedAt: true } });
    if (!candidate) return reply.notFound("Question introuvable");
    if ((candidate.source === "admin_ai" || candidate.source === "ai" || candidate.source === "wikimedia_commons") && (!candidate.sourceUrl || !candidate.verifiedAt)) {
      return reply.badRequest("Cette question doit avoir une source et être vérifiée avant publication");
    }
    const question = await prisma.question.update({ where: { id }, data: { active: true } });
    return reply.send({ question });
  });

  app.post("/api/admin/questions/:id/deactivate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const question = await prisma.question.update({ where: { id }, data: { active: false } });
    return reply.send({ question });
  });

  app.delete("/api/admin/questions/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.question.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ── Suppression en lot par catégorie ─────────────────────────────
  app.delete("/api/admin/questions/bulk", async (req, reply) => {
    const { categoryId, activeOnly } = req.body as { categoryId?: string; activeOnly?: boolean };
    const result = await prisma.question.deleteMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(activeOnly !== undefined ? { active: activeOnly } : {}),
      },
    });
    return reply.send({ deleted: result.count });
  });

  // Activation en lot avec les mêmes garde-fous structurels que le jeu.
  // Cette route n'atteste pas la vérité factuelle d'une sortie IA : elle
  // est surtout destinée aux imports issus d'une banque éditoriale relue.
  app.post("/api/admin/questions/bulk-activate", async (req, reply) => {
    const body = req.body as { source?: string; categoryId?: string; limit?: number };
    const limit = Math.min(Math.max(1, Number(body.limit) || 1000), 10_000);
    const candidates = await prisma.question.findMany({
      where: {
        active: false,
        ...(body.source ? { source: body.source } : {}),
        ...(body.categoryId ? { categoryId: body.categoryId } : {}),
      },
      select: { id: true, textFr: true, options: true, answerIndex: true },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    const validIds = candidates.filter((q) => {
      const options = Array.isArray(q.options) ? q.options.map(String) : [];
      return q.textFr.trim().length >= 8
        && options.length === 4
        && q.answerIndex >= 0
        && q.answerIndex < 4
        && options.every((option) => option.trim().length > 0)
        && new Set(options.map((option) => option.trim().toLocaleLowerCase("fr"))).size === 4;
    }).map((q) => q.id);
    const result = await prisma.question.updateMany({ where: { id: { in: validIds } }, data: { active: true } });
    return reply.send({ activated: result.count, rejected: candidates.length - validIds.length });
  });

  // ── Génération IA en arrière-plan (fire-and-forget) ────────────────────
  // Le serveur tourne sur CPU pur : Java + k3s saturent les cœurs en
  // permanence. Tenir une connexion HTTP ouverte plusieurs minutes n'est
  // pas possible. Architecture retenue :
  //   1. L'endpoint répond immédiatement (202 Accepted).
  //   2. La génération Ollama continue en tâche de fond dans la boucle
  //      événementielle Node.js (non-bloquant pour les autres requêtes).
  //   3. L'admin rafraîchit la liste "En attente" quelques minutes plus tard.
  // Un mutex global empêche les générations parallèles (Ollama CPU-only
  // ne bénéficie pas de la parallélisation et ralentit au contraire).
  let _genLocked = false;
  let generationJob: {
    status: "idle" | "running" | "completed" | "failed";
    categoryId?: string; topic?: string; requested: number; created: number; rejected: number; startedAt?: string; completedAt?: string;
  } = { status: "idle", requested: 0, created: 0, rejected: 0 };

  async function runOllamaGeneration(categoryId: string, count: number, categoryName: string, editorial: { topic?: string; sourceUrl?: string; expiresAt?: Date; sourceContext?: string }) {
    for (let i = 0; i < count; i++) {
      const prompt = `Crée une question de quiz en français sur "${categoryName}"${editorial.topic ? `, sujet précis : "${editorial.topic}"` : ""}.
Réponds UNIQUEMENT avec cet objet JSON (rien d'autre) :
{"question":"La question ?","options":["A","B","C","D"],"answer":0}
answer = index 0-3 de la bonne réponse. Le fait doit être largement connu et vérifiable.
Évite les dates, mesures, records et formulations ambiguës. Une seule option doit être correcte.
Ne donne jamais la réponse dans le texte de la question.${editorial.sourceContext ? `\nTu travailles EXCLUSIVEMENT à partir de cet extrait de source vérifiée. Chaque fait de la question et la bonne réponse doivent apparaître clairement dans cet extrait. Si ce n'est pas possible, retourne exactement {}.\nSOURCE :\n${editorial.sourceContext}` : "\nN'invente jamais une information récente : si le sujet exige une information postérieure à ta base de connaissances, produis une question intemporelle liée au sujet."}`;

      try {
        const ollamaRes = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Le serveur est CPU-only : le 14B charge ~10 Go et ne convient
            // pas à une file d'administration. Le 7B reste largement
            // suffisant puisque chaque sortie est relue avant publication.
            model: "qwen2.5:7b-instruct",
            prompt,
            stream: false,
            options: { num_predict: 220, temperature: 0.75 },
          }),
          signal: AbortSignal.timeout(300_000), // 5 min par question en conditions chargées
        });
        if (!ollamaRes.ok) continue;

        const ollamaData: any = await ollamaRes.json();
        const raw: string = ollamaData.response ?? "";
        const match = raw.match(/\{[\s\S]*?\}/);
        if (!match) continue;

        let q: any;
        try { q = JSON.parse(match[0]); } catch { continue; }

        const textFr = String(q.question ?? q.text ?? "").trim();
        const opts: string[] = Array.isArray(q.options) ? q.options.map(String) : [];
        const answerIndex = Number(q.answer ?? 0);

        if (!textFr || textFr.length < 10) { generationJob.rejected++; continue; }
        if (opts.length !== 4) { generationJob.rejected++; continue; }
        if (opts.some((o: string) => !o || o.length < 2)) { generationJob.rejected++; continue; }
        if (new Set(opts.map((o: string) => o.trim().toLocaleLowerCase("fr"))).size !== 4) { generationJob.rejected++; continue; }
        if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) { generationJob.rejected++; continue; }
        const correctOption = opts[answerIndex];
        if (!correctOption) { generationJob.rejected++; continue; }
        const correct = correctOption.trim().toLocaleLowerCase("fr");
        if (correct.length > 3 && textFr.toLocaleLowerCase("fr").includes(correct)) { generationJob.rejected++; continue; }
        if (/\b(19|20)\d{2}\b|\b\d+(?:[.,]\d+)?\s*(?:km|m|cm|kg|%|ans?)\b/i.test(`${textFr} ${correctOption}`)) { generationJob.rejected++; continue; }

        // Doublon ?
        const dupe = await prisma.question.findFirst({
          where: { categoryId, textFr: { equals: textFr, mode: "insensitive" } },
        });
        if (dupe) { generationJob.rejected++; continue; }

        await prisma.question.create({
          data: { categoryId, textFr, textEn: textFr, options: opts, answerIndex, active: false, source: "admin_ai", subcategory: editorial.topic || null, sourceUrl: editorial.sourceUrl || null, expiresAt: editorial.expiresAt || null },
        });
        generationJob.created++;
      } catch {
        generationJob.rejected++;
        // Timeout ou autre erreur : passer à la question suivante
      }
    }
    _genLocked = false;
    generationJob.status = "completed";
    generationJob.completedAt = new Date().toISOString();
  }

  app.get("/api/admin/questions/generation-status", async (_req, reply) => reply.send(generationJob));

  app.post("/api/admin/questions/generate", async (req, reply) => {
    const body = z.object({
      categoryId: z.string().min(1), count: z.coerce.number().int().min(1).max(10).default(5),
      topic: z.string().trim().min(2).max(100).optional(), sourceUrl: z.string().url().max(1_500).optional(), expiresAt: z.coerce.date().optional(),
    }).parse(req.body);
    const { categoryId, count = 5 } = body;
    const safeCount = Math.min(Math.max(1, count), 10);

    if (_genLocked) {
      return reply.send({
        status: "already_running",
        message: "Une génération est déjà en cours. Patientez et rafraîchissez les questions dans quelques minutes.",
      });
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) return reply.badRequest("Catégorie introuvable");

    _genLocked = true;
    generationJob = { status: "running", categoryId, topic: body.topic, requested: safeCount, created: 0, rejected: 0, startedAt: new Date().toISOString() };

    // Lance la génération en arrière-plan — ne pas await
    runOllamaGeneration(categoryId, safeCount, (category as any).nameFr, { topic: body.topic, sourceUrl: body.sourceUrl, expiresAt: body.expiresAt }).catch(() => { _genLocked = false; generationJob.status = "failed"; generationJob.completedAt = new Date().toISOString(); });

    return reply.code(202).send({
      status: "queued",
      count: safeCount,
      message: `Génération de ${safeCount} question(s) lancée en arrière-plan. Rafraîchissez la liste "En attente" dans quelques minutes (environ ${safeCount * 3} min sur ce serveur).`,
    });
  });

  // Actualité : une source approuvée est obligatoire et la sortie reste un
  // brouillon. Une question expire rapidement puis doit être à nouveau
  // vérifiée, ce qui évite qu'une information datée reste dans le jeu.
  app.post("/api/admin/questions/generate-current", async (req, reply) => {
    const body = z.object({
      categoryId: z.string().min(1),
      sourceUrl: z.string().url().max(1_500),
      topic: z.string().trim().min(2).max(100).optional(),
      count: z.coerce.number().int().min(1).max(5).default(3),
    }).parse(req.body);
    if (_genLocked) return reply.conflict("Une génération est déjà en cours");
    if (!isAllowedCurrentSource(body.sourceUrl)) {
      return reply.badRequest("Source non autorisée. Utilisez un lien HTTPS BBC, France 24, RFI, Reuters, AP, CAF, FIFA, CIO, OMS, ONU ou NASA.");
    }
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category) return reply.badRequest("Catégorie introuvable");

    let article: string;
    try {
      const source = await fetch(body.sourceUrl, {
        redirect: "manual",
        headers: { "User-Agent": "QuizArenaEditorialBot/1.0 (+https://quizarena.example/editorial)" },
        signal: AbortSignal.timeout(15_000),
      });
      const contentType = source.headers.get("content-type") ?? "";
      if (!source.ok || !contentType.includes("text/html")) return reply.badRequest("La source doit répondre directement en HTML (sans redirection).");
      article = extractArticleText(await source.text());
    } catch {
      return reply.badRequest("Impossible de lire cette source pour le moment.");
    }
    if (article.length < 500) return reply.badRequest("Le contenu lisible de cette source est insuffisant.");

    const safeCount = Math.min(Math.max(1, body.count), 5);
    _genLocked = true;
    generationJob = { status: "running", categoryId: body.categoryId, topic: body.topic, requested: safeCount, created: 0, rejected: 0, startedAt: new Date().toISOString() };
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    runOllamaGeneration(body.categoryId, safeCount, (category as any).nameFr, {
      topic: body.topic,
      sourceUrl: body.sourceUrl,
      expiresAt,
      sourceContext: article,
    }).catch(() => { _genLocked = false; generationJob.status = "failed"; generationJob.completedAt = new Date().toISOString(); });

    return reply.code(202).send({ status: "queued", count: safeCount, expiresAt, message: "Brouillons d’actualité lancés : relisez puis activez chaque question avant publication." });
  });

  // ── Brouillons image : Wikidata + Wikimedia Commons ────────────────
  // Les hôtes sont fixes (jamais une URL fournie par le client) : cela
  // évite toute SSRF. Wikimedia donne ici l'image, sa page et sa licence;
  // l'admin rédige ensuite la question et la valide comme tout brouillon.
  async function findWikimediaImages(term: string, limit: number) {
    const searchUrl = new URL("https://www.wikidata.org/w/api.php");
    searchUrl.search = new URLSearchParams({ action: "wbsearchentities", search: term, language: "fr", format: "json", limit: String(limit), origin: "*" }).toString();
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(12_000) });
    if (!searchRes.ok) throw new Error("Recherche Wikidata indisponible");
    const searchData: any = await searchRes.json();
    const ids = (searchData.search ?? []).map((item: any) => item.id).filter(Boolean);
    if (!ids.length) return [];

    const entityUrl = new URL("https://www.wikidata.org/w/api.php");
    entityUrl.search = new URLSearchParams({ action: "wbgetentities", ids: ids.join("|"), props: "labels|descriptions|claims", languages: "fr", format: "json", origin: "*" }).toString();
    const entityRes = await fetch(entityUrl, { signal: AbortSignal.timeout(12_000) });
    if (!entityRes.ok) throw new Error("Détails Wikidata indisponibles");
    const entityData: any = await entityRes.json();
    const entities: Record<string, any> = entityData.entities ?? {};
    const files = Object.entries(entities).flatMap(([id, entity]) => {
      const name = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      return name ? [{ id, name, label: entity.labels?.fr?.value ?? id, description: entity.descriptions?.fr?.value ?? "" }] : [];
    });
    if (!files.length) return [];

    const infoUrl = new URL("https://commons.wikimedia.org/w/api.php");
    infoUrl.search = new URLSearchParams({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "768", titles: files.map((file) => `File:${file.name}`).join("|"), format: "json", origin: "*" }).toString();
    const infoRes = await fetch(infoUrl, { signal: AbortSignal.timeout(12_000) });
    if (!infoRes.ok) throw new Error("Métadonnées Wikimedia indisponibles");
    const infoData: any = await infoRes.json();
    const pages = Object.values(infoData.query?.pages ?? {}) as any[];
    const byFile = new Map(pages.map((page) => [String(page.title ?? "").replace(/^File:/, ""), page.imageinfo?.[0]]));
    return files.flatMap((file) => {
      const info = byFile.get(file.name);
      if (!info?.thumburl || !info?.descriptionurl) return [];
      return [{ ...file, mediaUrl: info.thumburl, sourceUrl: info.descriptionurl, license: info.extmetadata?.LicenseShortName?.value ?? "Licence à vérifier", author: String(info.extmetadata?.Artist?.value ?? "Auteur à créditer").replace(/<[^>]*>/g, "") }];
    });
  }

  app.get("/api/admin/media/wikimedia", async (req, reply) => {
    const { q, limit = "8" } = req.query as { q?: string; limit?: string };
    if (!q?.trim() || q.trim().length < 2) return reply.badRequest("Saisissez au moins deux caractères");
    const candidates = await findWikimediaImages(q.trim(), Math.min(Math.max(Number(limit) || 8, 1), 12));
    return reply.send({ candidates });
  });

  const imageDraftSchema = z.object({
    categoryId: z.string().min(1), textFr: z.string().trim().min(8).max(500),
    options: z.array(z.string().trim().min(1).max(160)).length(4), answerIndex: z.number().int().min(0).max(3),
    mediaUrl: z.string().url().max(1_500), mediaAlt: z.string().trim().min(3).max(180), sourceUrl: z.string().url().max(1_500),
    subcategory: z.string().trim().max(100).optional(),
  });
  app.post("/api/admin/questions/image-drafts", async (req, reply) => {
    const body = imageDraftSchema.parse(req.body);
    if (new Set(body.options.map((option) => option.toLocaleLowerCase("fr"))).size !== 4) return reply.badRequest("Les quatre propositions doivent être différentes");
    const duplicate = await prisma.question.findFirst({ where: { categoryId: body.categoryId, textFr: { equals: body.textFr, mode: "insensitive" } } });
    if (duplicate) return reply.conflict("Cette question existe déjà dans cette catégorie");
    const question = await prisma.question.create({ data: { ...body, textEn: body.textFr, active: false, source: "wikimedia_commons" } });
    return reply.code(201).send({ question });
  });

  // ── Catégories ───────────────────────────────────────────────────
  app.get("/api/admin/categories", async (_req, reply) => {
    const cats = await prisma.category.findMany({ orderBy: { nameFr: "asc" } });
    const counts = await prisma.question.groupBy({
      by: ["categoryId"],
      _count: { id: true },
    });
    const active = await prisma.question.groupBy({
      by: ["categoryId"],
      where: { active: true },
      _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.categoryId, c._count.id]));
    const activeMap = new Map(active.map((c) => [c.categoryId, c._count.id]));
    return reply.send({
      categories: (cats as any[]).map((c) => ({
        id: c.id,
        nameFr: c.nameFr,
        nameEn: c.nameEn,
        total: countMap.get(c.id) ?? 0,
        active: activeMap.get(c.id) ?? 0,
      })),
    });
  });

  // ── Crédit / Débit compte joueur ─────────────────────────────────
  app.post("/api/admin/users/:id/credit", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { amount, reason } = req.body as { amount: number; reason?: string };
    if (!amount || amount <= 0) return reply.badRequest("Montant invalide");
    const tx = await credit({
      userId: id,
      type: "BONUS",
      amountCoins: Math.round(amount),
      metadata: { reason: reason ?? "admin_credit", by: req.user.userId, withdrawable: false },
    });
    return reply.send({ transaction: tx });
  });

  app.post("/api/admin/users/:id/debit", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { amount, reason } = req.body as { amount: number; reason?: string };
    if (!amount || amount <= 0) return reply.badRequest("Montant invalide");
    let tx;
    try {
      tx = await debit({
        userId: id,
        type: "BONUS",
        amountCoins: Math.round(amount),
        metadata: { reason: reason ?? "admin_debit", by: req.user.userId },
      });
    } catch (error) {
      if (error instanceof InsufficientBalanceError) return reply.badRequest(error.message);
      throw error;
    }
    return reply.send({ transaction: tx });
  });

  // ── Transactions (liste paginée avec filtres) ─────────────────────
  app.get("/api/admin/transactions", async (req, reply) => {
    const { page = "1", type, userId, status } = req.query as Record<string, string>;
    const take = 50;
    const skip = (Math.max(1, parseInt(page)) - 1) * take;
    const where: any = {
      ...(type ? { type } : {}),
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    };
    const [txs, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.transaction.count({ where }),
    ]);
    return reply.send({ transactions: txs, total, page: parseInt(page), pages: Math.ceil(total / take) });
  });

  // ── Statistiques journalières (14 jours) pour graphiques ─────────
  app.get("/api/admin/stats/daily", async (_req, reply) => {
    const DAYS = 14;
    const since = new Date(Date.now() - DAYS * 86_400_000);
    const txs = await prisma.transaction.findMany({
      where: { createdAt: { gte: since }, status: "COMPLETED" },
      select: { createdAt: true, type: true, amountCoins: true },
    });

    const map: Record<string, { deposits: number; withdrawals: number; stakes: number; payouts: number; users: number }> = {};
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      map[d.toISOString().slice(0, 10)] = { deposits: 0, withdrawals: 0, stakes: 0, payouts: 0, users: 0 };
    }
    txs.forEach((tx) => {
      const key = tx.createdAt.toISOString().slice(0, 10);
      if (!map[key]) return;
      if (tx.type === "DEPOSIT")    map[key].deposits    += tx.amountCoins;
      if (tx.type === "WITHDRAWAL") map[key].withdrawals += Math.abs(tx.amountCoins);
      if (tx.type === "STAKE")      map[key].stakes      += Math.abs(tx.amountCoins);
      if (tx.type === "PAYOUT")     map[key].payouts     += tx.amountCoins;
    });

    return reply.send({ data: Object.entries(map).map(([date, v]) => ({ date, ...v })) });
  });

  // ── Paramètres plateforme (blocage dépôts/retraits) ──────────────
  // §lib/settings.ts — partagé avec wallet/routes.ts, qui applique
  // réellement le blocage (avant le 31/08 ce toggle n'était vérifié nulle
  // part : "activer/désactiver" ici ne faisait rien en pratique).
  app.get("/api/admin/settings", async (_req, reply) => {
    return reply.send(loadSettings());
  });

  app.patch("/api/admin/settings", async (req, reply) => {
    const body = req.body as { blockDeposits?: boolean; blockWithdrawals?: boolean; maintenance?: boolean; maintenanceMessage?: string; defaultTournamentCover?: string };
    if (body.defaultTournamentCover !== undefined && !isTournamentCover(body.defaultTournamentCover)) {
      return reply.badRequest("Couverture de tournoi inconnue");
    }
    return reply.send(saveSettings(body));
  });

  // ── Créer une catégorie ───────────────────────────────────────────
  app.post("/api/admin/categories", async (req, reply) => {
    const { id, nameFr, nameEn, difficulty = "moyen" } = req.body as {
      id: string; nameFr: string; nameEn?: string; difficulty?: string;
    };
    if (!id || !nameFr) return reply.badRequest("id et nameFr requis");
    const slug = id.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const existing = await prisma.category.findUnique({ where: { id: slug } });
    if (existing) return reply.conflict("Une catégorie avec cet identifiant existe déjà");
    const cat = await prisma.category.create({
      data: { id: slug, nameFr, nameEn: nameEn || nameFr, difficulty },
    });
    return reply.code(201).send({ category: cat });
  });

  // ── Gestion des tournois ─────────────────────────────────────────────
  app.get("/api/admin/tournaments", async (req, reply) => {
    const { status, page = "1" } = req.query as { status?: string; page?: string };
    const take = 25;
    const skip = (parseInt(page) - 1) * take;
    const where = status
      ? { status: status as "REGISTERING" | "IN_PROGRESS" | "COMPLETED" }
      : {};
    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        include: {
          entries: { select: { userId: true, user: { select: { username: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.tournament.count({ where }),
    ]);
    return reply.send({
      tournaments: tournaments.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        stakeCoins: t.stakeCoins,
        capacity: t.capacity,
        entryCount: t.entries.length,
        categoryId: t.categoryId,
        createdAt: t.createdAt,
        coverImage: isTournamentCover(t.coverImage) ? t.coverImage : configuredTournamentCover(),
        participants: (t.entries as any[]).map((e: any) => e.user?.username ?? "?"),
      })),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / take),
      coverImages: TOURNAMENT_COVER_IMAGES,
    });
  });

  // Annuler/supprimer un tournoi. Un tournoi non terminé rembourse chaque
  // inscription avant la suppression de son bracket.
  app.delete("/api/admin/tournaments/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const t = await prisma.tournament.findUnique({ where: { id }, include: { entries: true } });
    if (!t) return reply.notFound("Tournoi introuvable");

    // Rembourser les participants tant qu'aucun vainqueur n'a été payé.
    let refunded = 0;
    if (t.status !== "COMPLETED" && t.entries.length > 0) {
      const { credit } = await import("../wallet/ledger.js");
      for (const entry of t.entries) {
        await credit({
          userId: entry.userId,
          type: "REFUND",
          amountCoins: t.stakeCoins,
          metadata: { reason: `Tournoi annulé par l'admin : ${t.name ?? id}`, tournamentId: id },
        });
        refunded++;
      }
    }
    await prisma.$transaction([
      prisma.tournamentMatch.deleteMany({ where: { tournamentId: id } }),
      prisma.tournamentEntry.deleteMany({ where: { tournamentId: id } }),
      prisma.tournament.delete({ where: { id } }),
    ]);
    return reply.send({ deleted: true, refunded });
  });

  // ── Gestion des duels ────────────────────────────────────────────
  app.get("/api/admin/duels", async (req, reply) => {
    const { status, page = "1" } = req.query as { status?: string; page?: string };
    const take = 25;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const where = status ? { status: status as "MATCHING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" } : {};
    const [matches, total] = await Promise.all([
      prisma.duelMatch.findMany({
        where,
        include: {
          playerA: { select: { username: true } },
          playerB: { select: { username: true } },
          tournamentMatch: { select: { tournamentId: true } },
          clanWarMatch: { select: { warId: true } },
          _count: { select: { answers: true } },
        },
        orderBy: { startedAt: "desc" },
        take,
        skip: (currentPage - 1) * take,
      }),
      prisma.duelMatch.count({ where }),
    ]);
    return reply.send({
      matches: matches.map((match) => ({
        id: match.id,
        status: match.status,
        categoryId: match.categoryId,
        stakeCoins: match.stakeCoins,
        playerA: match.playerA.username,
        playerB: match.playerB.username,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        winnerId: match.winnerId,
        answerCount: match._count.answers,
        context: match.clanWarMatch ? "CLAN_WAR" : match.tournamentMatch ? "TOURNAMENT" : "STANDARD",
        contextId: match.clanWarMatch?.warId ?? match.tournamentMatch?.tournamentId ?? null,
        startedAt: match.startedAt,
        completedAt: match.completedAt,
      })),
      total,
      page: currentPage,
      pages: Math.max(1, Math.ceil(total / take)),
    });
  });

  // ── Gestion des clans ────────────────────────────────────────────
  app.get("/api/admin/clans", async (req, reply) => {
    const { page = "1" } = req.query as { page?: string };
    const take = 25;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const [clans, total] = await Promise.all([
      prisma.clan.findMany({
        include: {
          members: { include: { user: { select: { username: true } } }, orderBy: { joinedAt: "asc" } },
          _count: { select: { joinRequests: true, warsChallenged: true, warsDefending: true } },
        },
        orderBy: [{ warEarnings: "desc" }, { createdAt: "desc" }],
        take,
        skip: (currentPage - 1) * take,
      }),
      prisma.clan.count(),
    ]);
    return reply.send({
      clans: clans.map((clan) => ({
        id: clan.id,
        name: clan.name,
        tag: clan.tag,
        leaderId: clan.leaderId,
        leader: clan.members.find((member) => member.userId === clan.leaderId)?.user.username ?? "—",
        members: clan.members.map((member) => ({ username: member.user.username, role: member.role })),
        memberCount: clan.members.length,
        joinPolicy: clan.joinPolicy,
        warWins: clan.warWins,
        warLosses: clan.warLosses,
        warDraws: clan.warDraws,
        warEarnings: clan.warEarnings,
        pendingRequests: clan._count.joinRequests,
        warCount: clan._count.warsChallenged + clan._count.warsDefending,
        createdAt: clan.createdAt,
      })),
      total,
      page: currentPage,
      pages: Math.max(1, Math.ceil(total / take)),
    });
  });

  app.delete("/api/admin/clans/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const clan = await prisma.clan.findUnique({
      where: { id },
      include: { warsChallenged: { where: { status: { in: ["TEAM_SELECTION", "IN_PROGRESS"] } }, select: { id: true } }, warsDefending: { where: { status: { in: ["TEAM_SELECTION", "IN_PROGRESS"] } }, select: { id: true } } },
    });
    if (!clan) return reply.notFound("Clan introuvable");
    if (clan.warsChallenged.length || clan.warsDefending.length) return reply.badRequest("Impossible de supprimer un clan engagé dans une guerre active");
    await prisma.clan.delete({ where: { id } });
    return reply.send({ deleted: true });
  });

  // ── Gestion des guerres de clans ─────────────────────────────────
  app.get("/api/admin/clan-wars", async (req, reply) => {
    const { status, page = "1" } = req.query as { status?: string; page?: string };
    const take = 25;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const where = status ? { status: status as any } : {};
    const [wars, total, searches] = await Promise.all([
      prisma.clanWar.findMany({
        where,
        include: {
          challengerClan: { select: { name: true, tag: true } },
          defenderClan: { select: { name: true, tag: true } },
          _count: { select: { members: true, matches: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip: (currentPage - 1) * take,
      }),
      prisma.clanWar.count({ where }),
      prisma.clanWarSearch.count(),
    ]);
    return reply.send({
      wars: wars.map((war) => ({
        id: war.id,
        challenger: `[${war.challengerClan.tag}] ${war.challengerClan.name}`,
        defender: `[${war.defenderClan.tag}] ${war.defenderClan.name}`,
        status: war.status,
        teamSize: war.teamSize,
        stakeCoins: war.stakeCoins,
        challengerScore: war.challengerScore,
        defenderScore: war.defenderScore,
        payoutCoins: war.payoutCoins,
        memberCount: war._count.members,
        matchCount: war._count.matches,
        startsAt: war.startsAt,
        endsAt: war.endsAt,
        createdAt: war.createdAt,
      })),
      searches,
      total,
      page: currentPage,
      pages: Math.max(1, Math.ceil(total / take)),
    });
  });

  // ── Musiques ──────────────────────────────────────────────────────
  app.get("/api/admin/music", async (_req, reply) => {
    const music = getMusic();
    if (!music.initialized) saveMusic(music);
    return reply.send({ tracks: music.tracks });
  });

  app.post("/api/admin/music", async (req, reply) => {
    const body = req.body as { title?: string; url?: string; type?: string; mood?: string };
    if (!body.url) return reply.badRequest("url requis");
    if (!validPublicAudioUrl(body.url)) return reply.badRequest("URL audio publique HTTP(S) invalide");
    if (body.type && !["relaxing", "action"].includes(body.type)) return reply.badRequest("Type de piste invalide");
    const music = getMusic();
    if (music.tracks.length >= 100) return reply.badRequest("Limite de 100 pistes atteinte");
    const track: MusicTrack = {
      id: randomUUID(),
      title: (body.title || body.url).trim().slice(0, 120),
      url: body.url,
      type: body.type === "action" ? "action" : "relaxing",
      mood: (body.mood || (body.type === "action" ? "Action" : "Ambiance")).trim().slice(0, 40),
      active: true,
      createdAt: new Date().toISOString(),
    };
    music.tracks.push(track);
    saveMusic(music);
    return reply.status(201).send(track);
  });

  app.patch("/api/admin/music/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { title?: string; url?: string; type?: string; mood?: string; active?: boolean };
    if (body.url !== undefined && !validPublicAudioUrl(body.url)) return reply.badRequest("URL audio publique HTTP(S) invalide");
    if (body.type !== undefined && !["relaxing", "action"].includes(body.type)) return reply.badRequest("Type de piste invalide");
    const music = getMusic();
    const index = music.tracks.findIndex((track) => track.id === id);
    if (index < 0) return reply.notFound("Piste introuvable");
    const current = music.tracks[index]!;
    music.tracks[index] = {
      ...current,
      ...(body.title !== undefined ? { title: body.title.trim().slice(0, 120) || current.title } : {}),
      ...(body.url !== undefined ? { url: body.url } : {}),
      ...(body.type !== undefined ? { type: body.type as "relaxing" | "action" } : {}),
      ...(body.mood !== undefined ? { mood: body.mood.trim().slice(0, 40) || current.mood } : {}),
      ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
    };
    saveMusic(music);
    return reply.send({ track: music.tracks[index] });
  });

  app.delete("/api/admin/music/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const music = getMusic();
    const before = music.tracks.length;
    music.tracks = music.tracks.filter((t) => t.id !== id);
    if (music.tracks.length === before) return reply.notFound("Piste introuvable");
    saveMusic(music);
    return reply.send({ deleted: true });
  });
}
