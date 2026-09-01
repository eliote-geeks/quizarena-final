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

export class InsufficientWithdrawableBalanceError extends Error {
  constructor() {
    super("Solde retirable insuffisant");
    this.name = "InsufficientWithdrawableBalanceError";
  }
}

export async function getBalance(userId: string): Promise<number> {
  return (await getWalletSummary(userId)).balanceCoins;
}

export function summarizeWalletTotals(balanceCoins: number, rawBonusCoins: number) {
  // Le clamp est un garde-fou pour les anciennes écritures : il est
  // impossible d'afficher plus de bonus que de fonds jouables, ou un bonus
  // négatif. Le solde réel est toujours la différence, jamais une valeur du
  // navigateur.
  const bonusCoins = Math.max(0, Math.min(balanceCoins, rawBonusCoins));
  const withdrawableCoins = balanceCoins - bonusCoins;
  return {
    balanceCoins,
    playableCoins: balanceCoins,
    bonusCoins,
    withdrawableCoins,
    realCoins: withdrawableCoins,
  };
}

/** Le bonus peut être joué, mais ne peut jamais être retiré. */
export async function getWalletSummary(userId: string) {
  const result = await prisma.transaction.aggregate({
    where: { userId, status: TransactionStatus.COMPLETED },
    _sum: { amountCoins: true, bonusAmountCoins: true },
  });
  const balanceCoins = result._sum.amountCoins ?? 0;
  return summarizeWalletTotals(balanceCoins, result._sum.bonusAmountCoins ?? 0);
}

export function proportionalBonusAmount(amountCoins: number, stakeTotal: number, stakeBonus: number) {
  const total = Math.abs(stakeTotal);
  const bonus = Math.min(total, Math.abs(stakeBonus));
  if (!total || !bonus) return 0;
  return Math.min(Math.abs(amountCoins), Math.round(Math.abs(amountCoins) * bonus / total));
}

/**
 * Répartit un gain comme les mises qui l'ont produit. Une mise 100 % bonus
 * donne un gain 100 % bonus ; une mise mixte donne un gain mixte. Ce calcul
 * côté serveur est le verrou qui empêche de transformer un cadeau en retrait.
 */
export async function bonusAmountForPayout(amountCoins: number, where: Prisma.TransactionWhereInput): Promise<number> {
  const stakes = await prisma.transaction.aggregate({
    where: { ...where, type: TransactionType.STAKE, status: TransactionStatus.COMPLETED },
    _sum: { amountCoins: true, bonusAmountCoins: true },
  });
  return proportionalBonusAmount(
    amountCoins,
    stakes._sum.amountCoins ?? 0,
    stakes._sum.bonusAmountCoins ?? 0,
  );
}

type RecordTxInput = {
  userId: string;
  type: TransactionType;
  amountCoins: number; // signé
  bonusAmountCoins?: number; // même signe que amountCoins
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
  let bonusAmountCoins = input.bonusAmountCoins == null
    ? input.type === TransactionType.BONUS ? Math.abs(input.amountCoins) : 0
    : Math.abs(input.bonusAmountCoins);
  // Un remboursement restitue exactement la répartition de la mise
  // initiale. Ainsi un bonus ne devient jamais retirable via un refund.
  if (input.type === TransactionType.REFUND && input.bonusAmountCoins == null && input.relatedTransactionId) {
    const original = await prisma.transaction.findUnique({
      where: { id: input.relatedTransactionId },
      select: { bonusAmountCoins: true },
    });
    bonusAmountCoins = Math.abs(original?.bonusAmountCoins ?? 0);
  }
  return prisma.transaction.create({
    data: {
      userId: input.userId,
      type: input.type,
      amountCoins: Math.abs(input.amountCoins),
      bonusAmountCoins: Math.min(Math.abs(input.amountCoins), bonusAmountCoins),
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
export async function debit(input: RecordTxInput & { withdrawableOnly?: boolean }) {
  const attempt = async () =>
    prisma.$transaction(
      async (tx) => {
        const agg = await tx.transaction.aggregate({
          where: { userId: input.userId, status: TransactionStatus.COMPLETED },
          _sum: { amountCoins: true, bonusAmountCoins: true },
        });
        const balance = agg._sum.amountCoins ?? 0;
        const bonus = Math.max(0, Math.min(balance, agg._sum.bonusAmountCoins ?? 0));
        const withdrawable = balance - bonus;
        const amount = Math.abs(input.amountCoins);
        if (balance < amount) throw new InsufficientBalanceError();
        if (input.withdrawableOnly && withdrawable < amount) throw new InsufficientWithdrawableBalanceError();
        // Les mises consomment d'abord le bonus : il reste distinct dans le
        // ledger et les gains/remboursements peuvent conserver sa proportion.
        const bonusUsed = input.withdrawableOnly ? 0 : Math.min(bonus, amount);

        return tx.transaction.create({
          data: {
            userId: input.userId,
            type: input.type,
            amountCoins: -amount,
            bonusAmountCoins: -bonusUsed,
            status: input.status ?? TransactionStatus.COMPLETED,
            provider: input.provider,
            providerRef: input.providerRef,
            relatedTransactionId: input.relatedTransactionId,
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

export async function listTransactionsPaged(userId: string, page = 1, perPage = 20) {
  const skip = (page - 1) * perPage;
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: perPage,
      skip,
    }),
    prisma.transaction.count({ where: { userId } }),
  ]);
  return { transactions, total, page, pages: Math.ceil(total / perPage) };
}
