import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const SETTINGS_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../../settings.json");
function getSettings() {
  if (!existsSync(SETTINGS_PATH)) return {};
  try { return JSON.parse(readFileSync(SETTINGS_PATH, "utf8")); } catch { return {}; }
}

const MUSIC_PATH = join(dirname(fileURLToPath(import.meta.url)), "../../../../music.json");
const BUILTIN_MUSIC = [
  { id: "builtin-ambient-1", title: "Ambiment — Kevin MacLeod", url: "/audio/ambient-1.mp3", type: "relaxing", mood: "Ambiance", active: true, builtin: true },
  { id: "builtin-ambient-2", title: "Airport Lounge — Kevin MacLeod", url: "/audio/ambient-2.mp3", type: "relaxing", mood: "Ambiance", active: true, builtin: true },
  { id: "builtin-ambient-3", title: "At Rest — Kevin MacLeod", url: "/audio/ambient-3.mp3", type: "relaxing", mood: "Détente", active: true, builtin: true },
  { id: "builtin-ambient-4", title: "Bathed in the Light — Kevin MacLeod", url: "/audio/ambient-4.mp3", type: "relaxing", mood: "Détente", active: true, builtin: true },
  { id: "builtin-war-1", title: "Five Armies — Kevin MacLeod", url: "/audio/theme-five-armies.mp3", type: "action", mood: "Guerre", active: true, builtin: true },
  { id: "builtin-war-2", title: "Heroic Age — Kevin MacLeod", url: "/audio/theme-heroic-age.mp3", type: "action", mood: "Épique", active: true, builtin: true },
  { id: "builtin-anime-1", title: "Pixelland — Kevin MacLeod", url: "/audio/theme-pixelland.mp3", type: "action", mood: "Anime & gaming", active: true, builtin: true },
  { id: "builtin-relax-1", title: "Carefree — Kevin MacLeod", url: "/audio/theme-carefree.mp3", type: "relaxing", mood: "Détente", active: true, builtin: true },
  { id: "builtin-ambient-5", title: "Floating Cities — Kevin MacLeod", url: "/audio/theme-floating-cities.mp3", type: "relaxing", mood: "Ambiance", active: true, builtin: true },
  { id: "builtin-world-1", title: "Desert City — Kevin MacLeod", url: "/audio/theme-desert-city.mp3", type: "relaxing", mood: "Monde", active: true, builtin: true },
  { id: "builtin-game-1", title: "Townie Loop — Kevin MacLeod", url: "/audio/theme-townie-loop.mp3", type: "relaxing", mood: "Anime & gaming", active: true, builtin: true },
];
function getMusicPublic() {
  if (!existsSync(MUSIC_PATH)) return { tracks: BUILTIN_MUSIC };
  try {
    const parsed = JSON.parse(readFileSync(MUSIC_PATH, "utf8"));
    if (parsed.version !== 2) {
      const previous = Array.isArray(parsed.tracks) ? parsed.tracks : [];
      const previousIds = new Set(previous.map((track: any) => track.id));
      const defaults = new Map(BUILTIN_MUSIC.map((track) => [track.id, track]));
      const migrated = previous.map((track: any) => ({ ...(defaults.get(track.id) ?? {}), ...track }));
      return { tracks: [...migrated, ...BUILTIN_MUSIC.filter((track) => !previousIds.has(track.id))].filter((track: any) => track.active !== false) };
    }
    return { tracks: (parsed.tracks ?? []).filter((track: any) => track.active !== false) };
  } catch { return { tracks: BUILTIN_MUSIC }; }
}

/** Chiffres publics pour la landing page (avant connexion) — plus jamais
 * de nombres inventés. Tout vient de la base, exclut les comptes bots
 * (§duel/bot.ts) qui ne doivent jamais apparaître comme de vrais joueurs. */
export async function publicRoutes(app: FastifyInstance) {
  app.get("/api/public/stats", async (_req, reply) => {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [categoriesCount, activePlayers7d, duelsToday, payoutsWeek] = await Promise.all([
      prisma.category.count(),
      prisma.user.count({
        where: { isBot: false, transactions: { some: { createdAt: { gte: since7d } } } },
      }),
      prisma.duelMatch.count({ where: { startedAt: { gte: startOfDay } } }),
      prisma.transaction.aggregate({
        where: { type: "PAYOUT", status: "COMPLETED", createdAt: { gte: since7d } },
        _sum: { amountCoins: true },
      }),
    ]);

    return reply.send({
      categoriesCount,
      activePlayers7d,
      duelsToday,
      payoutsWeekCoins: payoutsWeek._sum.amountCoins ?? 0,
    });
  });

  // Endpoint public consulté par le frontend au chargement
  app.get("/api/public/maintenance", async (_req, reply) => {
    const s = getSettings();
    return reply.send({
      maintenance: s.maintenance ?? false,
      message: s.maintenanceMessage ?? "Le site est temporairement en maintenance. Revenez bientôt !",
    });
  });

  app.get("/api/public/leaderboard", async (_req, reply) => {
    const grouped = await prisma.transaction.groupBy({
      by: ["userId"],
      where: { type: "PAYOUT", status: "COMPLETED" },
      _sum: { amountCoins: true },
      orderBy: { _sum: { amountCoins: "desc" } },
      take: 5,
    });

    const users = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) }, accountStatus: { in: ["ACTIVE", "WATCHED"] }, isBot: false },
      select: { id: true, username: true, region: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const leaderboard = grouped
      .filter((g) => byId.has(g.userId))
      .map((g, i) => ({
        rank: i + 1,
        username: byId.get(g.userId)!.username,
        region: byId.get(g.userId)!.region,
        winningsCoins: g._sum.amountCoins ?? 0,
      }));

    return reply.send({ leaderboard });
  });

  // Pistes musicales actives pour le frontend
  app.get("/api/public/music", async (_req, reply) => {
    return reply.send(getMusicPublic());
  });
}
