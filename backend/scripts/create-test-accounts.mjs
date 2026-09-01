#!/usr/bin/env node
// Comptes de recette Classic. Idempotent : les mêmes identifiants peuvent
// être relancés sans recréditer les portefeuilles ni recréer les 30 victoires.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORDS = {
  vip_arena_test: "QaVip!2026R9",
  credit_test_1: "QaCredit!2026A7",
  credit_test_2: "QaCredit!2026B4",
};

async function ensureAccount(username, phone, password) {
  const hash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { username },
    update: { accountStatus: "ACTIVE", isBot: false },
    create: { username, phone, passwordHash: hash, isBot: false, stats: { create: {} } },
  });
}

async function creditBonus(userId, providerRef) {
  const existing = await prisma.transaction.findFirst({ where: { providerRef } });
  if (existing) return false;
  await prisma.transaction.create({
    data: {
      userId, type: "BONUS", amountCoins: 50_000, bonusAmountCoins: 50_000,
      provider: "test", providerRef, metadata: { reason: "test_account_credit", withdrawable: false },
    },
  });
  return true;
}

async function main() {
  const vip = await ensureAccount("vip_arena_test", "test-vip-2026", PASSWORDS.vip_arena_test);
  const creditOne = await ensureAccount("credit_test_1", "test-credit-2026-1", PASSWORDS.credit_test_1);
  const creditTwo = await ensureAccount("credit_test_2", "test-credit-2026-2", PASSWORDS.credit_test_2);
  const opponent = await prisma.user.upsert({
    where: { username: "VipSparringBot" },
    update: { isBot: true },
    create: { username: "VipSparringBot", phone: "bot-vip-sparring", passwordHash: "BOT_ACCOUNT_NO_LOGIN", isBot: true, stats: { create: {} } },
  });

  const wins = await prisma.duelMatch.count({
    where: { playerAId: vip.id, winnerId: vip.id, status: "COMPLETED", completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) } },
  });
  const missingWins = Math.max(0, 30 - wins);
  if (missingWins) {
    const now = Date.now();
    await prisma.duelMatch.createMany({ data: Array.from({ length: missingWins }, (_, index) => {
      const endedAt = new Date(now - (index + 1) * 45 * 60_000);
      return {
        categoryId: "culture", stakeCoins: 0, playerAId: vip.id, playerBId: opponent.id,
        status: "COMPLETED", scoreA: 7, scoreB: 4, winnerId: vip.id,
        startedAt: new Date(endedAt.getTime() - 7 * 60_000), completedAt: endedAt,
      };
    }) });
  }
  const creditedOne = await creditBonus(creditOne.id, "test-credit-50k-1");
  const creditedTwo = await creditBonus(creditTwo.id, "test-credit-50k-2");
  console.log(JSON.stringify({ vip: vip.username, vipWinsCreated: missingWins, credits: [creditOne.username, creditTwo.username], credited: [creditedOne, creditedTwo] }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
