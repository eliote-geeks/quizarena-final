import WebSocket from "ws";
import { PrismaClient } from "@prisma/client";

const base = process.env.QA_API_URL || "http://127.0.0.1:4000";
const wsBase = base.replace(/^http/, "ws");
const stamp = Date.now().toString().slice(-8);
const prisma = new PrismaClient();

async function call(path, { token, method = "GET", body } = {}) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${data.message || data.error || ""}`);
  return data;
}
async function register(index) {
  const result = await call("/api/auth/register", { method: "POST", body: { username: `warstake_${stamp}_${index}`, phone: `696${stamp}${index}`, password: "QaWarStake2026!" } });
  return { ...result.user, token: result.token };
}
function connect(user) {
  return new Promise((resolve, reject) => { const socket = new WebSocket(`${wsBase}/ws/duel?token=${encodeURIComponent(user.token)}`); socket.once("open", () => resolve(socket)); socket.once("error", reject); });
}
function waitFor(socket, type, timeout = 15_000) {
  return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Timeout ${type}`)), timeout); const listener = (raw) => { const message = JSON.parse(raw.toString()); if (message.type === type) { clearTimeout(timer); socket.off("message", listener); resolve(message); } }; socket.on("message", listener); });
}

const [a, b] = await Promise.all([register(0), register(1)]);
await prisma.transaction.createMany({ data: [a.id, b.id].map((userId) => ({ userId, type: "BONUS", amountCoins: 200, status: "COMPLETED", provider: "qa", metadata: { reason: "qa-clan-war-stake" } })) });
const clanA = (await call("/api/clans", { token: a.token, method: "POST", body: { name: `QA Arène ${stamp}`, tag: `A${stamp.slice(-4)}`, joinPolicy: "OPEN" } })).clan;
const clanB = (await call("/api/clans", { token: b.token, method: "POST", body: { name: `QA Bastion ${stamp}`, tag: `B${stamp.slice(-4)}`, joinPolicy: "OPEN" } })).clan;
const [socketA, socketB] = await Promise.all([connect(a), connect(b)]);

const queued = await call("/api/clan-wars/search", { token: a.token, method: "POST", body: { teamSize: 1, stakeCoins: 100 } });
if (queued.matched || queued.search.stakeCoins !== 100) throw new Error("Publication payante incorrecte");
const market = await call("/api/clan-wars", { token: b.token });
if (!market.openRequests.some((offer) => offer.clanId === clanA.id && offer.teamSize === 1 && offer.stakeCoins === 100)) throw new Error("Offre absente du marché public");

const noticeA = waitFor(socketA, "clan_war_accepted");
const noticeB = waitFor(socketB, "clan_war_accepted");
let war = (await call(`/api/clan-wars/search/${clanA.id}/accept`, { token: b.token, method: "POST", body: {} })).war;
const notices = await Promise.all([noticeA, noticeB]);
if (war.status !== "TEAM_SELECTION" || notices.some((notice) => notice.warId !== war.id)) throw new Error("Acceptation/notification incorrecte");

const [balanceA, balanceB] = await Promise.all([prisma.transaction.aggregate({ where: { userId: a.id, status: "COMPLETED" }, _sum: { amountCoins: true } }), prisma.transaction.aggregate({ where: { userId: b.id, status: "COMPLETED" }, _sum: { amountCoins: true } })]);
if (balanceA._sum.amountCoins !== 100 || balanceB._sum.amountCoins !== 100) throw new Error(`Séquestre invalide: ${balanceA._sum.amountCoins}/${balanceB._sum.amountCoins}`);

const blocked = await fetch(`${base}/api/clan-wars/search`, { method: "POST", headers: { Authorization: `Bearer ${a.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ teamSize: 1, stakeCoins: 0 }) });
if (blocked.status !== 400) throw new Error(`Une seconde guerre n'a pas été bloquée (${blocked.status})`);

await call(`/api/clan-wars/${war.id}/team`, { token: a.token, method: "PUT", body: { userIds: [a.id] } });
war = await call(`/api/clan-wars/${war.id}/team`, { token: b.token, method: "PUT", body: { userIds: [b.id] } });
if (war.status !== "IN_PROGRESS" || war.matches.length !== 1) throw new Error("Création de la confrontation impossible");

const resultA = waitFor(socketA, "duel_result", 150_000);
const resultB = waitFor(socketB, "duel_result", 150_000);
for (const [socket, answer] of [[socketA, 0], [socketB, 1]]) socket.on("message", (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "question") socket.send(JSON.stringify({ type: "answer", questionId: message.questionId, chosenIndex: answer })); });
socketA.send(JSON.stringify({ type: "clan_war_enter", clanWarMatchId: war.matches[0].id }));
socketB.send(JSON.stringify({ type: "clan_war_enter", clanWarMatchId: war.matches[0].id }));
const results = await Promise.all([resultA, resultB]);
if (results.some((result) => result.clanWarId !== war.id || !result.clanWarMatchId || result.payoutCoins !== 0)) throw new Error("Le résultat n'est pas identifié comme confrontation de clan");

war = await call(`/api/clan-wars/${war.id}`, { token: a.token });
if (war.status !== "COMPLETED" || war.payoutCoins !== 180 || !war.payoutDistributedAt) throw new Error("Clôture financière incorrecte");
const history = await call("/api/clan-wars?page=1&perPage=4", { token: a.token });
if (!history.history.some((item) => item.id === war.id) || history.activeWar) throw new Error("Historique paginé ou déblocage incorrect");

const winner = war.winnerClanId === clanA.id ? a : b;
const loser = winner.id === a.id ? b : a;
const [winnerBalance, loserBalance] = await Promise.all([prisma.transaction.aggregate({ where: { userId: winner.id, status: "COMPLETED" }, _sum: { amountCoins: true } }), prisma.transaction.aggregate({ where: { userId: loser.id, status: "COMPLETED" }, _sum: { amountCoins: true } })]);
if (winnerBalance._sum.amountCoins !== 280 || loserBalance._sum.amountCoins !== 100) throw new Error(`Répartition incorrecte: ${winnerBalance._sum.amountCoins}/${loserBalance._sum.amountCoins}`);

socketA.close(); socketB.close(); await prisma.$disconnect();
process.stdout.write(JSON.stringify({ ok: true, warId: war.id, stakePerClan: war.stakeCoins, payoutDistributed: war.payoutCoins, score: [war.challengerScore, war.defenderScore], blockedSecondWar: true, notifications: true, historyPaginated: true }) + "\n");
