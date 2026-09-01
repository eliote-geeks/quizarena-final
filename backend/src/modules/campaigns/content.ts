/**
 * Bibliothèque de messages pour les campagnes email/push automatiques
 * (§scheduler.ts). Chaque entrée est personnalisée à partir de vraies
 * données du compte (`ctx`) — jamais un chiffre ou une urgence inventée :
 * même contrainte que les tips d'interstitials.js et les cartes du lobby
 * (mémoire feedback_quizarena_anti_ai_design — "aucune promesse
 * commerciale, aucun chiffre décoratif" sur une appli d'argent réel).
 * Une entrée sans condition remplie n'est simplement pas éligible pour ce
 * joueur, plutôt que d'afficher un texte générique qui sonnerait faux.
 */

export type CampaignContext = {
  username: string;
  daysSinceActive: number | null; // null = jamais connecté après l'inscription
  balanceCoins: number;
  isVip: boolean;
  vipRemainingWins: number;
  duelsWon30d: number;
};

export type Campaign = {
  id: string;
  eligible: (ctx: CampaignContext) => boolean;
  subject: string;
  pushTitle: string;
  pushBody: (ctx: CampaignContext) => string;
  emailBody: (ctx: CampaignContext) => string;
};

export const CAMPAIGNS: Campaign[] = [
  {
    id: "winback",
    eligible: (ctx) => (ctx.daysSinceActive ?? 0) >= 3,
    subject: "On ne t'a pas vu depuis un moment",
    pushTitle: "Ça te dit un duel ?",
    pushBody: (ctx) => `Ça fait ${ctx.daysSinceActive} jours — un adversaire t'attend sur QuizArena.`,
    emailBody: (ctx) => `Salut ${ctx.username},<br/><br/>Ça fait ${ctx.daysSinceActive} jours qu'on ne t'a pas vu sur QuizArena. Un duel rapide, une partie solo, ou juste voir où en est le classement — reviens quand tu veux.`,
  },
  {
    id: "vip_progress",
    eligible: (ctx) => !ctx.isVip && ctx.vipRemainingWins > 0 && ctx.vipRemainingWins <= 20 && ctx.duelsWon30d > 0,
    subject: "Ton statut VIP se rapproche",
    pushTitle: "Plus que quelques victoires",
    pushBody: (ctx) => `${ctx.vipRemainingWins} victoire${ctx.vipRemainingWins > 1 ? "s" : ""} de duel avant ton statut VIP.`,
    emailBody: (ctx) => `Salut ${ctx.username},<br/><br/>Il te reste ${ctx.vipRemainingWins} victoire${ctx.vipRemainingWins > 1 ? "s" : ""} en duel ce mois-ci pour débloquer le statut VIP (création de tournois, badge visible sur ton profil).`,
  },
  {
    id: "wallet_idle",
    eligible: (ctx) => ctx.balanceCoins >= 200 && (ctx.daysSinceActive ?? 0) >= 2,
    subject: "Ton solde t'attend",
    pushTitle: "Solde disponible",
    pushBody: (ctx) => `Tu as ${ctx.balanceCoins.toLocaleString("fr-FR")} F disponibles sur QuizArena.`,
    emailBody: (ctx) => `Salut ${ctx.username},<br/><br/>Tu as actuellement ${ctx.balanceCoins.toLocaleString("fr-FR")} F sur ton portefeuille QuizArena — de quoi lancer un ou plusieurs duels.`,
  },
  {
    id: "tip_tiebreak",
    eligible: () => true, // évergreen — toujours vrai, jamais chiffré
    subject: "Le saviez-vous : les égalités en duel",
    pushTitle: "Astuce duel",
    pushBody: () => "À score égal en duel, c'est la rapidité de réponse totale qui départage. Réponds vite, pas seulement juste.",
    emailBody: () => "En duel en ligne, un score à égalité n'est jamais un vrai match nul : c'est le temps de réponse cumulé sur toute la partie qui décide. Répondre juste ne suffit pas toujours, la vitesse compte aussi.",
  },
  {
    id: "tip_tournament",
    eligible: () => true,
    subject: "Le saviez-vous : les tournois",
    pushTitle: "Astuce tournoi",
    pushBody: () => "Dans un tournoi, ta mise n'est débitée qu'une fois le bracket complet — jamais avant.",
    emailBody: () => "Petit rappel sur les tournois QuizArena : ta mise n'est débitée qu'une fois que le bracket a atteint sa capacité. S'il ne se remplit pas, tu es remboursé automatiquement.",
  },
];

export function pickCampaign(ctx: CampaignContext, excludeId: string | null): Campaign | null {
  const eligible = CAMPAIGNS.filter((c) => c.eligible(ctx) && c.id !== excludeId);
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)] ?? null;
}
