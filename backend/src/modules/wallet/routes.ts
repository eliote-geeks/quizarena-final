import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { credit, debit, getBalance, getWalletSummary, listTransactions, listTransactionsPaged, InsufficientBalanceError, InsufficientWithdrawableBalanceError } from "./ledger.js";
import { getPaymentProvider } from "./payment-provider.js";
import { resolvePendingTransaction } from "./reconcile.js";
import { env } from "../../lib/env.js";
import { loadSettings } from "../../lib/settings.js";

const amountSchema = z.object({
  amountCoins: z.number().int().min(100, "100 F minimum").max(500_000), // 100 = plus petite mise possible (§DuelSetup)
  method: z.enum(["MTN_MOMO_CM", "ORANGE_MONEY_CM"]),
  phone: z.string().min(8).optional(), // défaut : téléphone du compte
});

export async function walletRoutes(app: FastifyInstance) {
  app.get("/api/wallet", { preHandler: [app.authenticate] }, async (req, reply) => {
    const [summary, transactions] = await Promise.all([
      getWalletSummary(req.user.userId),
      listTransactions(req.user.userId),
    ]);
    return reply.send({ ...summary, transactions });
  });

  // Historique paginé — utilisé par la page Portefeuille pour afficher
  // toutes les transactions sans limite arbitraire.
  app.get("/api/wallet/transactions", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { page = "1", perPage = "20" } = req.query as { page?: string; perPage?: string };
    const result = await listTransactionsPaged(req.user.userId, parseInt(page), parseInt(perPage));
    return reply.send(result);
  });

  // Filet de sécurité : le webhook SharePay n'est pas garanti "exactement
  // une fois" (un dépôt réel a réussi côté opérateur le 13/08/2026 sans
  // jamais notifier notre webhook). Le front peut appeler ceci en polling
  // après un dépôt/retrait pour ne pas rester bloqué sur PENDING — voir
  // aussi le balayage périodique dans server.ts.
  app.post("/api/wallet/resync/:transactionId", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { transactionId } = req.params as { transactionId: string };
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.userId !== req.user.userId) return reply.notFound();

    const updated = await resolvePendingTransaction(transactionId);
    return reply.send({ transaction: updated, balanceCoins: await getBalance(req.user.userId) });
  });

  app.post("/api/wallet/deposit", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!env.SHAREPAY_API_KEY && !env.ALLOW_SIMULATED_PAYMENTS) {
      return reply.code(503).send({
        statusCode: 503,
        error: "Service Unavailable",
        message: "Paiements temporairement indisponibles sur cette édition",
      });
    }
    // §lib/settings.ts — toggle admin (dashboard "Bloquer les dépôts") :
    // avant le 31/08 il n'était vérifié nulle part, sans effet réel.
    if (loadSettings().blockDeposits) {
      return reply.code(503).send({ statusCode: 503, error: "Service Unavailable", message: "Dépôts temporairement suspendus" });
    }
    const body = amountSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });
    if (user.accountStatus === "BANNED" || user.accountStatus === "SUSPENDED") {
      return reply.forbidden("Compte non actif");
    }

    const provider = getPaymentProvider();

    // Créée PENDING d'abord pour avoir un id à utiliser comme
    // merchantReference — SharePay l'utilise pour l'idempotence côté
    // opérateur (deux requêtes avec la même référence ne débitent
    // qu'une fois le mobile money du joueur).
    const tx = await credit({
      userId: user.id,
      type: "DEPOSIT",
      amountCoins: body.amountCoins,
      status: "PENDING",
      provider: provider.name,
    });

    try {
      const result = await provider.requestDeposit({
        merchantReference: tx.id,
        method: body.method,
        phone: body.phone ?? user.phone,
        amountCoins: body.amountCoins,
        payerName: user.username,
      });

      const updated = await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          providerRef: result.providerRef,
          status: result.status === "completed" ? "COMPLETED" : "PENDING",
        },
      });

      return reply.code(201).send({ transaction: updated, balanceCoins: await getBalance(user.id) });
    } catch (err) {
      // L'appel opérateur a échoué avant même d'initier le paiement —
      // on annule la ligne PENDING plutôt que de la laisser traîner.
      await prisma.transaction.update({ where: { id: tx.id }, data: { status: "FAILED" } });
      req.log.error(err, "SharePay requestDeposit a échoué");
      return reply.badGateway("Le fournisseur de paiement n'a pas pu être contacté");
    }
  });

  app.post("/api/wallet/withdraw", { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!env.SHAREPAY_API_KEY && !env.ALLOW_SIMULATED_PAYMENTS) {
      return reply.code(503).send({
        statusCode: 503,
        error: "Service Unavailable",
        message: "Paiements temporairement indisponibles sur cette édition",
      });
    }
    if (loadSettings().blockWithdrawals) {
      return reply.code(503).send({ statusCode: 503, error: "Service Unavailable", message: "Retraits temporairement suspendus" });
    }
    const body = amountSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });
    if (user.accountStatus === "BANNED" || user.accountStatus === "SUSPENDED") {
      return reply.forbidden("Compte non actif");
    }

    const provider = getPaymentProvider();

    let tx: { id: string };
    try {
      // COMPLETED tout de suite, pas PENDING : l'argent doit sortir du
      // solde disponible au moment de la demande (sinon le joueur peut
      // le remiser pendant que le virement est en cours — double
      // dépense). Si l'opérateur échoue, webhook/catch ci-dessous
      // rembourse via une transaction REFUND séparée — jamais un
      // UPDATE sur cette ligne (§ledger.ts : append-only).
      tx = await debit({
        userId: user.id,
        type: "WITHDRAWAL",
        amountCoins: body.amountCoins,
        withdrawableOnly: true,
        provider: provider.name,
      });
    } catch (err) {
      if (err instanceof InsufficientBalanceError || err instanceof InsufficientWithdrawableBalanceError) return reply.badRequest(err.message);
      throw err;
    }

    try {
      const result = await provider.requestWithdrawal({
        merchantReference: tx.id,
        method: body.method,
        phone: body.phone ?? user.phone,
        beneficiaryName: user.username,
        amountCoins: body.amountCoins,
      });

      // On ne touche plus au statut de cette ligne après coup : elle est
      // COMPLETED depuis debit() (l'argent est sorti du solde disponible
      // dès la demande, pas à la confirmation opérateur — sinon double
      // dépense possible pendant que le virement est en cours). Seule la
      // référence est ajoutée pour le rapprochement ; l'issue réelle du
      // virement (succès/échec) arrive par webhook, jamais en réécrivant
      // cette ligne (§ledger.ts : une transaction COMPLETED ne bouge plus,
      // un échec se traduit par un REFUND séparé, jamais par une réécriture).
      const updated = await prisma.transaction.update({
        where: { id: tx.id },
        data: { providerRef: result.providerRef },
      });

      return reply.code(201).send({ transaction: updated, balanceCoins: await getBalance(user.id) });
    } catch (err) {
      // Le virement n'a même pas pu être initié (erreur réseau/API avant
      // toute réponse SharePay) : rembourser tout de suite, l'argent ne
      // doit jamais rester débité sans virement réellement en cours.
      await credit({
        userId: user.id,
        type: "REFUND",
        amountCoins: body.amountCoins,
        relatedTransactionId: tx.id,
        metadata: { reason: "withdrawal_provider_unreachable", failedTransactionId: tx.id },
      });
      req.log.error(err, "SharePay requestWithdrawal a échoué");
      return reply.badGateway("Le fournisseur de paiement n'a pas pu être contacté, montant remboursé");
    }
  });
}
