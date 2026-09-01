#!/usr/bin/env node
/**
 * Recette bout-en-bout du flux financier temps réel :
 * - plusieurs défis ciblés restent disponibles après reconnexion ;
 * - accepter l'un refuse atomiquement tous les autres ;
 * - une coupure fige le chrono pour les deux joueurs ;
 * - la reprise exige la confirmation du joueur revenu ;
 * - une absence de réponse fige aussi la partie avant le reveal.
 *
 * Les comptes créés portent le préfixe `resqa_` et ne reçoivent que le
 * bonus d'inscription de l'environnement Classic. Aucune donnée joueur
 * existante n'est lue ou modifiée.
 */
import WebSocket from "ws";

const base = process.env.QA_API_URL || "http://127.0.0.1:4010";
const wsBase = base.replace(/^http/, "ws");
const stamp = Date.now().toString().slice(-9);
const password = "QaResilience2026!";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function register(index) {
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: `resqa_${stamp}_${index}`,
      phone: `699${stamp}${index}`,
      password,
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Inscription ${index}: ${JSON.stringify(body)}`);
  return body;
}

function createBus(socket, label) {
  const messages = [];
  const waiters = new Set();
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    messages.push(message);
    for (const waiter of [...waiters]) {
      if (!waiter.predicate(message)) continue;
      clearTimeout(waiter.timer);
      waiters.delete(waiter);
      waiter.resolve(message);
    }
  });
  return {
    messages,
    waitFor(predicate, timeoutMs = 12_000) {
      const existing = messages.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve, timer: null };
        waiter.timer = setTimeout(() => {
          waiters.delete(waiter);
          reject(new Error(`${label}: timeout; derniers messages=${JSON.stringify(messages.slice(-8))}`));
        }, timeoutMs);
        waiters.add(waiter);
      });
    },
    count(type) { return messages.filter((message) => message.type === type).length; },
  };
}

async function connect(token, label) {
  const socket = new WebSocket(`${wsBase}/ws/duel?token=${encodeURIComponent(token)}`);
  const bus = createBus(socket, label);
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  const pong = bus.waitFor((message) => message.type === "pong");
  socket.send(JSON.stringify({ type: "ping" }));
  await pong;
  return { socket, bus };
}

const send = (client, message) => client.socket.send(JSON.stringify(message));

const [hostA, target, hostC] = await Promise.all([register(0), register(1), register(2)]);
let clientA;
let clientB;
let clientC;

try {
  [clientA, clientB, clientC] = await Promise.all([
    connect(hostA.token, "A"), connect(target.token, "B"), connect(hostC.token, "C"),
  ]);

  send(clientA, { type: "create_invite", stakeCoins: 100, targetUsername: target.user.username });
  const challengeA = await clientB.bus.waitFor((message) => message.type === "duel_challenge" && message.username === hostA.user.username);
  send(clientC, { type: "create_invite", stakeCoins: 100, targetUsername: target.user.username });
  const challengeC = await clientB.bus.waitFor((message) => message.type === "duel_challenge" && message.username === hostC.user.username);

  // Le destinataire se reconnecte : les deux demandes doivent être rejouées.
  clientB.socket.close();
  await sleep(250);
  clientB = await connect(target.token, "B-reconnect");
  await Promise.all([
    clientB.bus.waitFor((message) => message.type === "duel_challenge" && message.code === challengeA.code),
    clientB.bus.waitFor((message) => message.type === "duel_challenge" && message.code === challengeC.code),
  ]);

  const matchedA = clientA.bus.waitFor((message) => message.type === "matched");
  const matchedB = clientB.bus.waitFor((message) => message.type === "matched");
  const declinedC = clientC.bus.waitFor((message) => message.type === "invite_declined" && message.reason === "accepted_other");
  send(clientB, { type: "join_invite", code: challengeA.code });
  const [matchA, matchB] = await Promise.all([matchedA, matchedB]);
  await declinedC;
  if (matchA.duelMatchId !== matchB.duelMatchId) throw new Error("Les joueurs n'ont pas rejoint le même duel");

  const questionAWait = clientA.bus.waitFor((message) => message.type === "question", 15_000);
  const questionBWait = clientB.bus.waitFor((message) => message.type === "question", 15_000);
  send(clientA, { type: "ready" });
  send(clientB, { type: "ready" });
  const [questionA] = await Promise.all([questionAWait, questionBWait]);

  // Coupure franche pendant la manche : A doit recevoir la pause et aucune
  // progression de manche ne doit se produire pendant l'attente.
  clientB.socket.close();
  const connectionPause = await clientA.bus.waitFor(
    (message) => message.type === "duel_paused" && message.reason === "connection_lost",
    5_000,
  );
  const revealsBefore = clientA.bus.count("reveal");
  const questionsBefore = clientA.bus.count("question");
  await sleep(2_500);
  if (clientA.bus.count("reveal") !== revealsBefore || clientA.bus.count("question") !== questionsBefore) {
    throw new Error("Le duel a progressé alors qu'il devait être gelé");
  }

  clientB = await connect(target.token, "B-resume");
  const restoredPause = await clientB.bus.waitFor(
    (message) => message.type === "duel_paused" && message.reason === "connection_lost",
  );
  if (!restoredPause.requiresYourConfirmation) throw new Error("La confirmation du joueur reconnecté n'est pas exigée");
  const resumedA = clientA.bus.waitFor((message) => message.type === "duel_resumed" && message.phase === "question");
  const resumedB = clientB.bus.waitFor((message) => message.type === "duel_resumed" && message.phase === "question");
  send(clientB, { type: "resume_confirm" });
  await Promise.all([resumedA, resumedB]);

  // A répond, B reste silencieux : la fin du chrono doit provoquer une
  // seconde pause, pas un passage automatique à la question suivante.
  send(clientA, { type: "answer", questionId: questionA.questionId, chosenIndex: 0 });
  const missingPauseA = clientA.bus.waitFor(
    (message) => message.type === "duel_paused" && message.reason === "missing_answer",
    12_000,
  );
  const missingPauseB = clientB.bus.waitFor(
    (message) => message.type === "duel_paused" && message.reason === "missing_answer",
    12_000,
  );
  const [, pauseB] = await Promise.all([missingPauseA, missingPauseB]);
  if (!pauseB.requiresYourConfirmation) throw new Error("Une absence de réponse ne demande pas de confirmation");

  const revealA = clientA.bus.waitFor((message) => message.type === "reveal");
  const revealB = clientB.bus.waitFor((message) => message.type === "reveal");
  send(clientB, { type: "resume_confirm" });
  await Promise.all([revealA, revealB]);

  const resultA = clientA.bus.waitFor((message) => message.type === "duel_result");
  send(clientA, { type: "forfeit" });
  await resultA;

  process.stdout.write(JSON.stringify({
    ok: true,
    multiplePersistentInvites: true,
    acceptedOneDeclinedOthers: true,
    connectionPause: connectionPause.reason,
    noProgressWhilePaused: true,
    explicitResume: true,
    missingAnswerPause: true,
  }) + "\n");
} finally {
  for (const client of [clientA, clientB, clientC]) {
    if (client?.socket?.readyState === WebSocket.OPEN) client.socket.close();
  }
}
