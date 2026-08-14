// Moteur de duel 1v1 temps réel — état en mémoire d'un seul process
// Node (le déploiement actuel est un service systemd unique, pas de
// cluster : voir README § Déploiement). Si le service passe un jour en
// plusieurs instances, ce module devra migrer la file d'attente et
// l'état de match vers Redis (déjà en dépendance, voir lib/redis.ts) —
// pas nécessaire tant qu'il n'y a qu'un seul process.
//
// Principes anti-triche appliqués ici (ANTICHEAT_SPEC.md, R08 en
// particulier) :
//  - Le serveur choisit les questions, mesure le temps de réponse
//    lui-même (réception - envoi), et ne révèle la bonne réponse
//    qu'après que LES DEUX joueurs ont répondu ou que le temps est
//    écoulé — jamais avant.
//  - Abandonner en cours de partie compte comme une défaite, pas une
//    annulation : un joueur qui voit qu'il perd n'a aucun intérêt à
//    couper sa connexion (§6.1 R08 "abandon sélectif"). Seule une
//    déconnexion AVANT la première question annule et rembourse — c'est
//    un aléa réseau, pas un abandon de partie.

import { prisma } from "../../lib/prisma.js";
import { credit, debit, getBalance, InsufficientBalanceError } from "../wallet/ledger.js";
import { pickQuestions, shuffledOptions, TIME_PER_QUESTION_MS } from "../quiz/questions.js";
import { DUEL_ROUND_SIZE, duelWinnerPayout, duelDrawPayout, duelResultOf } from "../quiz/payout.js";
import { calcNewElo } from "../../lib/elo.js";

const QUEUE_TIMEOUT_MS = 45_000;
const ROUND_GRACE_MS = 2_800; // temps d'affichage du "reveal" avant la question suivante (§ceremony côté v1)
const ANSWER_GRACE_MS = 1_500; // marge réseau au-delà du temps théorique avant de forcer la résolution du round
const RECONNECT_GRACE_MS = 20_000;

type Send = (msg: object) => void;

type QueueEntry = {
  userId: string;
  username: string;
  eloRating: number;
  send: Send;
  categoryId: string;
  stakeCoins: number;
  timeoutHandle: ReturnType<typeof setTimeout>;
};

type MatchQuestion = {
  questionId: string;
  text: string;
  optionsText: string[]; // déjà mélangées, ordre partagé par les deux joueurs
  permutation: number[]; // permutation[position affichée] = index canonique
  answerIndex: number; // index canonique de la bonne réponse (jamais envoyé au client)
};

type MatchPlayer = {
  userId: string;
  username: string;
  eloRating: number;
  send: Send | null;
  connected: boolean;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
  score: number;
  answered: boolean;
  chosenIndex: number | null;
  answeredAt: number | null;
};

type Match = {
  id: string;
  categoryId: string;
  stakeCoins: number;
  questions: MatchQuestion[];
  index: number;
  status: "debiting" | "countdown" | "question" | "reveal" | "resolving" | "done";
  startedAnyQuestion: boolean;
  questionSentAt: number;
  roundTimer: ReturnType<typeof setTimeout> | null;
  players: [MatchPlayer, MatchPlayer];
  cancelled: boolean;
  awaitingReconnect: boolean;
};

const queues = new Map<string, QueueEntry[]>(); // clé "categoryId:stakeCoins"
const activeMatchByUser = new Map<string, Match>();
const matches = new Map<string, Match>();

function queueKey(categoryId: string, stakeCoins: number) {
  return `${categoryId}:${stakeCoins}`;
}

function otherPlayer(match: Match, userId: string): MatchPlayer {
  return match.players[0].userId === userId ? match.players[1] : match.players[0];
}

function playerOf(match: Match, userId: string): MatchPlayer {
  return match.players[0].userId === userId ? match.players[0] : match.players[1];
}

// ── Entrée dans la file d'attente ──────────────────────────────────────

