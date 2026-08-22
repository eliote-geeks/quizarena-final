import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";

const MUSIC_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../../music.json");
type MusicTrack = { id: string; title: string; url: string; type: "relaxing" | "action"; mood?: string; active: boolean; createdAt: string; builtin?: boolean };
type MusicConfig = { version: number; initialized: boolean; tracks: MusicTrack[] };
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

  app.post("/api/admin/questions/:id/activate", async (req, reply) => {
    const { id } = req.params as { id: string };
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

  async function runOllamaGeneration(categoryId: string, count: number, categoryName: string) {
    for (let i = 0; i < count; i++) {
      const prompt = `Crée une question de quiz en français sur "${categoryName}".
Réponds UNIQUEMENT avec cet objet JSON (rien d'autre) :
{"question":"La question ?","options":["A","B","C","D"],"answer":0}
answer = index 0-3 de la bonne réponse. Le fait doit être largement connu et vérifiable.
Évite les dates, mesures, records et formulations ambiguës. Une seule option doit être correcte.
Ne donne jamais la réponse dans le texte de la question.`;

      try {
        const ollamaRes = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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

        if (!textFr || textFr.length < 10) continue;
        if (opts.length !== 4) continue;
        if (opts.some((o: string) => !o || o.length < 2)) continue;
        if (new Set(opts.map((o: string) => o.trim().toLocaleLowerCase("fr"))).size !== 4) continue;
        if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) continue;
        const correctOption = opts[answerIndex];
        if (!correctOption) continue;
        const correct = correctOption.trim().toLocaleLowerCase("fr");
        if (correct.length > 3 && textFr.toLocaleLowerCase("fr").includes(correct)) continue;
        if (/\b(19|20)\d{2}\b|\b\d+(?:[.,]\d+)?\s*(?:km|m|cm|kg|%|ans?)\b/i.test(`${textFr} ${correctOption}`)) continue;

        // Doublon ?
        const dupe = await prisma.question.findFirst({
          where: { categoryId, textFr: { equals: textFr, mode: "insensitive" } },
        });
        if (dupe) continue;

        await prisma.question.create({
          data: { categoryId, textFr, textEn: textFr, options: opts, answerIndex, active: false, source: "admin_ai" },
        });
      } catch {
        // Timeout ou autre erreur : passer à la question suivante
      }
    }
    _genLocked = false;
  }

  app.post("/api/admin/questions/generate", async (req, reply) => {
    const { categoryId, count = 5 } = req.body as { categoryId: string; count?: number };
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

    // Lance la génération en arrière-plan — ne pas await
    runOllamaGeneration(categoryId, safeCount, (category as any).nameFr).catch(() => { _genLocked = false; });

    return reply.code(202).send({
      status: "queued",
      count: safeCount,
      message: `Génération de ${safeCount} question(s) lancée en arrière-plan. Rafraîchissez la liste "En attente" dans quelques minutes (environ ${safeCount * 3} min sur ce serveur).`,
    });
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
    const tx = await prisma.transaction.create({
      data: {
        userId: id,
        type: "BONUS",
        amountCoins: Math.round(amount),
        status: "COMPLETED",
        metadata: { reason: reason ?? "admin_credit", by: (req as any).user?.userId },
      },
    });
    return reply.send({ transaction: tx });
  });

  app.post("/api/admin/users/:id/debit", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { amount, reason } = req.body as { amount: number; reason?: string };
    if (!amount || amount <= 0) return reply.badRequest("Montant invalide");
    const bal = await prisma.transaction.aggregate({
      where: { userId: id, status: "COMPLETED" },
      _sum: { amountCoins: true },
    });
    if ((bal._sum.amountCoins ?? 0) < amount) return reply.badRequest("Solde insuffisant");
    const tx = await prisma.transaction.create({
      data: {
        userId: id,
        type: "BONUS",
        amountCoins: -Math.round(amount),
        status: "COMPLETED",
        metadata: { reason: reason ?? "admin_debit", by: (req as any).user?.userId },
      },
    });
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
  // Stockage simple en DB : on utilise un user fictif "settings" ou
  // un champ metadata sur un enregistrement existant. Par simplicité,
  // on stocke dans un fichier JSON sur le serveur (hors Prisma).
  const SETTINGS_PATH = new URL("../../../../settings.json", import.meta.url).pathname;
  const { readFileSync, writeFileSync, existsSync } = await import("fs");

  function loadSettings() {
    if (!existsSync(SETTINGS_PATH)) return { blockDeposits: false, blockWithdrawals: false };
    try { return JSON.parse(readFileSync(SETTINGS_PATH, "utf8")); } catch { return { blockDeposits: false, blockWithdrawals: false }; }
  }

  app.get("/api/admin/settings", async (_req, reply) => {
    return reply.send(loadSettings());
  });

  app.patch("/api/admin/settings", async (req, reply) => {
    const body = req.body as { blockDeposits?: boolean; blockWithdrawals?: boolean; maintenance?: boolean; maintenanceMessage?: string };
    const current = loadSettings();
    const next = { ...current, ...body };
    writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2));
    return reply.send(next);
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
        participants: (t.entries as any[]).map((e: any) => e.user?.username ?? "?"),
      })),
      total,
      page: parseInt(page),
      pages: Math.ceil(total / take),
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
