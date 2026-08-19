import type { FastifyInstance } from "fastify";
import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";

/**
 * Avatar par défaut style anime, généré côté serveur à partir du pseudo
 * (DiceBear "adventurer", licence MIT/CC0). Volontairement PAS dans le
 * bundle front : la lib de génération pèse +110 kB gzip une fois
 * embarquée côté client, hors budget perf (DESIGN.md quizarena-v2).
 * Déterministe (même pseudo → même avatar) donc cache navigateur
 * immutable — un seul calcul par pseudo, jamais recalculé.
 */
const AVATAR_BG = ["382b1e", "4e3d2c", "241a12"];
const cache = new Map<string, string>();

export async function avatarRoutes(app: FastifyInstance) {
  app.get("/api/avatar/:seed", async (req, reply) => {
    const { seed } = req.params as { seed: string };
    let svg = cache.get(seed);
    if (!svg) {
      svg = createAvatar(adventurer, { seed, backgroundColor: AVATAR_BG, backgroundType: ["solid"] }).toString();
      cache.set(seed, svg);
    }
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    reply.type("image/svg+xml");
    return svg;
  });
}
