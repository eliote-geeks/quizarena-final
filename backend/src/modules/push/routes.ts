import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { vapidPublicKey } from "../../lib/push.js";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

export async function pushRoutes(app: FastifyInstance) {
  // Public : nécessaire pour construire l'abonnement côté client avant
  // même qu'il y ait quoi que ce soit à authentifier.
  app.get("/api/push/vapid-public-key", async (_req, reply) => {
    return reply.send({ publicKey: vapidPublicKey() });
  });

  app.post("/api/push/subscribe", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = subscribeSchema.parse(req.body);
    // upsert par endpoint : un même navigateur qui se réabonne (permission
    // retirée puis redonnée, par ex.) ne doit jamais créer de doublon, et
    // doit basculer sur le compte actuellement connecté si l'endpoint avait
    // été enregistré par un autre compte sur ce même appareil auparavant.
    await prisma.pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: { userId: req.user.userId, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
      update: { userId: req.user.userId, p256dh: body.keys.p256dh, auth: body.keys.auth },
    });
    return reply.send({ ok: true });
  });

  app.post("/api/push/unsubscribe", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { endpoint } = unsubscribeSchema.parse(req.body);
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.user.userId } });
    return reply.send({ ok: true });
  });
}
