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
import { BOT_PARAMS, getBotUserId, botUsername, type BotDifficulty } from "./bot.js";
import { notifyTournamentMatchDone } from "./hooks.js";

const QUEUE_TIMEOUT_MS = 45_000;
const ROUND_GRACE_MS = 2_800; // temps d'affichage du "reveal" avant la question suivante (§ceremony côté v1)
const ANSWER_GRACE_MS = 1_500; // marge réseau au-delà du temps théorique avant de forcer la résolution du round
const RECONNECT_GRACE_MS = 20_000;
export const TOURNAMENT_WALKOVER_MS = 3 * 60_000; // délai pour rejoindre son match de tournoi avant forfait

type Send = (msg: object) => void;

// Sentinelle stockée en base pour un duel PvP (en ligne ou par
// invitation) : le thème n'est plus choisi à l'avance côté joueur (voir
// pickQuestions(null, ...)), pas de vraie ligne Category derrière — pas
// de contrainte de clé étrangère sur DuelMatch.categoryId, donc rien à
// migrer pour ce changement.
const MIXED_CATEGORY = "mixed";

type QueueEntry = {
  userId: string;
  username: string;
  eloRating: number;
  send: Send;
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
  // Somme des temps de réponse sur tout le match (ms) — sert UNIQUEMENT
  // de départage pour un match de tournoi qui finit à score égal (§finalizeMatch,
  // un bracket ne peut pas laisser passer un nul, contrairement au 1v1
  // normal où l'égalité est un résultat valide).
  totalResponseMs: number;
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
  botDifficulty: BotDifficulty | null; // non-null => players[1] est l'ordinateur
  tournamentMatchId: string | null; // non-null => match de bracket, pas de paiement direct (§tournament/)
};

const queues = new Map<string, QueueEntry[]>(); // clé "categoryId:stakeCoins"
const activeMatchByUser = new Map<string, Match>();
const matches = new Map<string, Match>();

// Verrou synchrone couvrant la fenêtre entre "reçu un message queue" et
// "poussé dans la file / apparié" — sans ça, deux messages "queue" pour
// le MÊME joueur arrivant avant la fin de l'await getBalance() pouvaient
// tous les deux passer les vérifications, et le second se retrouvait à
// s'apparier avec la première entrée... c'est-à-dire lui-même.
const reserving = new Set<string>();

function queueKey(stakeCoins: number) {
  return String(stakeCoins);
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
  stakeCoins: number;
}) {
  if (activeMatchByUser.has(entry.userId) || reserving.has(entry.userId)) {
    entry.send({ type: "error", message: "Déjà en duel" });
    return;
  }
  for (const list of queues.values()) {
    if (list.some((e) => e.userId === entry.userId)) {
      entry.send({ type: "error", message: "Déjà en recherche d'adversaire" });
      return;
    }
  }
  // Réservation synchrone AVANT le premier await : ferme la fenêtre de
  // course décrite plus haut. Toujours retirée avant de sortir de la
  // fonction, quelle que soit l'issue.
  reserving.add(entry.userId);

  const balance = await getBalance(entry.userId);
  if (balance < entry.stakeCoins) {
    reserving.delete(entry.userId);
    entry.send({ type: "error", message: "Solde insuffisant pour cette mise" });
    return;
  }

  const key = queueKey(entry.stakeCoins);
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

  // Garde-fou défensif en plus du verrou ci-dessus : ne jamais apparier
  // quelqu'un avec sa propre entrée, même si un futur changement de code
  // réintroduisait une fenêtre de course.
  let opponent = list.shift();
  if (opponent && opponent.userId === entry.userId) {
    list.push(opponent);
    opponent = undefined;
  }

  if (!opponent) {
    list.push({ ...entry, timeoutHandle });
    queues.set(key, list);
    reserving.delete(entry.userId);
    entry.send({ type: "queued" });
    return;
  }

  clearTimeout(opponent.timeoutHandle);
  queues.set(key, list);
  reserving.delete(entry.userId);
  entry.send({ type: "queued" }); // suivi immédiatement de "matched" une fois le débit confirmé
  await createMatch(opponent, entry);
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

// ── Invitation entre amis ────────────────────────────────────────────────
// Alternative au matchmaking public : un joueur génère un code, le
// partage par un lien externe (WhatsApp…), l'ami qui l'ouvre est apparié
// directement avec lui — sans passer par la file d'attente publique.

const INVITE_TTL_MS = 5 * 60_000;
const INVITE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sans 0/O/1/I/L, ambigus à l'oral/à l'écrit

type PendingInvite = MatchSeed & { code: string; timeoutHandle: ReturnType<typeof setTimeout> };

const invites = new Map<string, PendingInvite>();
const pendingInviteByUser = new Map<string, string>(); // userId -> code

function generateInviteCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 6 }, () => INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)]).join("");
  } while (invites.has(code));
  return code;
}