export async function enqueue(entry: {
  userId: string;
  username: string;
  eloRating: number;
  send: Send;
  categoryId: string;
  stakeCoins: number;
}) {
  if (activeMatchByUser.has(entry.userId)) {
    entry.send({ type: "error", message: "Déjà en duel" });
    return;
  }
  for (const list of queues.values()) {
    if (list.some((e) => e.userId === entry.userId)) {
      entry.send({ type: "error", message: "Déjà en recherche d'adversaire" });
      return;
    }
  }

  const balance = await getBalance(entry.userId);
  if (balance < entry.stakeCoins) {
    entry.send({ type: "error", message: "Solde insuffisant pour cette mise" });
    return;
  }

  const key = queueKey(entry.categoryId, entry.stakeCoins);
  const list = queues.get(key) ?? [];

  const timeoutHandle = setTimeout(() => {
    const l = queues.get(key);
    if (!l) return;
    const idx = l.findIndex((e) => e.userId === entry.userId);
    if (idx >= 0) {
      l.splice(idx, 1);
      entry.send({ type: "queue_timeout" });
    }
  }, QUEUE_TIMEOUT_MS);

  const opponent = list.shift(); // FIFO : le premier arrivé sur cette clé est apparié en premier
  if (!opponent) {
    list.push({ ...entry, timeoutHandle });
    queues.set(key, list);
    entry.send({ type: "queued" });
    return;
  }

  clearTimeout(opponent.timeoutHandle);
  queues.set(key, list);
  entry.send({ type: "queued" }); // suivi immédiatement de "matched" une fois le débit confirmé
  await createMatch(opponent, { ...entry, timeoutHandle });
}

export function cancelQueue(userId: string) {
  for (const [key, list] of queues) {
    const idx = list.findIndex((e) => e.userId === userId);
    if (idx >= 0) {
      clearTimeout(list[idx]!.timeoutHandle);
      list.splice(idx, 1);
      queues.set(key, list);
      return;
    }
  }
}

// ── Création du match : débit des deux mises AVANT toute question ─────

async function createMatch(a: QueueEntry, b: QueueEntry) {
  const row = await prisma.duelMatch.create({
    data: { categoryId: a.categoryId, stakeCoins: a.stakeCoins, playerAId: a.userId, playerBId: b.userId },
  });

  const match: Match = {
    id: row.id,
    categoryId: a.categoryId,
    stakeCoins: a.stakeCoins,
    questions: [],
    index: -1,
    status: "debiting",
    startedAnyQuestion: false,
    questionSentAt: 0,
    roundTimer: null,
    cancelled: false,
    awaitingReconnect: false,
    players: [
      { userId: a.userId, username: a.username, eloRating: a.eloRating, send: a.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null },
      { userId: b.userId, username: b.username, eloRating: b.eloRating, send: b.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null },
    ],
  };
  matches.set(match.id, match);
  activeMatchByUser.set(a.userId, match);
  activeMatchByUser.set(b.userId, match);

  a.send({ type: "matched", duelMatchId: match.id, categoryId: match.categoryId, stakeCoins: match.stakeCoins, opponent: { username: b.username, eloRating: b.eloRating } });
  b.send({ type: "matched", duelMatchId: match.id, categoryId: match.categoryId, stakeCoins: match.stakeCoins, opponent: { username: a.username, eloRating: a.eloRating } });

  let debitA: { id: string } | null = null;
  let debitB: { id: string } | null = null;
  try {
    debitA = await debit({ userId: a.userId, type: "STAKE", amountCoins: match.stakeCoins, duelMatchId: match.id });
    debitB = await debit({ userId: b.userId, type: "STAKE", amountCoins: match.stakeCoins, duelMatchId: match.id });
  } catch (err) {
    if (!(err instanceof InsufficientBalanceError)) throw err;
    if (debitA) await credit({ userId: a.userId, type: "REFUND", amountCoins: match.stakeCoins, duelMatchId: match.id, relatedTransactionId: debitA.id, metadata: { reason: "opponent_insufficient_balance" } });
    await prisma.duelMatch.update({ where: { id: match.id }, data: { status: "CANCELLED", completedAt: new Date() } });
    cleanupMatch(match);
    match.players[0].send?.({ type: "duel_cancelled", reason: "solde_insuffisant" });
    match.players[1].send?.({ type: "duel_cancelled", reason: "solde_insuffisant" });
    return;
  }

  if (match.cancelled) {
    // Un des deux joueurs s'est déconnecté pendant le débit (fenêtre très
    // courte, mais réelle sur mobile). On rembourse intégralement.
    await credit({ userId: a.userId, type: "REFUND", amountCoins: match.stakeCoins, duelMatchId: match.id, relatedTransactionId: debitA.id, metadata: { reason: "opponent_disconnected_before_start" } });
    await credit({ userId: b.userId, type: "REFUND", amountCoins: match.stakeCoins, duelMatchId: match.id, relatedTransactionId: debitB.id, metadata: { reason: "opponent_disconnected_before_start" } });
    await prisma.duelMatch.update({ where: { id: match.id }, data: { status: "CANCELLED", completedAt: new Date() } });
    cleanupMatch(match);
    match.players[0].send?.({ type: "duel_cancelled", reason: "adversaire_deconnecte" });
    match.players[1].send?.({ type: "duel_cancelled", reason: "adversaire_deconnecte" });
    return;
  }

  const rawQuestions = await pickQuestions(match.categoryId, a.userId, DUEL_ROUND_SIZE);
  match.questions = rawQuestions.map((q) => {
    const { text, permutation } = shuffledOptions(q.options);
    return { questionId: q.id, text: q.textFr, optionsText: text, permutation, answerIndex: q.answerIndex };
  });

  await prisma.duelMatch.update({
    where: { id: match.id },
    data: { status: "IN_PROGRESS", questionIds: match.questions.map((q) => q.questionId) },
  });

  match.status = "countdown";
  match.players[0].send?.({ type: "countdown", seconds: 3 });
  match.players[1].send?.({ type: "countdown", seconds: 3 });
  setTimeout(() => {
    if (!match.cancelled) sendQuestion(match, 0);
  }, 3_200);
}

