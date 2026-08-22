import WebSocket from "ws";
import { PrismaClient } from "@prisma/client";

const base = process.env.QA_API_URL || "http://127.0.0.1:14100";
const wsBase = base.replace(/^http/, "ws"); const stamp = Date.now().toString().slice(-8);
async function register(index) { const response = await fetch(base + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: `directqa_${stamp}_${index}`, phone: `695${stamp}${index}`, password: "QaDirect2026!" }) }); return response.json(); }
const [a, b] = await Promise.all([register(0), register(1)]);
if (process.env.QA_DATABASE_URL) {
  const qaPrisma = new PrismaClient({ datasources: { db: { url: process.env.QA_DATABASE_URL } } });
  await qaPrisma.transaction.createMany({ data: [a.user.id, b.user.id].map((userId) => ({ userId, type: "BONUS", amountCoins: 1000, status: "COMPLETED", provider: "qa" })) });
  await qaPrisma.$disconnect();
}
function connect(token) { return new Promise((resolve, reject) => { const socket = new WebSocket(`${wsBase}/ws/duel?token=${encodeURIComponent(token)}`); socket.once("open", () => resolve(socket)); socket.once("error", reject); }); }
function waitFor(socket, type, timeout = 8000) { return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Timeout ${type}`)), timeout); const listener = (raw) => { const message = JSON.parse(raw.toString()); if (message.type === "error") { clearTimeout(timer); socket.off("message", listener); reject(new Error(message.message)); } else if (message.type === type) { clearTimeout(timer); socket.off("message", listener); resolve(message); } }; socket.on("message", listener); }); }
const [socketA, socketB] = await Promise.all([connect(a.token), connect(b.token)]);
if (process.env.QA_DEBUG) { socketA.on("message", (raw) => process.stderr.write(`A ${raw}\n`)); socketB.on("message", (raw) => process.stderr.write(`B ${raw}\n`)); }
const readyA = waitFor(socketA, "pong"); const readyB = waitFor(socketB, "pong");
socketA.send(JSON.stringify({ type: "ping" })); socketB.send(JSON.stringify({ type: "ping" }));
await Promise.all([readyA, readyB]);

let challengePromise = waitFor(socketB, "duel_challenge");
socketA.send(JSON.stringify({ type: "create_invite", stakeCoins: 100, targetUsername: b.user.username }));
let challenge = await challengePromise;
const declinedPromise = waitFor(socketA, "invite_declined");
socketB.send(JSON.stringify({ type: "decline_invite", code: challenge.code }));
await declinedPromise;

challengePromise = waitFor(socketB, "duel_challenge");
socketA.send(JSON.stringify({ type: "create_invite", stakeCoins: 100, targetUsername: b.user.username }));
challenge = await challengePromise;
const matchedA = waitFor(socketA, "matched"); const matchedB = waitFor(socketB, "matched");
socketB.send(JSON.stringify({ type: "join_invite", code: challenge.code }));
const [matchA, matchB] = await Promise.all([matchedA, matchedB]);
if (matchA.opponent.username !== b.user.username || matchB.opponent.username !== a.user.username) throw new Error("Mauvais adversaire ciblé");
socketA.close(); socketB.close();
process.stdout.write(JSON.stringify({ ok: true, declined: true, accepted: true, opponentA: matchA.opponent.username, opponentB: matchB.opponent.username }) + "\n");