export function cancelInvite(userId: string) {
  const code = pendingInviteByUser.get(userId);
  if (!code) return;
  const invite = invites.get(code);
  if (invite) clearTimeout(invite.timeoutHandle);
  invites.delete(code);
  pendingInviteByUser.delete(userId);
}

export async function createInvite(entry: MatchSeed) {
  if (activeMatchByUser.has(entry.userId) || reserving.has(entry.userId)) {
    entry.send({ type: "error", message: "Déjà en duel" });
    return;
  }
  if (pendingInviteByUser.has(entry.userId)) {
    entry.send({ type: "error", message: "Invitation déjà en attente" });
    return;
  }

  const balance = await getBalance(entry.userId);
  if (balance < entry.stakeCoins) {
    entry.send({ type: "error", message: "Solde insuffisant pour cette mise" });
    return;
  }

  const code = generateInviteCode();
  const timeoutHandle = setTimeout(() => {
    if (invites.has(code)) {
      invites.delete(code);
      pendingInviteByUser.delete(entry.userId);
      entry.send({ type: "invite_expired" });
    }
  }, INVITE_TTL_MS);

  invites.set(code, { ...entry, code, timeoutHandle });
  pendingInviteByUser.set(entry.userId, code);
  entry.send({ type: "invite_created", code, expiresInMs: INVITE_TTL_MS });
}

export async function joinInvite(
  entry: { userId: string; username: string; eloRating: number; send: Send },
  rawCode: string
) {
  if (activeMatchByUser.has(entry.userId) || reserving.has(entry.userId)) {
    entry.send({ type: "error", message: "Déjà en duel" });
    return;
  }
  const code = rawCode.trim().toUpperCase();
  const invite = invites.get(code);
  if (!invite) {
    entry.send({ type: "error", message: "Invitation invalide ou expirée" });
    return;
  }
  if (invite.userId === entry.userId) {
    entry.send({ type: "error", message: "Impossible de rejoindre sa propre invitation" });
    return;
  }
  if (activeMatchByUser.has(invite.userId) || reserving.has(invite.userId)) {
    // L'hôte s'est engagé ailleurs entre-temps (queue publique, autre
    // invitation acceptée en double onglet…) — l'invitation est caduque.
    clearTimeout(invite.timeoutHandle);
    invites.delete(code);
    pendingInviteByUser.delete(invite.userId);
    entry.send({ type: "error", message: "Invitation invalide ou expirée" });
    return;
  }

  clearTimeout(invite.timeoutHandle);
  invites.delete(code);
  pendingInviteByUser.delete(invite.userId);

  entry.send({ type: "queued" });
  await createMatch(invite, entry);
}

// ── Contre l'ordinateur ─────────────────────────────────────────────────
// Même moteur que le PvP (mêmes messages, mêmes règles de paiement, même
// anti-triche temps réel) — seul le joueur humain a un vrai débit, voir
// finalizeMatch pour la raison de ne jamais créditer l'ordinateur.

