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
function getMusicPublic() {
  if (!existsSync(MUSIC_PATH)) return { tracks: [] };
  try { return JSON.parse(readFileSync(MUSIC_PATH, "utf8")); } catch { return { tracks: [] }; }
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
