import { prisma } from "../../lib/prisma.js";

export const QUESTIONS_PER_SESSION = 7;
export const TIME_PER_QUESTION_MS = 10_000; // aligné sur le front (Duel.jsx ROUND_MS)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sélectionne N questions actives d'une catégorie, en excluant si
 * possible celles déjà vues par ce joueur dans les 7 derniers jours
 * (évite le par-cœur de session en session). Si le stock restant est
 * insuffisant, complète avec le reste de la catégorie.
 */
export async function pickQuestions(categoryId: string, userId: string, count = QUESTIONS_PER_SESSION) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentlySeen = await prisma.quizAnswer.findMany({
    where: { session: { userId, categoryId, startedAt: { gte: sevenDaysAgo } } },
    select: { questionId: true },
    distinct: ["questionId"],
  });
  const seenIds = new Set(recentlySeen.map((r) => r.questionId));

  const pool = await prisma.question.findMany({ where: { categoryId, active: true } });
  if (pool.length === 0) throw new Error(`Aucune question active pour la catégorie "${categoryId}"`);

  const fresh = pool.filter((q) => !seenIds.has(q.id));
  const source = fresh.length >= count ? fresh : pool;

  return shuffle(source).slice(0, Math.min(count, source.length));
}

/**
 * Génère, pour chaque question, une permutation des 4 options.
 * `permutation[shuffledPosition] = canonicalIndex` — c'est ce qui permet
 * à submit() de retrouver la bonne réponse sans jamais avoir envoyé
 * l'index canonique au client (§3.4 du spec anti-triche).
 */
export function shuffledOptions(options: unknown): { text: string[]; permutation: number[] } {
  const opts = options as string[];
  const permutation = shuffle(opts.map((_, i) => i));
  return { text: permutation.map((i) => opts[i]!), permutation };
}
