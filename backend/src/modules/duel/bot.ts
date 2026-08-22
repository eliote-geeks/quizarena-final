// Mode "contre l'ordinateur" — réutilise entièrement le moteur de duel
// PvP (même Match, même flux question/reveal/finalize) : l'adversaire
// est juste un MatchPlayer sans vraie socket (`send: null`, déjà géré
// partout par `p.send?.(...)` qui ne fait rien si `send` est null),
// dont les réponses sont décidées par un minuteur au lieu d'un message
// "answer" reçu du client.
//
// Chaque niveau est un vrai compte User seedé une fois au démarrage
// (isBot: true) — nécessaire car DuelMatch.playerBId est une vraie
// clé étrangère vers User. Jamais crédité, jamais classé (routes.ts
// filtre isBot: false sur le classement).

import { prisma } from "../../lib/prisma.js";

export type BotDifficulty = "facile" | "moyen" | "difficile";

// Difficultés calibrées pour être battables par un joueur attentif :
// - facile : répond lentement, se trompe souvent (3/10 en moyenne)
// - moyen  : 50/50, un joueur concentré gagne s'il maîtrise le sujet
// - difficile : 7/10 en moyenne — exige un bon niveau, pas imbattable
export const BOT_PARAMS: Record<BotDifficulty, { accuracy: number; minMs: number; maxMs: number; username: string; payoutMultiplier: number }> = {
  facile:    { accuracy: 0.28, minMs: 4500, maxMs: 7500, username: "Ordinateur · Facile", payoutMultiplier: 1.20 },
  moyen:     { accuracy: 0.50, minMs: 3000, maxMs: 6000, username: "Ordinateur · Moyen", payoutMultiplier: 1.50 },
  difficile: { accuracy: 0.68, minMs: 1500, maxMs: 4000, username: "Ordinateur · Difficile", payoutMultiplier: 2.00 },
};

const BOT_PHONES: Record<BotDifficulty, string> = {
  facile: "000000000001",
  moyen: "000000000002",
  difficile: "000000000003",
};

let botIds: Record<BotDifficulty, string> | null = null;

/** Idempotent — appelé une fois au démarrage du serveur (server.ts).
 * Crée les 3 comptes bot s'ils n'existent pas encore, sinon les
 * retrouve. Jamais de mot de passe utilisable (hash bidon, compte non
 * connectable via /api/auth/login puisqu'aucun mot de passe ne peut le
 * matcher). */
export async function ensureBotUsers(): Promise<void> {
  const ids = {} as Record<BotDifficulty, string>;
  for (const [difficulty, params] of Object.entries(BOT_PARAMS) as [BotDifficulty, (typeof BOT_PARAMS)[BotDifficulty]][]) {
    const user = await prisma.user.upsert({
      where: { phone: BOT_PHONES[difficulty] },
      update: {},
      create: {
        username: `bot_${difficulty}`,
        phone: BOT_PHONES[difficulty],
        passwordHash: "!", // aucun hash bcrypt ne peut matcher "!" — compte non connectable
        isBot: true,
        eloRating: 1000,
      },
    });
    ids[difficulty] = user.id;
  }
  botIds = ids;
}

export function getBotUserId(difficulty: BotDifficulty): string {
  if (!botIds) throw new Error("ensureBotUsers() n'a pas encore tourné");
  return botIds[difficulty];
}

export function botUsername(difficulty: BotDifficulty): string {
  return BOT_PARAMS[difficulty].username;
}

export function botWinnerPayout(stakeCoins: number, difficulty: BotDifficulty): number {
  if (!Number.isInteger(stakeCoins) || stakeCoins < 0) throw new Error("Mise IA invalide");
  return Math.round(stakeCoins * BOT_PARAMS[difficulty].payoutMultiplier);
}
