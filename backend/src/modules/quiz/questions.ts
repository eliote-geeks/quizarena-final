import { prisma } from "../../lib/prisma.js";
import { QUESTIONS_PER_SESSION } from "./payout.js";

export { QUESTIONS_PER_SESSION };
export const TIME_PER_QUESTION_MS = 8_000; // aligné sur QuizPlay.jsx / DuelPlay.jsx TIME_PER_Q = 8

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!]; // i, j toujours < a.length par construction
  }
  return a;
}

/**
 * Sélectionne N questions actives, en excluant si possible celles déjà
 * vues par ce joueur dans les 7 derniers jours (évite le par-cœur de
 * session en session). Si le stock restant est insuffisant, complète
 * avec le reste du pool.
 *
 * `categoryId = null` => pool mélangé sur TOUTES les catégories — c'est
 * le mode des duels contre un vrai adversaire (le thème n'a plus de
 * sens à choisir à l'avance vu que l'adversaire aussi doit être
 * d'accord ; seul le mode solo et le mode "contre l'ordinateur" gardent
 * un choix de catégorie explicite).
 */
export async function pickQuestions(categoryId: string | null, userId: string, count = QUESTIONS_PER_SESSION) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentlySeen = await prisma.quizAnswer.findMany({
    where: { session: { userId, ...(categoryId ? { categoryId } : {}), startedAt: { gte: sevenDaysAgo } } },
    select: { questionId: true },
    distinct: ["questionId"],
  });
  const seenIds = new Set(recentlySeen.map((r) => r.questionId));

  const pool = await prisma.question.findMany({ where: { active: true, ...(categoryId ? { categoryId } : {}) } });
  if (pool.length < count) {
    // Une partie plus courte que prévu casserait le barème de paiement
    // (PAYOUT_MULT est indexé 0-10, pensé pour exactement
    // QUESTIONS_PER_SESSION questions) — mieux vaut refuser que de
    // lancer une session au barème faussé. En pratique ne devrait
    // jamais arriver pour du PvP mélangé (445+ questions au total) ;
    // pour une catégorie précise, §GET /api/categories filtre déjà les
    // catégories trop courtes avant qu'un joueur puisse les choisir.
    throw new Error(
      categoryId
        ? `Pas assez de questions actives pour la catégorie "${categoryId}" (${pool.length}/${count})`
        : `Pas assez de questions actives (${pool.length}/${count})`
    );
  }

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
