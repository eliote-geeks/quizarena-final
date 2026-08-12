import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { credit, debit, getBalance, listTransactions, InsufficientBalanceError } from "./ledger.js";
import { getPaymentProvider } from "./payment-provider.js";

const amountSchema = z.object({
  amountCoins: z.number().int().min(500, "500 F minimum").max(500_000),
});

export async function walletRoutes(app: FastifyInstance) {
  app.get("/api/wallet", { preHandler: [app.authenticate] }, async (req, reply) => {
    const [balance, transactions] = await Promise.all([
      getBalance(req.user.userId),
      listTransactions(req.user.userId),
    ]);
    return reply.send({ balanceCoins: balance, transactions });
  });

  app.post("/api/wallet/deposit", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = amountSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });
    if (user.accountStatus === "BANNED" || user.accountStatus === "SUSPENDED") {
      return reply.forbidden("Compte non actif");
    }

    const provider = getPaymentProvider();
    const result = await provider.requestDeposit({
      userId: user.id,
      phone: user.phone,
      amountCoins: body.amountCoins,
    });

    const tx = await credit({
      userId: user.id,
      type: "DEPOSIT",
      amountCoins: body.amountCoins,
      status: result.status === "completed" ? "COMPLETED" : "PENDING",
      provider: provider.name,
      providerRef: result.providerRef,
    });

    return reply.code(201).send({ transaction: tx, balanceCoins: await getBalance(user.id) });
  });

  app.post("/api/wallet/withdraw", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = amountSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });
    if (user.accountStatus === "BANNED" || user.accountStatus === "SUSPENDED") {
      return reply.forbidden("Compte non actif");
    }

    const provider = getPaymentProvider();

    try {
      const tx = await debit({
        userId: user.id,
        type: "WITHDRAWAL",
        amountCoins: body.amountCoins,
        status: "PENDING", // confirmé COMPLETED une fois le virement opérateur validé
      });

      const result = await provider.requestWithdrawal({
        userId: user.id,
        phone: user.phone,
        amountCoins: body.amountCoins,
      });

      const updated = await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          providerRef: result.providerRef,
          provider: provider.name,
          status: result.status === "completed" ? "COMPLETED" : "PENDING",
        },
      });

      return reply.code(201).send({ transaction: updated, balanceCoins: await getBalance(user.id) });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) return reply.badRequest(err.message);
      throw err;
    }
  });
}
