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

export const BOT_PARAMS: Record<BotDifficulty, { accuracy: number; minMs: number; maxMs: number; username: string }> = {
  facile: { accuracy: 0.35, minMs: 3500, maxMs: 7000, username: "Ordinateur · Facile" },
  moyen: { accuracy: 0.6, minMs: 2500, maxMs: 5500, username: "Ordinateur · Moyen" },
  difficile: { accuracy: 0.85, minMs: 1000, maxMs: 3500, username: "Ordinateur · Difficile" },
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
