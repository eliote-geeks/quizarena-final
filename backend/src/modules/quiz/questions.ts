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
 * Sélectionne N questions actives jamais servies aux joueurs concernés.
 * L'exposition est écrite dès le lancement, pas à la soumission : quitter
 * une manche ne permet donc pas de forcer une répétition.
 *
 * `categoryId = null` => pool mélangé sur TOUTES les catégories — c'est
 * le mode des duels contre un vrai adversaire (le thème n'a plus de
 * sens à choisir à l'avance vu que l'adversaire aussi doit être
 * d'accord ; seul le mode solo et le mode "contre l'ordinateur" gardent
 * un choix de catégorie explicite).
 */
export async function pickQuestions(categoryId: string | null, playerIds: string | string[], count = QUESTIONS_PER_SESSION) {
  const userIds = [...new Set(Array.isArray(playerIds) ? playerIds : [playerIds])];
  const exposures = await prisma.questionExposure.findMany({
    where: { userId: { in: userIds }, ...(categoryId ? { question: { categoryId } } : {}) },
    select: { questionId: true },
  });
  const seenIds = new Set(exposures.map((r) => r.questionId));

  const pool = await prisma.question.findMany({
    where: { active: true, ...(categoryId ? { categoryId } : {}), OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
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
  if (fresh.length < count) {
    throw new Error(categoryId
      ? `Nouvelles questions insuffisantes pour la catégorie "${categoryId}" (${fresh.length}/${count})`
      : `Nouvelles questions insuffisantes (${fresh.length}/${count})`);
  }
  // Un quiz de 10 manches doit contenir au moins trois questions illustrées
  // quand la banque concernée le permet. La sélection reste aléatoire, mais
  // évite les séries 100 % texte qui fatiguent et donnent une impression de
  // répétition. Si une catégorie n'a pas encore assez de médias validés, le
  // jeu reste jouable : la couverture est suivie par le dashboard éditorial.
  const imageTarget = Math.ceil(count * 0.3);
  const illustrated = shuffle(fresh.filter((question) => Boolean(question.mediaUrl)));
  const selectedImages = illustrated.slice(0, Math.min(imageTarget, illustrated.length));
  const imageIds = new Set(selectedImages.map((question) => question.id));
  const remaining = shuffle(fresh.filter((question) => !imageIds.has(question.id))).slice(0, count - selectedImages.length);
  const selected = shuffle([...selectedImages, ...remaining]);
  await prisma.questionExposure.createMany({
    data: userIds.flatMap((userId) => selected.map((question) => ({ userId, questionId: question.id }))),
    skipDuplicates: true,
  });
  return selected;
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
