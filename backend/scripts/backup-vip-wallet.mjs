import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const output = resolve(process.argv[2] || "backups/pre-vip-wallet.json");
const prisma = new PrismaClient();

try {
  const [users, bonusTransactions] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT "id", "username" FROM "User" ORDER BY "id"'),
    prisma.$queryRawUnsafe('SELECT "id", "userId", "amountCoins", "bonusAmountCoins" FROM "Transaction" WHERE "type" = \'BONUS\' ORDER BY "createdAt"'),
  ]);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify({ createdAt: new Date().toISOString(), users, bonusTransactions }, null, 2));
  console.log(`Backup written: ${output} (${users.length} users, ${bonusTransactions.length} bonus transactions)`);
} finally {
  await prisma.$disconnect();
}
