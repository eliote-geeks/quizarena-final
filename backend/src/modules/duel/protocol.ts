// Protocole WebSocket du duel — un seul canal (/ws/duel), messages JSON
// typés des deux côtés. Le client n'envoie jamais de score ni de timing :
// le serveur calcule tout lui-même à partir de l'horodatage d'envoi de
// la question (§ANTICHEAT_SPEC.md §3.1 : le score client n'est jamais
// une source de vérité — ici on va plus loin que le solo en ne lui
// laissant même pas déclarer un responseMs).

import { z } from "zod";

export const clientMessageSchema = z.discriminatedUnion("type", [
  // Contre un vrai adversaire (queue publique ou invitation) : plus de
  // catégorie à choisir, les questions viennent mélangées de tout le
  // bank (§duel/questions.ts pickQuestions(null, ...)) — seul le mode
  // "contre l'ordinateur" garde un thème choisi à l'avance.
  z.object({
    type: z.literal("queue"),
    stakeCoins: z.number().int().min(100).max(50_000),
  }),
  z.object({
    type: z.literal("bot_duel"),
    categoryId: z.string().min(1),
    stakeCoins: z.number().int().min(100).max(50_000),
    difficulty: z.enum(["facile", "moyen", "difficile"]),
  }),
  z.object({ type: z.literal("cancel_queue") }),
  z.object({
    type: z.literal("create_invite"),
    stakeCoins: z.number().int().min(100).max(50_000),
    // Un duel ouvert (19/08) est un lien d'invitation normal, en plus
    // listé publiquement (§GET /api/duel/open) — n'importe qui peut le
    // rejoindre sans code, pas seulement la personne à qui le lien a été
    // envoyé.
    isPublic: z.boolean().optional(),
    targetUsername: z.string().min(2).max(30).optional(),
  }),
  z.object({ type: z.literal("join_invite"), code: z.string().min(4).max(12) }),
  z.object({ type: z.literal("decline_invite"), code: z.string().min(4).max(12) }),
  z.object({ type: z.literal("cancel_invite") }),
  // Rejoint son match de tournoi (bracket déjà généré côté REST, §tournament/) —
  // pas de mise à envoyer, elle a déjà été débitée à l'inscription.
  z.object({ type: z.literal("tournament_enter"), tournamentMatchId: z.string().min(1) }),
  z.object({ type: z.literal("clan_war_enter"), clanWarMatchId: z.string().min(1) }),
  z.object({ type: z.literal("spectate"), matchId: z.string().uuid() }),
  z.object({ type: z.literal("leave_spectate"), matchId: z.string().uuid().optional() }),
  z.object({
    type: z.literal("answer"),
    questionId: z.string().min(1),
    chosenIndex: z.number().int().min(0).max(3),
  }),
  // Départ volontaire en cours de duel : défaite immédiate, pas d'attente
  // du délai de grâce réservé aux coupures réseau accidentelles.
  z.object({ type: z.literal("forfeit") }),
  // Phase "Prêt" : les deux joueurs confirment leur présence avant le countdown.
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("tab_hidden") }),  // anti-triche : onglet mis en arrière-plan
  z.object({ type: z.literal("tab_visible") }), // retour dans les 3 s → grâce annulée
  z.object({ type: z.literal("ping") }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
