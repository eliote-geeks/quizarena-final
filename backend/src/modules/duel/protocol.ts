// Protocole WebSocket du duel — un seul canal (/ws/duel), messages JSON
// typés des deux côtés. Le client n'envoie jamais de score ni de timing :
// le serveur calcule tout lui-même à partir de l'horodatage d'envoi de
// la question (§ANTICHEAT_SPEC.md §3.1 : le score client n'est jamais
// une source de vérité — ici on va plus loin que le solo en ne lui
// laissant même pas déclarer un responseMs).

import { z } from "zod";

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("queue"),
    categoryId: z.string().min(1),
    stakeCoins: z.number().int().min(100).max(50_000),
  }),
  z.object({ type: z.literal("cancel_queue") }),
  z.object({
    type: z.literal("answer"),
    questionId: z.string().min(1),
    chosenIndex: z.number().int().min(0).max(3),
  }),
  z.object({ type: z.literal("ping") }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
