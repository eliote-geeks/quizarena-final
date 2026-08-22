import WebSocket from "ws";
import { PrismaClient } from "@prisma/client";

const base = process.env.QA_API_URL || "http://127.0.0.1:4000";
const wsBase = base.replace(/^http/, "ws");
const stamp = Date.now().toString().slice(-8);

async function register(index) {
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: `lowfundqa_${stamp}_${index}`,
      phone: `697${stamp}${index}`,
      password: "QaLowFunds2026!",
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(body));
  return body;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${wsBase}/ws/duel?token=${encodeURIComponent(token)}`);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function collect(socket) {
  const messages = [];
  socket.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
  return messages;
}

const [challenger, target] = await Promise.all([register(0), register(1)]);
const prisma = new PrismaClient();
await prisma.transaction.create({
  data: {
    userId: challenger.user.id,
    type: "BONUS",
    amountCoins: 100,
    status: "COMPLETED",
    provider: "qa",
    metadata: { reason: "qa-insufficient-direct-duel" },
  },
});
await prisma.$disconnect();

const [socketA, socketB] = await Promise.all([connect(challenger.token), connect(target.token)]);
const messagesA = collect(socketA);
const messagesB = collect(socketB);
socketA.send(JSON.stringify({ type: "create_invite", stakeCoins: 100, targetUsername: target.user.username }));
await new Promise((resolve) => setTimeout(resolve, 1_000));

const error = messagesA.find((message) => message.type === "error");
const targetWasNotified = messagesB.some((message) => message.type === "duel_challenge");
const redirected = [...messagesA, ...messagesB].some((message) => message.type === "matched");
socketA.close();
socketB.close();

if (!error || targetWasNotified || redirected) {
  throw new Error(JSON.stringify({ error, targetWasNotified, redirected, messagesA, messagesB }));
}

process.stdout.write(JSON.stringify({ ok: true, rejectedBeforeInvite: true, targetWasNotified, redirected, message: error.message }) + "\n");