export async function startBotDuel(entry: {
  userId: string;
  username: string;
  eloRating: number;
  send: Send;
  categoryId: string;
  stakeCoins: number;
  difficulty: BotDifficulty;
}) {
  if (activeMatchByUser.has(entry.userId) || reserving.has(entry.userId)) {
    entry.send({ type: "error", message: "Déjà en duel" });
    return;
  }
  for (const list of queues.values()) {
    if (list.some((e) => e.userId === entry.userId)) {
      entry.send({ type: "error", message: "Déjà en recherche d'adversaire" });
      return;
    }
  }
  reserving.add(entry.userId);

  const balance = await getBalance(entry.userId);
  if (balance < entry.stakeCoins) {
    reserving.delete(entry.userId);
    entry.send({ type: "error", message: "Solde insuffisant pour cette mise" });
    return;
  }
  reserving.delete(entry.userId);

  const botUserId = getBotUserId(entry.difficulty);
  const row = await prisma.duelMatch.create({
    data: { categoryId: entry.categoryId, stakeCoins: entry.stakeCoins, playerAId: entry.userId, playerBId: botUserId },
  });

  const match: Match = {
    id: row.id,
    categoryId: entry.categoryId,
    stakeCoins: entry.stakeCoins,
    questions: [],
    index: -1,
    status: "debiting",
    startedAnyQuestion: false,
    questionSentAt: 0,
    roundTimer: null,
    cancelled: false,
    awaitingReconnect: false,
    botDifficulty: entry.difficulty,
    tournamentMatchId: null,
    players: [
      { userId: entry.userId, username: entry.username, eloRating: entry.eloRating, send: entry.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0 },
      { userId: botUserId, username: botUsername(entry.difficulty), eloRating: 1000, send: null, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0 },
    ],
  };
  matches.set(match.id, match);
  activeMatchByUser.set(entry.userId, match);

  entry.send({
    type: "matched",
    duelMatchId: match.id,
    categoryId: match.categoryId,
    stakeCoins: match.stakeCoins,
    opponent: { username: match.players[1].username, eloRating: match.players[1].eloRating },
  });

  let debitTx: { id: string } | null = null;
  try {
    debitTx = await debit({ userId: entry.userId, type: "STAKE", amountCoins: match.stakeCoins, duelMatchId: match.id });
  } catch (err) {
    if (!(err instanceof InsufficientBalanceError)) throw err;
    await prisma.duelMatch.update({ where: { id: match.id }, data: { status: "CANCELLED", completedAt: new Date() } });
    cleanupMatch(match);
    entry.send({ type: "duel_cancelled", reason: "solde_insuffisant" });
    return;
  }

  if (match.cancelled) {
    // Le joueur s'est déconnecté pendant le débit — personne à notifier,
    // mais on rembourse quand même (le débit, lui, a bien eu lieu).
    await credit({ userId: entry.userId, type: "REFUND", amountCoins: match.stakeCoins, duelMatchId: match.id, relatedTransactionId: debitTx.id, metadata: { reason: "left_before_start" } });
    await prisma.duelMatch.update({ where: { id: match.id }, data: { status: "CANCELLED", completedAt: new Date() } });
    cleanupMatch(match);
    return;
  }

  const rawQuestions = await pickQuestions(match.categoryId, entry.userId, DUEL_ROUND_SIZE);
  match.questions = rawQuestions.map((q) => {
    const { text, permutation } = shuffledOptions(q.options);
    return { questionId: q.id, text: q.textFr, optionsText: text, permutation, answerIndex: q.answerIndex };
  });

  await prisma.duelMatch.update({
    where: { id: match.id },
    data: { status: "IN_PROGRESS", questionIds: match.questions.map((q) => q.questionId) },
  });

  match.status = "countdown";
  entry.send({ type: "countdown", seconds: 3 });
  setTimeout(() => {
    if (!match.cancelled) sendQuestion(match, 0);
  }, 3_200);
}

// ── Création du match : débit des deux mises AVANT toute question ─────

type MatchSeed = { userId: string; username: string; eloRating: number; send: Send; stakeCoins: number };