// ── Déroulé question par question ──────────────────────────────────────

function sendQuestion(match: Match, index: number) {
  match.index = index;
  match.status = "question";
  match.startedAnyQuestion = true;
  match.questionSentAt = Date.now();
  for (const p of match.players) {
    p.answered = false;
    p.chosenIndex = null;
    p.answeredAt = null;
  }

  const q = match.questions[index]!;
  const payload = {
    type: "question" as const,
    index,
    total: match.questions.length,
    questionId: q.questionId,
    text: q.text,
    options: q.optionsText,
    deadline: match.questionSentAt + TIME_PER_QUESTION_MS,
  };
  match.players[0].send?.(payload);
  match.players[1].send?.(payload);

  match.roundTimer = setTimeout(() => resolveRound(match), TIME_PER_QUESTION_MS + ANSWER_GRACE_MS);
}

export function handleAnswer(userId: string, questionId: string, chosenIndex: number) {
  const match = activeMatchByUser.get(userId);
  if (!match || match.status !== "question") return;
  const q = match.questions[match.index];
  if (!q || q.questionId !== questionId) return;

  const player = playerOf(match, userId);
  if (player.answered) return;

  player.answered = true;
  player.chosenIndex = chosenIndex;
  player.answeredAt = Date.now();

  otherPlayer(match, userId).send?.({ type: "opponent_answered" });

  if (match.players[0].answered && match.players[1].answered) {
    if (match.roundTimer) clearTimeout(match.roundTimer);
    void resolveRound(match);
  }
}

async function resolveRound(match: Match) {
  if (match.status !== "question") return; // déjà résolu (course timer/réponse simultanée)
  match.status = "reveal";
  const q = match.questions[match.index]!;

  const results: Record<string, { correct: boolean; chosenIndex: number; responseMs: number }> = {};
  for (const p of match.players) {
    const chosen = p.answered ? p.chosenIndex! : -1;
    const canonical = chosen >= 0 ? q.permutation[chosen] : -1;
    const correct = canonical === q.answerIndex;
    const responseMs = p.answered ? Math.max(0, p.answeredAt! - match.questionSentAt) : TIME_PER_QUESTION_MS;
    if (correct) p.score += 1;
    results[p.userId] = { correct, chosenIndex: chosen, responseMs };
  }

  await prisma.duelAnswer.createMany({
    data: match.players.map((p) => ({
      duelMatchId: match.id,
      userId: p.userId,
      questionId: q.questionId,
      chosenIndex: results[p.userId]!.chosenIndex,
      correct: results[p.userId]!.correct,
      responseMs: results[p.userId]!.responseMs,
    })),
  });

  const correctPosition = q.permutation.indexOf(q.answerIndex);
  for (const p of match.players) {
    const opp = otherPlayer(match, p.userId);
    p.send?.({
      type: "reveal",
      questionId: q.questionId,
      correctPosition,
      yourChosen: results[p.userId]!.chosenIndex,
      yourCorrect: results[p.userId]!.correct,
      opponentChosen: results[opp.userId]!.chosenIndex,
      opponentCorrect: results[opp.userId]!.correct,
      scoreYou: p.score,
      scoreOpponent: opp.score,
    });
  }

  const isLast = match.index + 1 >= match.questions.length;
  if (isLast) {
    setTimeout(() => void finalizeMatch(match), ROUND_GRACE_MS);
  } else if (match.players.some((p) => !p.connected)) {
    // Un joueur est déconnecté : pas la peine de lui envoyer (et de faire
    // expirer) des questions pendant qu'il n'y a personne pour y répondre.
    // On reste en "reveal" et c'est attachSocket() qui relance la suite
    // s'il revient dans le délai de grâce ; sinon le timer de forfait
    // (détaché dans detachSocket) finira la partie tout seul.
    match.awaitingReconnect = true;
  } else {
    setTimeout(() => {
      if (!match.cancelled) sendQuestion(match, match.index + 1);
    }, ROUND_GRACE_MS);
  }
}

