import { prisma } from "../../lib/prisma.js";
import { getPaymentProvider } from "./payment-provider.js";

/**
 * Filet de sécurité webhook — voir payment-provider.ts. Interroge
 * directement SharePay pour une transaction PENDING et la résout.
 * Idempotent : ne touche que les lignes encore PENDING.
 */
export async function resolvePendingTransaction(transactionId: string) {
  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!tx || tx.status !== "PENDING" || !tx.providerRef || tx.provider !== "sharepay") {
    return tx;
  }

  const provider = getPaymentProvider();
  const kind = tx.type === "DEPOSIT" ? "deposit" : "withdrawal";
  const status = await provider.checkStatus({ providerRef: tx.providerRef, kind });

  if (status === "completed") {
    return prisma.transaction.update({ where: { id: tx.id }, data: { status: "COMPLETED" } });
  }
  if (status === "failed") {
    return prisma.transaction.update({ where: { id: tx.id }, data: { status: "FAILED" } });
  }
  return tx; // toujours en cours
}

/** Balaie périodiquement les PENDING oubliées par un webhook jamais
 * livré. Voir server.ts. */
export async function sweepPendingTransactions() {
  const staleSince = new Date(Date.now() - 10_000); // laisse 10s au webhook normal d'arriver d'abord
  const stale = await prisma.transaction.findMany({
    where: { status: "PENDING", provider: "sharepay", createdAt: { lt: staleSince } },
    take: 50,
  });
  for (const tx of stale) {
    try {
      await resolvePendingTransaction(tx.id);
    } catch (err) {
      console.error(`[reconcile] échec pour ${tx.id}:`, err);
    }
  }
  return stale.length;
}
