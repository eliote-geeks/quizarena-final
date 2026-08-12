// Implémentation de ANTICHEAT_SPEC.md §3 et §4 — Phase 1 du roadmap
// (§10) : R01, R02, R03. Les règles R04-R08 (multi-compte/IP, dérive
// ELO, collusion, abandon sélectif) demandent respectivement un
// fingerprint device, l'historique ELO et le moteur de duel temps réel
// — elles arrivent avec ces briques (voir README « Prochaines phases »).

import { prisma } from "../../lib/prisma.js";

export type AnswerInput = { questionId: string; chosenIndex: number; responseMs: number };

export type SubmitVerdict = {
  scoreServer: number;
  correctness: boolean[];
  suspicionScore: number;
  flags: string[];
  action: "credit" | "quarantine_soft" | "quarantine_hard";
};

const FAST_ANSWER_MS = 1500;
const IMPOSSIBLE_ANSWER_MS = 250; // en-dessous : humainement impossible de lire + décider

function stddev(values: number[]): number {
  if (values.length < 2) return Infinity; // pas assez de données = pas de conclusion "trop régulier"
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Score de suspicion d'UNE partie (§4.1). Ne regarde que les signaux
 * disponibles à la soumission — pas encore l'historique du joueur
 * (ça, c'est `applyHistoricalSignals`, séparé pour rester testable).
 */
export function scoreSession(input: {
  totalQuestions: number;
  correctCount: number;
  responseTimings: number[]; // ms, une par question
  tabSwitches: number;
  totalDurationMs: number;
}): { score: number; flags: string[] } {
  let score = 0;
  const flags: string[] = [];
  const { totalQuestions, correctCount, responseTimings, tabSwitches, totalDurationMs } = input;

  // Changements d'onglet
  const tabPenalty = Math.min(45, tabSwitches * 15);
  if (tabPenalty > 0) score += tabPenalty;

  // Vitesse de réponse anormale
  const fastCount = responseTimings.filter((t) => t < FAST_ANSWER_MS).length;
  const fastAnswerRate = totalQuestions > 0 ? fastCount / totalQuestions : 0;
  if (fastAnswerRate > 0.8) {
    score += 30;
    flags.push("FAST_ANSWER_RATE_HIGH");
  } else if (fastAnswerRate > 0.6) {
    score += 15;
  }

  // Réponses physiologiquement impossibles (lecture + décision < 250ms)
  const impossibleCount = responseTimings.filter((t) => t < IMPOSSIBLE_ANSWER_MS).length;
  if (impossibleCount > 0) {
    score += 25;
    flags.push("IMPOSSIBLE_RESPONSE_TIME");
  }

  // Score parfait ou quasi-parfait
  if (correctCount === totalQuestions) {
    score += 20;
  } else if (correctCount === totalQuestions - 1) {
    score += 10;
  }

  // Timing trop régulier (signature de bot/script)
  const sd = stddev(responseTimings);
  if (sd < 300) {
    score += 25;
    flags.push("TIMING_TOO_UNIFORM");
  }

  // Combinaison score élevé + vitesse anormale
  if (correctCount >= totalQuestions - 1 && fastAnswerRate > 0.7) {
    score += 20;
    flags.push("PERFECT_AND_FAST");
  }

  // Validation temporelle globale (§3.2)
  const expectedMs = totalQuestions * 10_000;
  if (totalDurationMs < expectedMs * 0.4) {
    score += 25;
    flags.push("SESSION_TOO_SHORT");
  }

  if (tabPenalty > 0) flags.push("TAB_SWITCH");

  return { score: Math.min(100, score), flags };
}

/**
 * R01 (bot speed) et R02 (win rate anormal) — regardent l'historique.
 * Appelé après avoir calculé le score de la partie en cours.
 */
export async function applyHistoricalSignals(
  userId: string,
  base: { score: number; flags: string[] },
  mode: "LIBRE" | "CHALLENGE"
): Promise<{ score: number; flags: string[] }> {
  let score = base.score;
  const flags = [...base.flags];

  const totalGames = await prisma.quizSession.count({ where: { userId, status: "SUBMITTED" } });

  if (totalGames > 5) {
    const recent = await prisma.quizAnswer.findMany({
      where: { session: { userId, status: "SUBMITTED" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { responseMs: true },
    });
    if (recent.length > 0) {
      const avg = recent.reduce((a, b) => a + b.responseMs, 0) / recent.length;
      if (avg < 1500) {
        score += 20;
        flags.push("RESPONSE_TOO_FAST"); // R01
      }
    }
  }

  if (mode === "CHALLENGE") {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentChallenges = await prisma.quizSession.findMany({
      where: { userId, mode: "CHALLENGE", status: "SUBMITTED", startedAt: { gte: thirtyDaysAgo } },
      select: { scoreServer: true, targetScore: true },
    });
    if (recentChallenges.length > 10) {
      const wins = recentChallenges.filter((s) => (s.scoreServer ?? 0) >= (s.targetScore ?? Infinity)).length;
      const winRate = wins / recentChallenges.length;
      if (winRate > 0.85) {
        score += 15;
        flags.push("ABNORMAL_WIN_RATE"); // R02
      }
    }

    // R03 — 3 scores parfaits consécutifs en Challenge
    const lastThree = await prisma.quizSession.findMany({
      where: { userId, mode: "CHALLENGE", status: "SUBMITTED" },
      orderBy: { startedAt: "desc" },
      take: 2, // + la partie en cours = 3
      select: { scoreServer: true },
    });
    const currentIsPerfect = flags.includes("PERFECT_AND_FAST") || base.score >= 20; // approximation locale
    if (lastThree.length === 2 && lastThree.every((s) => s.scoreServer === QUESTIONS_PER_SESSION_HINT)) {
      if (currentIsPerfect) {
        score += 20;
        flags.push("REPEATED_PERFECT_SCORE"); // R03
      }
    }
  }

  return { score: Math.min(100, score), flags };
}

// Évite une dépendance circulaire avec questions.ts pour une seule constante.
const QUESTIONS_PER_SESSION_HINT = 7;

export function actionForScore(score: number): SubmitVerdict["action"] {
  if (score >= 70) return "quarantine_hard"; // §4.2 : gains en quarantaine 24h, alerte admin
  if (score >= 50) return "quarantine_soft"; // §4.2 : révision manuelle déclenchée
  return "credit"; // 0-49 : normal ou surveillance passive silencieuse
}
