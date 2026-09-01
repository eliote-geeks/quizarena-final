import { PrismaClient } from "@prisma/client";
import { createSigner } from "fast-jwt";

const prisma = new PrismaClient();
const baseUrl = process.env.QA_API_URL || "http://127.0.0.1:4010";
const sign = createSigner({ key: process.env.JWT_SECRET });

async function request(path, token, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

let target;
let admin;
try {
  admin = await prisma.user.findFirstOrThrow({ where: { isAdmin: true }, select: { id: true } });
  const candidates = await prisma.user.findMany({
    where: { isAdmin: false, isBot: false, vipGrantedAt: null },
    select: { id: true, username: true },
    orderBy: { createdAt: "asc" },
  });
  for (const candidate of candidates) {
    const wins = await prisma.duelMatch.count({ where: { winnerId: candidate.id, status: "COMPLETED", completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60_000) } } });
    if (wins < 30) { target = candidate; break; }
  }
  if (!target) throw new Error("No standard testable player found");

  const adminToken = sign({ userId: admin.id });
  const playerToken = sign({ userId: target.id });

  const forbiddenCreate = await request("/api/tournaments", playerToken, {
    method: "POST",
    body: JSON.stringify({ name: "VIP permission probe", stakeCoins: 100, capacity: 4 }),
  });
  if (forbiddenCreate.status !== 403) throw new Error(`Expected tournament create 403, got ${forbiddenCreate.status}`);

  const granted = await request(`/api/admin/users/${target.id}/vip`, adminToken, { method: "POST", body: JSON.stringify({ enabled: true }) });
  if (granted.status !== 200 || granted.body.vip?.source !== "ADMIN") throw new Error("Admin VIP grant failed");

  const [me, tournaments, wallet] = await Promise.all([
    request("/api/auth/me", playerToken),
    request("/api/tournaments", playerToken),
    request("/api/wallet", playerToken),
  ]);
  if (!me.body.user?.isVip || me.body.user?.vipSource !== "ADMIN") throw new Error("Profile VIP state missing");
  if (!tournaments.body.viewer?.canCreateTournament) throw new Error("VIP tournament entitlement missing");

  const totals = await prisma.transaction.aggregate({
    where: { userId: target.id, status: "COMPLETED" },
    _sum: { amountCoins: true, bonusAmountCoins: true },
  });
  const balance = totals._sum.amountCoins ?? 0;
  const bonus = Math.max(0, Math.min(balance, totals._sum.bonusAmountCoins ?? 0));
  if (wallet.body.balanceCoins !== balance || wallet.body.bonusCoins !== bonus || wallet.body.withdrawableCoins !== balance - bonus) {
    throw new Error("Wallet API partition differs from ledger");
  }

  const bonusRows = await prisma.transaction.findMany({ where: { type: "BONUS" }, select: { amountCoins: true, bonusAmountCoins: true } });
  const misclassified = bonusRows.filter((row) => row.amountCoins !== row.bonusAmountCoins).length;
  if (misclassified) throw new Error(`${misclassified} BONUS entries are still misclassified`);

  console.log(JSON.stringify({
    ok: true,
    standardTournamentBlocked: true,
    adminVipGrant: true,
    vipVisibleOnProfileApi: true,
    vipTournamentEntitlement: true,
    walletMatchesLedger: true,
    bonusEntriesChecked: bonusRows.length,
  }));
} finally {
  if (target) await prisma.user.update({ where: { id: target.id }, data: { vipGrantedAt: null } }).catch(() => {});
  await prisma.$disconnect();
}
