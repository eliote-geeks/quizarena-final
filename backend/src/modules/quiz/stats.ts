import { prisma } from "../../lib/prisma.js";
import { QUESTIONS_PER_SESSION } from "./questions.js";

/**
 * Recalcule PlayerStats après chaque partie (§5.1 du spec). Fait ici en
 * synchrone plutôt que dans une queue (BullMQ, §9.1) — correct à
 * l'échelle actuelle, à faire migrer en job asynchrone si le volume de
 * parties/seconde rend ce recalcul coûteux sur le chemin critique de
 * submit().
 */
export async function updatePlayerStats(userId: string) {
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [all, last7, last30, answers] = await Promise.all([
    prisma.quizSession.findMany({ where: { userId, status: "SUBMITTED" }, select: sel }),
    prisma.quizSession.findMany({ where: { userId, status: "SUBMITTED", startedAt: { gte: d7 } }, select: sel }),
    prisma.quizSession.findMany({ where: { userId, status: "SUBMITTED", startedAt: { gte: d30 } }, select: sel }),
    prisma.quizAnswer.findMany({
      where: { session: { userId, status: "SUBMITTED" } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { responseMs: true },
    }),
  ]);

  const isWin = (s: (typeof all)[number]) =>
    s.mode === "CHALLENGE" ? (s.scoreServer ?? 0) >= (s.targetScore ?? Infinity) : (s.scoreServer ?? 0) >= Math.ceil(QUESTIONS_PER_SESSION / 2);

  const winRate = (arr: typeof all) => (arr.length ? arr.filter(isWin).length / arr.length : 0);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const responseTimes = answers.map((a) => a.responseMs);
  const fastRate = responseTimes.length ? responseTimes.filter((t) => t < 1500).length / responseTimes.length : 0;
  const timingVariance = responseTimes.length > 1 ? stddev(responseTimes) : 0;

  const flagsCount = await prisma.flag.count({ where: { userId } });
  const lastFlag = await prisma.flag.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });

  const suspicionAvg = avg(all.slice(0, 30).map((s) => s.suspicionScore ?? 0));

  await prisma.playerStats.upsert({
    where: { userId },
    create: {
      userId,
      totalGames: all.length,
      winRateGlobal: winRate(all),
      avgScore: avg(all.map((s) => s.scoreServer ?? 0)),
      avgResponseMs: avg(responseTimes),
      games7d: last7.length,
      winRate7d: winRate(last7),
      games30d: last30.length,
      winRate30d: winRate(last30),
      avgScore30d: avg(last30.map((s) => s.scoreServer ?? 0)),
      avgTabSwitches: avg(all.map((s) => s.tabSwitches)),
      fastAnswerRate: fastRate,
      timingVariance,
      suspicionScoreAvg: suspicionAvg,
      flagsCount,
      lastFlagAt: lastFlag?.createdAt,
    },
    update: {
      totalGames: all.length,
      winRateGlobal: winRate(all),
      avgScore: avg(all.map((s) => s.scoreServer ?? 0)),
      avgResponseMs: avg(responseTimes),
      games7d: last7.length,
      winRate7d: winRate(last7),
      games30d: last30.length,
      winRate30d: winRate(last30),
      avgScore30d: avg(last30.map((s) => s.scoreServer ?? 0)),
      avgTabSwitches: avg(all.map((s) => s.tabSwitches)),
      fastAnswerRate: fastRate,
      timingVariance,
      suspicionScoreAvg: suspicionAvg,
      flagsCount,
      lastFlagAt: lastFlag?.createdAt,
    },
  });

  // RISK_SCORE global (§6.2) — recalculé et posé sur User.riskScore pour
  // que les checks de compte (cap de mise, blocage duel) restent une
  // simple lecture, pas un recalcul à chaque requête.
  const riskScore = Math.min(
    100,
    flagsCount * 10 +
      Math.max(0, ((winRate(last30) - 0.65) / 0.35) * 30) +
      Math.max(0, ((avg(last30.map((s) => s.scoreServer ?? 0)) - QUESTIONS_PER_SESSION * 0.7) / (QUESTIONS_PER_SESSION * 0.3)) * 20) +
      Math.max(0, (1 - timingVariance / 3000) * 20) +
      (avg(all.map((s) => s.tabSwitches)) > 1 ? 10 : 0) +
      (fastRate > 0.6 ? 15 : 0)
  );
  await prisma.user.update({ where: { id: userId }, data: { riskScore } });
}

const sel = { mode: true, scoreServer: true, targetScore: true, tabSwitches: true, suspicionScore: true } as const;

function stddev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}
