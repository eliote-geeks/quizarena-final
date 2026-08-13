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