// `b` n'a pas besoin de stakeCoins : c'est toujours `a` (le joueur qui a
// initié — file d'attente publique ou hôte d'invitation) qui fixe la
// mise du match. Plus de catégorie à convenir entre les deux : contre un
// vrai adversaire, les questions sont toujours mélangées sur tout le
// bank (§MIXED_CATEGORY) — seul le mode "contre l'ordinateur" garde un
// choix de thème (§startBotDuel).
async function createMatch(a: MatchSeed, b: Omit<MatchSeed, "stakeCoins">) {
  const row = await prisma.duelMatch.create({
    data: { categoryId: MIXED_CATEGORY, stakeCoins: a.stakeCoins, playerAId: a.userId, playerBId: b.userId },
  });

  const match: Match = {
    id: row.id,
    categoryId: MIXED_CATEGORY,
    stakeCoins: a.stakeCoins,
    questions: [],
    index: -1,
    status: "debiting",
    startedAnyQuestion: false,
    questionSentAt: 0,
    roundTimer: null,
    cancelled: false,
    awaitingReconnect: false,
    botDifficulty: null,
    tournamentMatchId: null,
    players: [
      { userId: a.userId, username: a.username, eloRating: a.eloRating, send: a.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0 },
      { userId: b.userId, username: b.username, eloRating: b.eloRating, send: b.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0 },
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

  const rawQuestions = await pickQuestions(null, a.userId, DUEL_ROUND_SIZE);
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

// ── Match de tournoi ──────────────────────────────────────────────────
// Les deux joueurs d'un TournamentMatch sont connus à l'avance (bracket
// déjà généré, §tournament/engine.ts) : pas de file d'attente, on attend
// juste que les deux ouvrent l'écran et se signalent ("tournament_enter").
// Une fois les deux là, on lance EXACTEMENT le même moteur qu'un duel
// PvP normal (question/reveal/finalize identiques), mais stakeCoins=0 —
// le droit d'entrée a déjà été débité une seule fois à l'inscription.

type TournamentWaiter = { userId: string; username: string; eloRating: number; send: Send };

const tournamentPending = new Map<string, TournamentWaiter>(); // tournamentMatchId -> premier joueur arrivé
const walkoverTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleTournamentWalkover(tournamentMatchId: string, delayMs: number) {
  clearTournamentWalkover(tournamentMatchId);
  walkoverTimers.set(
    tournamentMatchId,
    setTimeout(() => void resolveTournamentWalkover(tournamentMatchId), delayMs)
  );
}

export function clearTournamentWalkover(tournamentMatchId: string) {
  const t = walkoverTimers.get(tournamentMatchId);
  if (t) {
    clearTimeout(t);
    walkoverTimers.delete(tournamentMatchId);
  }
}

/** Un des deux joueurs (ou aucun) ne s'est pas présenté dans le délai —
 * l'autre gagne par forfait sans jouer, ou si personne n'est venu, les
 * deux sont éliminés (le bracket gère la suite, y compris la cascade en
 * "bye" si ça se reproduit au tour suivant). */
async function resolveTournamentWalkover(tournamentMatchId: string) {
  walkoverTimers.delete(tournamentMatchId);
  const row = await prisma.tournamentMatch.findUnique({ where: { id: tournamentMatchId } });
  if (!row || row.status !== "READY") return; // déjà démarré ou déjà résolu entre-temps

  const waiter = tournamentPending.get(tournamentMatchId);
  tournamentPending.delete(tournamentMatchId);
  // Si PERSONNE ne s'est présenté (aucun des deux joueurs connecté avant
  // l'expiration), `waiter` est undefined — on ne peut PAS renvoyer null
  // ici (§advanceBracket/finalizeMatch : un match de tournoi doit
  // toujours désigner un vainqueur). Choix déterministe entre les deux
  // inscrits d'origine du match plutôt qu'un nul qui bloquerait le bracket.
  const winnerId = waiter?.userId ?? (row.playerAId && row.playerBId ? (row.playerAId < row.playerBId ? row.playerAId : row.playerBId) : (row.playerAId ?? row.playerBId));

  if (waiter) {
    const balance = await getBalance(waiter.userId);
    waiter.send({
      type: "duel_result", result: "win", forfeit: null,
      scoreYou: 0, scoreOpponent: 0, payoutCoins: 0, eloDelta: 0, eloRating: waiter.eloRating, balanceCoins: balance,
    });
  }

  await notifyTournamentMatchDone(tournamentMatchId, winnerId);
}

export async function enterTournamentMatch(entry: TournamentWaiter, tournamentMatchId: string) {
  if (activeMatchByUser.has(entry.userId)) {
    entry.send({ type: "error", message: "Déjà en duel" });
    return;
  }

  const row = await prisma.tournamentMatch.findUnique({ where: { id: tournamentMatchId }, include: { tournament: true } });
  if (!row || (row.playerAId !== entry.userId && row.playerBId !== entry.userId)) {
    entry.send({ type: "error", message: "Match de tournoi introuvable" });
    return;
  }
  if (row.status === "IN_PROGRESS" || row.status === "COMPLETED") {
    // Déjà lancé (reconnexion) : attachSocket() s'en charge déjà à la
    // connexion du socket, rien à faire de plus ici.
    return;
  }
  if (row.status !== "READY") {
    entry.send({ type: "error", message: "En attente du tour précédent" });
    return;
  }

  const waiter = tournamentPending.get(tournamentMatchId);
  if (waiter && waiter.userId === entry.userId) {
    // Reconnexion pendant l'attente de l'adversaire.
    tournamentPending.set(tournamentMatchId, entry);
    entry.send({ type: "tournament_waiting" });
    return;
  }
  if (!waiter) {
    tournamentPending.set(tournamentMatchId, entry);
    entry.send({ type: "tournament_waiting" });
    return;
  }

  // L'adversaire attendait déjà : on lance le match tout de suite.
  tournamentPending.delete(tournamentMatchId);
  clearTournamentWalkover(tournamentMatchId);
  await createTournamentMatch(tournamentMatchId, row.tournament.categoryId, waiter, entry);
}

async function createTournamentMatch(tournamentMatchId: string, categoryId: string, a: TournamentWaiter, b: TournamentWaiter) {
  const dbRow = await prisma.duelMatch.create({
    data: { categoryId, stakeCoins: 0, playerAId: a.userId, playerBId: b.userId },
  });
  await prisma.tournamentMatch.update({
    where: { id: tournamentMatchId },
    data: { status: "IN_PROGRESS", duelMatchId: dbRow.id },
  });

  const match: Match = {
    id: dbRow.id,
    categoryId,
    stakeCoins: 0,
    questions: [],
    index: -1,
    status: "countdown",
    startedAnyQuestion: false,
    questionSentAt: 0,
    roundTimer: null,
    cancelled: false,
    awaitingReconnect: false,
    botDifficulty: null,
    tournamentMatchId,
    players: [
      { userId: a.userId, username: a.username, eloRating: a.eloRating, send: a.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0 },
      { userId: b.userId, username: b.username, eloRating: b.eloRating, send: b.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0 },
    ],
  };
  matches.set(match.id, match);
  activeMatchByUser.set(a.userId, match);
  activeMatchByUser.set(b.userId, match);

  match.players[0].send?.({ type: "matched", duelMatchId: match.id, categoryId, stakeCoins: 0, opponent: { username: b.username, eloRating: b.eloRating } });
  match.players[1].send?.({ type: "matched", duelMatchId: match.id, categoryId, stakeCoins: 0, opponent: { username: a.username, eloRating: a.eloRating } });

  const rawQuestions = await pickQuestions(categoryId, a.userId, DUEL_ROUND_SIZE);
  match.questions = rawQuestions.map((q) => {
    const { text, permutation } = shuffledOptions(q.options);
    return { questionId: q.id, text: q.textFr, optionsText: text, permutation, answerIndex: q.answerIndex };
  });

  await prisma.duelMatch.update({
    where: { id: match.id },
    data: { status: "IN_PROGRESS", questionIds: match.questions.map((q) => q.questionId) },
  });

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

  if (match.botDifficulty) scheduleBotAnswer(match, q);
}

/** L'ordinateur "répond" après un délai qui dépend de la difficulté —
 * jamais instantané (§ANTICHEAT_SPEC.md : un temps de réponse nul est le
 * signe d'un bot... ce qu'il est, mais rien ne doit le trahir côté
 * protocole, le client ne fait aucune différence avec un humain). */
function scheduleBotAnswer(match: Match, q: MatchQuestion) {
  const bot = match.players[1];
  const params = BOT_PARAMS[match.botDifficulty!];
  const thinkMs = params.minMs + Math.random() * (params.maxMs - params.minMs);

  setTimeout(() => {
    if (match.status !== "question" || match.questions[match.index] !== q) return; // round déjà résolu
    const correct = Math.random() < params.accuracy;
    let chosenIndex: number;
    if (correct) {
      chosenIndex = q.permutation.indexOf(q.answerIndex);
    } else {
      const wrongPositions = q.permutation.map((_, i) => i).filter((i) => q.permutation[i] !== q.answerIndex);
      chosenIndex = wrongPositions[Math.floor(Math.random() * wrongPositions.length)]!;
    }
    recordAnswer(match, bot, chosenIndex);
  }, thinkMs);
}

/** Départ volontaire ("← quitter" en cours de partie) : défaite
 * immédiate, sans attendre le délai de grâce réseau — contrairement à
 * detachSocket(), un clic explicite n'est jamais une coupure accidentelle. */
export function handleForfeit(userId: string) {
  const match = activeMatchByUser.get(userId);
  if (!match) return;
  void finalizeMatch(match, userId);
}

export function handleAnswer(userId: string, questionId: string, chosenIndex: number) {
  const match = activeMatchByUser.get(userId);
  if (!match || match.status !== "question") return;
  const q = match.questions[match.index];
  if (!q || q.questionId !== questionId) return;

  const player = playerOf(match, userId);
  recordAnswer(match, player, chosenIndex);
}

/** Enregistre la réponse d'UN joueur (humain via handleAnswer, ou
 * ordinateur via scheduleBotAnswer) et déclenche la résolution du round
 * dès que les deux ont répondu. */
function recordAnswer(match: Match, player: MatchPlayer, chosenIndex: number) {
  if (player.answered) return;

  player.answered = true;
  player.chosenIndex = chosenIndex;
  player.answeredAt = Date.now();

  otherPlayer(match, player.userId).send?.({ type: "opponent_answered" });

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
    p.totalResponseMs += responseMs;
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

  // Un match de tournoi DOIT désigner un vainqueur pour faire avancer le
  // bracket — un nul y est une situation invalide, contrairement au 1v1
  // normal où l'égalité (winnerId=null) est un résultat légitime (remboursement
  // partiel des deux côtés, §payoutA/payoutB plus bas). Bug trouvé en test
  // réel (19/08) : un winnerId=null envoyé à notifyTournamentMatchDone
  // faisait éliminer les DEUX joueurs du match et bloquait le tournoi.
  // Départage par temps de réponse total (plus rapide gagne, convention
  // classique de quiz compétitif) — le résultat "draw" affiché aux deux
  // joueurs (resultA/resultB, ELO) reste honnête et INCHANGÉ, seul le
  // choix de qui avance dans le bracket utilise ce départage.
  let bracketWinnerId = winnerId;
  if (match.tournamentMatchId && bracketWinnerId === null) {
    if (pa.totalResponseMs !== pb.totalResponseMs) {
      bracketWinnerId = pa.totalResponseMs < pb.totalResponseMs ? pa.userId : pb.userId;
    } else {
      // Égalité parfaite jusque dans le temps de réponse (ex. 0-0, aucun
      // des deux n'a jamais répondu) : dernier recours déterministe pour
      // ne jamais laisser le bracket bloqué sans vainqueur.
      bracketWinnerId = pa.userId < pb.userId ? pa.userId : pb.userId;
    }
  }

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
  if (match.tournamentMatchId) {
    // Match de bracket : le droit d'entrée a déjà été débité une seule
    // fois à l'inscription au tournoi, et stakeCoins vaut 0 ici — aucun
    // paiement par match, seule la fin du tournoi distribue les gains
    // (§tournament/payout.ts). On se contente de faire avancer le bracket.
  } else if (match.botDifficulty) {
    // Contre l'ordinateur, seul le joueur humain a réellement misé (voir
    // startBotDuel) : il n'y a pas de vraie seconde mise en face. Le
    // paiement ne peut donc jamais dépasser ce qu'il a lui-même misé —
    // sinon on crédite de l'argent qui ne vient de nulle part. Gagner
    // rembourse la mise sans profit ; perdre la fait perdre entièrement,
    // comme un vrai duel ; égalité suit la même règle que le PvP (95%).
    if (resultA === "win") payoutA = match.stakeCoins;
    else if (resultA === "draw") payoutA = duelDrawPayout(match.stakeCoins);
    // resultA === "loss" : payoutA reste 0, mise perdue.
  } else if (resultA === "win") payoutA = duelWinnerPayout(match.stakeCoins);
  else if (resultB === "win") payoutB = duelWinnerPayout(match.stakeCoins);
  else {
    payoutA = duelDrawPayout(match.stakeCoins);
    payoutB = duelDrawPayout(match.stakeCoins);
  }
  if (payoutA > 0) await credit({ userId: pa.userId, type: "PAYOUT", amountCoins: payoutA, duelMatchId: match.id, metadata: { forfeit: !!forfeitedBy } });
  if (payoutB > 0 && !match.botDifficulty) await credit({ userId: pb.userId, type: "PAYOUT", amountCoins: payoutB, duelMatchId: match.id, metadata: { forfeit: !!forfeitedBy } });

  if (match.tournamentMatchId) await notifyTournamentMatchDone(match.tournamentMatchId, bracketWinnerId);

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
  cancelInvite(userId);

  const match = activeMatchByUser.get(userId);
  if (!match) return;
  const player = playerOf(match, userId);
  player.connected = false;
  player.send = null;

  if (!match.startedAnyQuestion && !match.tournamentMatchId) {
    // Déconnexion avant la première question : aléa réseau, pas un
    // abandon. On annule et on remboursera dans createMatch/ailleurs.
    // Ne s'applique pas à un match de tournoi : il n'y a pas de mise à
    // rembourser par match (déjà payée à l'inscription, irrévocable —
    // §schema.prisma Tournament), une déconnexion à ce stade est donc
    // traitée comme n'importe quel abandon en cours de partie ci-dessous.
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
