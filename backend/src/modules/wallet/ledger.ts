import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

/**
 * Le portefeuille n'a pas de colonne "solde". Le solde est TOUJOURS
 * dérivé : SUM(amountCoins) des transactions COMPLETED. C'est la seule
 * façon d'être certain qu'aucun bug de logique métier ne peut créer ou
 * effacer de l'argent silencieusement — toute variation de solde laisse
 * une ligne, datée, typée, traçable.
 */

export class InsufficientBalanceError extends Error {
  constructor() {
    super("Solde insuffisant");
    this.name = "InsufficientBalanceError";
  }
}

export async function getBalance(userId: string): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { userId, status: TransactionStatus.COMPLETED },
    _sum: { amountCoins: true },
  });
  return result._sum.amountCoins ?? 0;
}

type RecordTxInput = {
  userId: string;
  type: TransactionType;
  amountCoins: number; // signé
  status?: TransactionStatus;
  provider?: string;
  providerRef?: string;
  relatedTransactionId?: string;
  quizSessionId?: string;
  duelMatchId?: string;
  metadata?: Prisma.InputJsonValue;
};

/** Crédit — jamais de vérification de solde nécessaire. */
export async function credit(input: RecordTxInput) {
  return prisma.transaction.create({
    data: {
      userId: input.userId,
      type: input.type,
      amountCoins: Math.abs(input.amountCoins),
      status: input.status ?? TransactionStatus.COMPLETED,
      provider: input.provider,
      providerRef: input.providerRef,
      relatedTransactionId: input.relatedTransactionId,
      quizSessionId: input.quizSessionId,
      duelMatchId: input.duelMatchId,
      metadata: input.metadata,
    },
  });
}

/** Trouve la transaction créée pour un dépôt/retrait à partir de la
 * référence SharePay reçue dans le webhook — c'est le seul lien entre
 * les deux systèmes. */
export async function findByProviderRef(providerRef: string) {
  return prisma.transaction.findFirst({ where: { providerRef } });
}

/** Un REFUND existe-t-il déjà pour cette transaction ? Empêche un
 * remboursement en double si SharePay livre le même webhook deux fois
 * (comportement standard des webhooks : "au moins une fois", jamais
 * garanti "exactement une fois"). */
export async function hasRefundFor(transactionId: string) {
  const existing = await prisma.transaction.findFirst({
    where: { relatedTransactionId: transactionId, type: TransactionType.REFUND },
  });
  return existing !== null;
}

/**
 * Débit — vérifie le solde et écrit la transaction dans la même
 * transaction SQL en isolation SERIALIZABLE pour empêcher deux retraits
 * concurrents de passer tous les deux sur un solde qui n'en couvre qu'un.
 * Un conflit de sérialisation lève P2034 ; on retente une fois.
 */
export async function debit(input: RecordTxInput) {
  const attempt = async () =>
    prisma.$transaction(
      async (tx) => {
        const agg = await tx.transaction.aggregate({
          where: { userId: input.userId, status: TransactionStatus.COMPLETED },
          _sum: { amountCoins: true },
        });
        const balance = agg._sum.amountCoins ?? 0;
        const amount = Math.abs(input.amountCoins);
        if (balance < amount) throw new InsufficientBalanceError();

        return tx.transaction.create({
          data: {
            userId: input.userId,
            type: input.type,
            amountCoins: -amount,
            status: input.status ?? TransactionStatus.COMPLETED,
            provider: input.provider,
            providerRef: input.providerRef,
            quizSessionId: input.quizSessionId,
            duelMatchId: input.duelMatchId,
            metadata: input.metadata,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

  try {
    return await attempt();
  } catch (err) {
    // P2034 = write conflict / serialization failure — un seul retry,
    // au-delà c'est probablement une vraie contention à investiguer.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return attempt();
    }
    throw err;
  }
}

export async function listTransactions(userId: string, limit = 30) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