// ── Fin de partie ───────────────────────────────────────────────────────

async function finalizeMatch(match: Match, forfeitedBy?: string) {
  if (match.status === "done" || match.status === "resolving") return;
  match.status = "resolving";
  if (match.roundTimer) clearTimeout(match.roundTimer);

  const [pa, pb] = match.players;
  let resultA: "win" | "draw" | "loss";
  if (forfeitedBy) {
    resultA = forfeitedBy === pa.userId ? "loss" : "win";
  } else {
    resultA = duelResultOf(pa.score, pb.score);
  }
  const resultB = resultA === "win" ? "loss" : resultA === "loss" ? "win" : "draw";

  const { newElo: newEloA, delta: deltaA } = calcNewElo(pa.eloRating, pb.eloRating, resultA);
  const { newElo: newEloB, delta: deltaB } = calcNewElo(pb.eloRating, pa.eloRating, resultB);

  const winnerId = resultA === "win" ? pa.userId : resultA === "loss" ? pb.userId : null;

  await prisma.$transaction([
    prisma.user.update({ where: { id: pa.userId }, data: { eloRating: newEloA } }),
    prisma.user.update({ where: { id: pb.userId }, data: { eloRating: newEloB } }),
    prisma.duelMatch.update({
      where: { id: match.id },
      data: {
        status: "COMPLETED",
        scoreA: pa.score,
        scoreB: pb.score,
        winnerId,
        forfeitedBy: forfeitedBy ?? null,
        eloDeltaA: deltaA,
        eloDeltaB: deltaB,
        completedAt: new Date(),
      },
    }),
  ]);

  let payoutA = 0;
  let payoutB = 0;
  if (resultA === "win") payoutA = duelWinnerPayout(match.stakeCoins);
  else if (resultB === "win") payoutB = duelWinnerPayout(match.stakeCoins);
  else {
    payoutA = duelDrawPayout(match.stakeCoins);
    payoutB = duelDrawPayout(match.stakeCoins);
  }
  if (payoutA > 0) await credit({ userId: pa.userId, type: "PAYOUT", amountCoins: payoutA, duelMatchId: match.id, metadata: { forfeit: !!forfeitedBy } });
  if (payoutB > 0) await credit({ userId: pb.userId, type: "PAYOUT", amountCoins: payoutB, duelMatchId: match.id, metadata: { forfeit: !!forfeitedBy } });

  const [balanceA, balanceB] = await Promise.all([getBalance(pa.userId), getBalance(pb.userId)]);

  pa.send?.({
    type: "duel_result", result: resultA, forfeit: forfeitedBy === pb.userId ? "opponent" : forfeitedBy === pa.userId ? "you" : null,
    scoreYou: pa.score, scoreOpponent: pb.score, payoutCoins: payoutA, eloDelta: deltaA, eloRating: newEloA, balanceCoins: balanceA,
  });
  pb.send?.({
    type: "duel_result", result: resultB, forfeit: forfeitedBy === pa.userId ? "opponent" : forfeitedBy === pb.userId ? "you" : null,
    scoreYou: pb.score, scoreOpponent: pa.score, payoutCoins: payoutB, eloDelta: deltaB, eloRating: newEloB, balanceCoins: balanceB,
  });

  match.status = "done";
  cleanupMatch(match);
}

