import type { FastifyInstance } from "fastify";
/**
 * Point de compatibilité pour les anciennes URL d'avatar. La collection
 * Lorelei fournit ici un portrait manga raster (PNG), jamais du SVG.
 */

export async function avatarRoutes(app: FastifyInstance) {
  app.get("/api/avatar/:seed", async (req, reply) => {
    const { seed } = req.params as { seed: string };
    const portrait = `https://api.dicebear.com/9.x/lorelei/png?seed=${encodeURIComponent(seed)}&size=256&backgroundColor=382b1e,4a3827,21170f`;
    return reply.redirect(portrait, 302);
  });
}
