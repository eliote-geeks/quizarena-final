import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { env } from "../../lib/env.js";
import { prisma } from "../../lib/prisma.js";
import { credit, findByProviderRef, hasRefundFor } from "./ledger.js";

type SharePayEvent = {
  event: "payment.success" | "payment.failed" | "payment.cancelled" | "payout.success" | "payout.failed" | "webhook.test";
  timestamp: string;
  data: { reference: string; status: string; amount: number; currency: string } | null;
};

/**
 * Webhook SharePay — voir SharePay.pdf §Webhooks. Enregistré dans son
 * propre plugin pour n'appliquer le parseur de corps brut qu'à cette
 * route : la signature HMAC-SHA256 se vérifie sur les octets exacts
 * envoyés, pas sur un JSON réencodé (§13-14 de la doc), donc le reste de
 * l'API garde le parseur JSON standard de Fastify.
 */
export async function webhookRoutes(app: FastifyInstance) {
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
    done(null, body);
  });

  // Chemin sans préfixe /api : c'est celui déjà enregistré dans le
  // dashboard SharePay (Applications → Webhooks) pour quizarenaworld.com.
  // Le proxy du frontend (§server.js isBackendPath) doit reconnaître ce
  // même préfixe pour relayer la requête jusqu'ici.
  app.post("/webhook/sharepay", async (req, reply) => {
    const secret = env.SHAREPAY_WEBHOOK_SECRET;
    if (!secret) {
      req.log.error("SHAREPAY_WEBHOOK_SECRET absent — webhook reçu mais ignoré");
      return reply.code(500).send("webhook not configured");
    }

    const raw = req.body as Buffer;
    const signature = req.headers["x-sharepay-signature"];
    const digest = crypto.createHmac("sha256", secret).update(raw).digest("hex");

    const valid =
      typeof signature === "string" &&
      signature.length === digest.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));

    if (!valid) {
      req.log.warn("SharePay webhook : signature invalide");
      return reply.code(401).send("invalid signature");
    }

    const payload = JSON.parse(raw.toString("utf8")) as SharePayEvent;

    if (payload.event === "webhook.test") {
      return reply.code(200).send("OK");
    }

    const reference = payload.data?.reference;
    if (!reference) return reply.code(200).send("OK"); // rien à rapprocher, on acquitte quand même

    const tx = await findByProviderRef(reference);
    if (!tx) {
      req.log.warn({ reference }, "SharePay webhook : aucune transaction locale pour cette référence");
      return reply.code(200).send("OK");
    }

    switch (payload.event) {
      case "payment.success":
        // Idempotent par construction : un update sur une ligne qui
        // n'est plus PENDING ne change rien.
        await prisma.transaction.updateMany({
          where: { id: tx.id, status: "PENDING" },
          data: { status: "COMPLETED" },
        });
        break;

      case "payment.failed":
      case "payment.cancelled":
        await prisma.transaction.updateMany({
          where: { id: tx.id, status: "PENDING" },
          data: { status: "FAILED" },
        });
        break;

      case "payout.success":
        // Le solde a déjà été débité à la demande (§wallet/routes.ts) —
        // rien à créditer, juste tracer la confirmation opérateur.
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { metadata: { ...(tx.metadata as object), payoutConfirmedAt: new Date().toISOString() } },
        });
        break;

      case "payout.failed":
        // Le virement a échoué après coup : rembourser, mais seulement
        // si ce n'est pas déjà fait (webhook livré deux fois).
        if (!(await hasRefundFor(tx.id))) {
          await credit({
            userId: tx.userId,
            type: "REFUND",
            amountCoins: tx.amountCoins, // déjà négatif sur le WITHDRAWAL, credit() prend la valeur absolue
            relatedTransactionId: tx.id,
            provider: "sharepay",
            metadata: { reason: "payout_failed_webhook", providerRef: reference },
          });
        }
        break;
    }

    return reply.code(200).send("OK");
  });
}
