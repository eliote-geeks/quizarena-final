#!/usr/bin/env node
// Crédite un compte de test avec une transaction BONUS clairement
// étiquetée QA — sert uniquement à amorcer des comptes jetables pour
// des tests bout-en-bout en production (tournois, duels, paiements).
// Jamais utilisé pour un vrai compte joueur. Traçable dans le ledger
// via metadata.reason="qa-test-credit" — distinguable de tout vrai
// bonus promotionnel.
//
// Usage : node scripts/qa-credit.mjs <username> <amountCoins>

import { PrismaClient, TransactionType, TransactionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , username, amountStr] = process.argv;
  const amount = Number(amountStr);
  if (!username || !Number.isFinite(amount) || amount <= 0) {
    console.error("Usage: node scripts/qa-credit.mjs <username> <amountCoins>");
    process.exit(1);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { username } });

  const tx = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: TransactionType.BONUS,
      amountCoins: Math.abs(amount),
      status: TransactionStatus.COMPLETED,
      metadata: { reason: "qa-test-credit", note: "Compte jetable — test bout-en-bout tournoi/duel" },
    },
  });

  console.log(`✓ ${user.username} crédité de ${amount} F (tx ${tx.id})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
