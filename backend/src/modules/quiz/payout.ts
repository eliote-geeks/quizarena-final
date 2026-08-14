// Règles de gain — copie exacte de frontend/src/pages/QuizPlay.jsx, pas
// une réinvention. Le serveur doit payer EXACTEMENT ce que l'écran promet
// au joueur avant qu'il ne mise, sinon le montant affiché est un mensonge.

export const QUESTIONS_PER_SESSION = 10;

// Indexé par nombre de bonnes réponses (0 à 10). < 1.0 = perte partielle,
// 0 = mise perdue, >= 1.0 = gain net.
export const PAYOUT_MULT = [0, 0, 0, 0, 0, 0.6, 0.85, 1.2, 1.6, 2.2, 3.0] as const;

export const LIBRE_POINTS_PER_CORRECT = 10;
export const DAILY_BONUS_COINS = 500;

export function challengePayout(stakeCoins: number, correctCount: number): number {
  const mult = PAYOUT_MULT[correctCount] ?? 0;
  return Math.round(stakeCoins * mult);
}

/** "win" au sens large du terme, utilisé pour l'ELO et les signaux
 * anti-triche — pas au sens strict du paiement Challenge. */
export function resultOf(correctCount: number): "win" | "draw" | "loss" {
  if (correctCount >= 7) return "win";
  if (correctCount >= 5) return "draw";
  return "loss";
}

// ────────────────────────────────────────────────────────────────────
// Duel — copie exacte de frontend/src/pages/DuelPlay.jsx finalizeResult().
// Le pot est 2×stake (une mise de chaque côté, déjà débitée au moment du
// lancement du duel — voir duel/engine.ts). Contrairement au Challenge,
// pas de table graduée : c'est juste qui a le plus de bonnes réponses.
// ────────────────────────────────────────────────────────────────────

export const DUEL_ROUND_SIZE = QUESTIONS_PER_SESSION; // même volume qu'un solo (10)
export const DUEL_WIN_HOUSE_CUT = 0.10; // le vainqueur reçoit 90% du pot
export const DUEL_DRAW_HOUSE_CUT = 0.05; // égalité : chacun récupère 95% de sa mise

/** Montant TOTAL crédité au vainqueur (le pot moins la commission). Net
 * pour lui = duelWinnerPayout(stake) - stake, soit +0.80×stake. */
export function duelWinnerPayout(stakeCoins: number): number {
  return Math.round(stakeCoins * 2 * (1 - DUEL_WIN_HOUSE_CUT));
}

/** Montant crédité à CHAQUE joueur en cas d'égalité (remboursement partiel). */
export function duelDrawPayout(stakeCoins: number): number {
  return Math.round(stakeCoins * (1 - DUEL_DRAW_HOUSE_CUT));
}

/** win/draw/loss du duel lui-même — comparaison directe des scores, pas
 * le seuil resultOf() (qui sert l'ELO solo). */
export function duelResultOf(myScore: number, oppScore: number): "win" | "draw" | "loss" {
  if (myScore > oppScore) return "win";
  if (myScore < oppScore) return "loss";
  return "draw";
}