function cleanupMatch(match: Match) {
  matches.delete(match.id);
  activeMatchByUser.delete(match.players[0].userId);
  activeMatchByUser.delete(match.players[1].userId);
  if (match.roundTimer) clearTimeout(match.roundTimer);
  for (const p of match.players) if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
}

// ── Connexion / déconnexion socket ──────────────────────────────────────

/** Un joueur qui revient (reconnexion réseau) dans le délai de grâce
 * retrouve directement l'état courant du match, sans tout recréer. */
export function attachSocket(userId: string, send: Send): { resumed: boolean } {
  const match = activeMatchByUser.get(userId);
  if (!match) return { resumed: false };

  const player = playerOf(match, userId);
  const opp = otherPlayer(match, userId);
  if (player.disconnectTimer) {
    clearTimeout(player.disconnectTimer);
    player.disconnectTimer = null;
  }
  player.connected = true;
  player.send = send;
  opp.send?.({ type: "opponent_reconnected" });

  send({
    type: "resumed",
    duelMatchId: match.id,
    categoryId: match.categoryId,
    stakeCoins: match.stakeCoins,
    opponent: { username: opp.username, eloRating: opp.eloRating },
    scoreYou: player.score,
    scoreOpponent: opp.score,
    phase: match.status,
    ...(match.status === "question" || match.status === "reveal"
      ? {
          index: match.index,
          total: match.questions.length,
          questionId: match.questions[match.index]!.questionId,
          text: match.questions[match.index]!.text,
          options: match.questions[match.index]!.optionsText,
          deadline: match.questionSentAt + TIME_PER_QUESTION_MS,
          alreadyAnswered: player.answered,
        }
      : {}),
  });

  // La partie était en pause (§resolveRound) en attendant ce retour : on
  // relance la question suivante maintenant que tout le monde est là.
  if (match.awaitingReconnect && match.status === "reveal" && match.players.every((p) => p.connected)) {
    match.awaitingReconnect = false;
    setTimeout(() => {
      if (!match.cancelled && match.status === "reveal") sendQuestion(match, match.index + 1);
    }, ROUND_GRACE_MS);
  }

  return { resumed: true };
}

export function detachSocket(userId: string) {
  cancelQueue(userId);

  const match = activeMatchByUser.get(userId);
  if (!match) return;
  const player = playerOf(match, userId);
  player.connected = false;
  player.send = null;

  if (!match.startedAnyQuestion) {
    // Déconnexion avant la première question : aléa réseau, pas un
    // abandon. On annule et on remboursera dans createMatch/ailleurs.
    match.cancelled = true;
    if (match.status !== "debiting") {
      // Le débit était déjà fait (entre countdown et 1ère question) :
      // rembourser tout de suite plutôt que d'attendre createMatch qui
      // ne gère que la fenêtre de débit elle-même.
      void refundAndCancel(match, "adversaire_deconnecte");
    }
    return;
  }

  const opp = otherPlayer(match, userId);
  opp.send?.({ type: "opponent_disconnected", graceMs: RECONNECT_GRACE_MS });

  player.disconnectTimer = setTimeout(() => {
    void finalizeMatch(match, userId);
  }, RECONNECT_GRACE_MS);
}

async function refundAndCancel(match: Match, reason: string) {
  // Verrou synchrone : si deux déconnexions arrivent dans le même tick
  // (les deux joueurs partent en même temps), la deuxième doit s'arrêter
  // ici pour ne pas rembourser deux fois.
  if (match.status === "resolving" || match.status === "done") return;
  match.status = "resolving";
  const [pa, pb] = match.players;
  await Promise.all(
    match.players.map(async (p) => {
      // Ne rembourse que si la mise a bien été débitée (elle l'a été dès
      // que le status a dépassé "debiting").
      const stakeTx = await prisma.transaction.findFirst({
        where: { userId: p.userId, duelMatchId: match.id, type: "STAKE" },
      });
      if (stakeTx) {
        await credit({ userId: p.userId, type: "REFUND", amountCoins: match.stakeCoins, duelMatchId: match.id, relatedTransactionId: stakeTx.id, metadata: { reason } });
      }
    })
  );
  await prisma.duelMatch.update({ where: { id: match.id }, data: { status: "CANCELLED", completedAt: new Date() } });
  match.status = "done";
  pa.send?.({ type: "duel_cancelled", reason });
  pb.send?.({ type: "duel_cancelled", reason });
  cleanupMatch(match);
}
