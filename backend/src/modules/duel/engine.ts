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
import { bonusAmountForPayout, credit, debit, getBalance, InsufficientBalanceError } from "../wallet/ledger.js";
import { pickQuestions, shuffledOptions } from "../quiz/questions.js";
import { DUEL_ROUND_SIZE, duelWinnerPayout, duelDrawPayout, duelResultOf } from "../quiz/payout.js";
import { calcNewElo } from "../../lib/elo.js";
import { BOT_PARAMS, getBotUserId, botUsername, botWinnerPayout, type BotDifficulty } from "./bot.js";
import { notifyTournamentMatchDone, notifyClanWarMatchDone } from "./hooks.js";
import { sendPush } from "../../lib/push.js";

// Chrono spécifique au Duel — volontairement plus long qu'en Solo (8 s,
// §quiz/questions.ts TIME_PER_QUESTION_MS) : face à un adversaire réel, le
// temps de lecture de la question rivalise avec le temps de réponse, alors
// qu'en Solo le joueur lit déjà pendant que le chrono défile sans pression
// concurrentielle. Retour Paul du 31/08, insistant à plusieurs reprises :
// "seul les duels solo [sic, Solo] sont à 8s le reste c'est 13s".
const DUEL_TIME_PER_QUESTION_MS = 13_000;

const QUEUE_TIMEOUT_MS = 45_000;
const ROUND_GRACE_MS = 3_000; // temps d'affichage du "reveal" avant la question suivante — 3 s visibles côté client

// Délai maximal accordé aux DEUX joueurs pour confirmer avoir fini de
// charger une question (texte déjà en main, seul le média peut prendre du
// temps) avant que le serveur ne démarre le chrono partagé de force.
//
// Correctif du 30/08/2026 (retour Paul, capture à l'appui) : 6 s coupait
// court sur une connexion mobile lente — le round démarrait alors que
// l'image était encore visiblement en train de charger, ce qui recréait
// exactement le désavantage que ce mécanisme est censé éliminer. En solo
// (QuizPlay.jsx, `mediaReady`) l'attente est SANS limite de temps ; ici on
// garde un filet de sécurité (client réellement mort/bloqué), mais large
// pour ne quasiment jamais se déclencher sur un vrai chargement, même lent
// — même modèle qu'en solo en pratique. Une vraie déconnexion pendant
// cette attente est de toute façon détectée indépendamment par le
// heartbeat/pauseMatch (§pauseMatch : `pendingReady.cancel()`), pas par ce
// timeout.
const QUESTION_READY_TIMEOUT_MS = 25_000;
const RECONNECT_GRACE_MS = 20_000;
const PRESENCE_CONFIRM_MS = 30_000;
const TAB_HIDDEN_GRACE_MS = 3_000; // anti-triche : 3 s pour revenir si onglet/app masqué(e) en cours de question
export const TOURNAMENT_WALKOVER_MS = 3 * 60_000; // délai pour rejoindre son match de tournoi avant forfait

// Timers actifs "onglet masqué" — un par userId, nettoyé à la fin du match.
const tabHiddenTimers = new Map<string, ReturnType<typeof setTimeout>>();
const tabHiddenEvents = new Map<string, { count: number; totalMs: number; startedAt: number }>();

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
  mediaUrl: string | null;
  mediaAlt: string | null;
  optionsText: string[]; // déjà mélangées, ordre partagé par les deux joueurs
  permutation: number[]; // permutation[position affichée] = index canonique
  answerIndex: number; // index canonique de la bonne réponse (jamais envoyé au client)
  categoryId: string; // catégorie réelle de CETTE question (les duels mélangés piochent dans toutes les catégories, §pickQuestions) — affichée côté client comme en solo (§QuestionIntro), pas de risque anti-triche : jamais la réponse, juste le thème.
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
  // Anti-triche : nombre de déconnexions en cours de partie. Au-delà de 2,
  // la prochaine déconnexion est un forfait immédiat (empêche la tactique
  // "déconnecter en perdant pour que l'adversaire abandonne").
  disconnectCount: number;
  // Phase "Prêt" : true dès que le joueur a cliqué le bouton côté client.
  // Quand les deux sont true → countdown 5 s → partie (§handleReady).
  ready: boolean;
};

type ResumablePhase = "waiting_ready" | "countdown" | "question" | "reveal";
type PauseReason = "connection_lost" | "missing_answer" | "visibility_lost";
type PauseResumeAction = "continue_phase" | "resolve_round" | "send_question" | "finalize";

type MatchPause = {
  from: ResumablePhase;
  reason: PauseReason;
  missingUserIds: Set<string>;
  confirmedUserIds: Set<string>;
  remainingMs: number;
  startedAt: number;
  expiresAt: number;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  resumeAction: PauseResumeAction;
  nextQuestionIndex?: number;
};

type Match = {
  id: string;
  categoryId: string;
  stakeCoins: number;
  questions: MatchQuestion[];
  index: number;
  // "waiting_ready" : les deux joueurs ont reçu "matched" et doivent cliquer
  // "Prêt !" avant que le countdown ne démarre — garantit qu'ils sont présents
  // et règle le problème audio mobile (le clic est un geste utilisateur qui
  // réveille l'AudioContext).
  status: "debiting" | "waiting_ready" | "countdown" | "question" | "reveal" | "paused" | "resolving" | "done";
  startedAnyQuestion: boolean;
  questionSentAt: number;
  countdownSentAt: number; // timestamp quand le countdown a été envoyé (pour recalculer le restant à la reconnexion)
  countdownSeconds: number; // durée totale du countdown envoyée aux clients
  phaseDeadlineAt: number; // échéance serveur de la phase active, utilisée pour geler/reprendre sans perdre de temps
  roundTimer: ReturnType<typeof setTimeout> | null;
  readyTimer: ReturnType<typeof setTimeout> | null; // timer d'expiration si un joueur ne clique pas "Prêt" à temps
  // Attente de préchargement AVANT le lancement réel d'une question — voir
  // prepareQuestion(). null quand aucune question n'est en cours de
  // préparation (pendant une reveal, un countdown, etc.).
  pendingReady: { questionId: string; readyUserIds: Set<string>; notify: () => void; cancel: () => void } | null;
  players: [MatchPlayer, MatchPlayer];
  cancelled: boolean;
  awaitingReconnect: boolean;
  pause: MatchPause | null;
  botDifficulty: BotDifficulty | null; // non-null => players[1] est l'ordinateur
  tournamentMatchId: string | null; // non-null => match de bracket, pas de paiement direct (§tournament/)
  clanWarMatchId?: string | null; // non-null => confrontation de clans, sans paiement ni ELO
  clanWarId?: string | null; // route de retour vers la guerre collective
};

const queues = new Map<string, QueueEntry[]>(); // clé "categoryId:stakeCoins"
const activeMatchByUser = new Map<string, Match>();
const matches = new Map<string, Match>();
const spectatorsByMatch = new Map<string, Map<string, Send>>();

function spectatorState(match: Match) {
  const q = match.questions[match.index];
  const effectiveStatus = match.status === "paused" ? match.pause?.from : match.status;
  const reveal = effectiveStatus === "reveal" && q ? {
    correctPosition: q.permutation.indexOf(q.answerIndex),
    chosenA: match.players[0].chosenIndex ?? -1,
    chosenB: match.players[1].chosenIndex ?? -1,
  } : null;
  return {
    type: "spectator_state",
    matchId: match.id,
    status: match.status,
    paused: match.pause ? {
      reason: match.pause.reason,
      pausedFrom: match.pause.from,
      expiresAt: match.pause.expiresAt,
      missingPlayers: match.players.filter((player) => match.pause!.missingUserIds.has(player.userId)).map((player) => player.username),
    } : null,
    categoryId: match.categoryId,
    stakeCoins: match.stakeCoins,
    clanWarMatchId: match.clanWarMatchId ?? null,
    clanWarId: match.clanWarId ?? null,
    scoreA: match.players[0].score,
    scoreB: match.players[1].score,
    players: match.players.map((player) => ({ username: player.username, connected: player.connected })),
    viewerCount: spectatorsByMatch.get(match.id)?.size ?? 0,
    question: q && (effectiveStatus === "question" || effectiveStatus === "reveal") ? {
      index: match.index,
      total: match.questions.length,
      text: q.text,
      mediaUrl: q.mediaUrl,
      mediaAlt: q.mediaAlt,
      categoryId: q.categoryId,
      options: q.optionsText,
      deadline: match.status === "paused" ? null : match.phaseDeadlineAt,
    } : null,
    reveal,
  };
}

function emitToSpectators(match: Match, message: object = spectatorState(match)) {
  for (const send of spectatorsByMatch.get(match.id)?.values() ?? []) send(message);
}

export function spectateMatch(userId: string, matchId: string, send: Send) {
  const match = matches.get(matchId);
  if (!match || !["waiting_ready", "countdown", "question", "reveal", "paused"].includes(match.status)) {
    send({ type: "spectator_unavailable", matchId });
    return;
  }
  leaveSpectate(userId);
  const spectators = spectatorsByMatch.get(matchId) ?? new Map<string, Send>();
  spectators.set(userId, send);
  spectatorsByMatch.set(matchId, spectators);
  emitToSpectators(match);
}

export function leaveSpectate(userId: string, matchId?: string) {
  for (const [id, spectators] of spectatorsByMatch) {
    if (matchId && id !== matchId) continue;
    if (!spectators.delete(userId)) continue;
    if (!spectators.size) spectatorsByMatch.delete(id);
    const match = matches.get(id);
    if (match) emitToSpectators(match);
  }
}

/** Flux public, volontairement minimal : aucun identifiant de question ni
 * réponse n'est exposé. Il sert aux cartes « en direct » de l'accueil. */
export function listLiveMatches() {
  return [...matches.values()]
    .filter((match) => ["waiting_ready", "countdown", "question", "reveal", "paused"].includes(match.status))
    .map((match) => ({
      id: match.id,
      status: match.status,
      stakeCoins: match.stakeCoins,
      scoreA: match.players[0].score,
      scoreB: match.players[1].score,
      viewerCount: spectatorsByMatch.get(match.id)?.size ?? 0,
      players: match.players.map((player) => ({ username: player.username, connected: player.connected })),
    }));
}

// ── Broadcast global — enregistrement de toutes les sockets connectées ──
// Utilisé pour signaler en temps réel à tous les joueurs qu'un duel ouvert
// vient d'être publié (§duel_opened). Chaque connexion WS s'enregistre
// via registerSend() et se désenregistre via unregisterSend() à la fermeture.
const allSends = new Map<string, Send>();

export function registerSend(userId: string, send: Send) {
  allSends.set(userId, send);
}

/** Une reconnexion peut ouvrir une nouvelle socket avant que l'ancienne ne
 * reçoive son événement `close`. L'ancienne fermeture ne doit surtout pas
 * supprimer la connexion plus récente du registre. */
export function unregisterSend(userId: string, send: Send) {
  if (allSends.get(userId) === send) allSends.delete(userId);
}

/** Empêche un ancien onglet/socket remplacé de continuer à envoyer des
 * réponses ou des ordres sur le duel actif. */
export function isCurrentSend(userId: string, send: Send) {
  return allSends.get(userId) === send;
}

/** Notification métier ciblée réutilisée par les guerres de clans.
 * Le WebSocket de duel est déjà ouvert globalement dans l'application :
 * on évite donc un second canal temps réel uniquement pour ces alertes. */
export function sendToUser(userId: string, message: object) {
  allSends.get(userId)?.(message);
}

/** Liste des userId actuellement connectés via WebSocket duel. */
export function getOnlineUserIds(): string[] {
  return [...allSends.keys()];
}

/** Envoie un message à tous les joueurs connectés sauf `excludeUserId`. */
export function broadcastToAll(msg: object, excludeUserId?: string) {
  for (const [uid, sendFn] of allSends) {
    if (uid !== excludeUserId) {
      try { sendFn(msg); } catch { /* socket fermée entre-temps — ignoré */ }
    }
  }
}

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

function pauseMessage(match: Match, viewerUserId: string) {
  const pause = match.pause!;
  return {
    type: "duel_paused",
    duelMatchId: match.id,
    reason: pause.reason,
    pausedFrom: pause.from,
    expiresAt: pause.expiresAt,
    missingPlayers: match.players
      .filter((player) => pause.missingUserIds.has(player.userId))
      .map((player) => ({ username: player.username, connected: player.connected })),
    requiresYourConfirmation:
      pause.missingUserIds.has(viewerUserId) && !pause.confirmedUserIds.has(viewerUserId),
    confirmedUserIds: [...pause.confirmedUserIds],
  };
}

function emitPauseState(match: Match) {
  if (!match.pause) return;
  for (const player of match.players) player.send?.(pauseMessage(match, player.userId));
  emitToSpectators(match);
}

function defaultResumeAction(match: Match, from: ResumablePhase): Pick<MatchPause, "resumeAction" | "nextQuestionIndex"> {
  if (from === "countdown") return { resumeAction: "send_question", nextQuestionIndex: 0 };
  if (from === "reveal") {
    const nextQuestionIndex = match.index + 1;
    return nextQuestionIndex >= match.questions.length
      ? { resumeAction: "finalize" }
      : { resumeAction: "send_question", nextQuestionIndex };
  }
  return { resumeAction: "continue_phase" };
}

function remainingForPhase(match: Match, from: ResumablePhase) {
  if (from === "question") {
    return Math.max(0, (match.phaseDeadlineAt || match.questionSentAt + DUEL_TIME_PER_QUESTION_MS) - Date.now());
  }
  if (from === "countdown" || from === "reveal") {
    return Math.max(0, match.phaseDeadlineAt - Date.now());
  }
  return 90_000;
}

/**
 * Gèle réellement le duel côté serveur. Aucun chrono ni passage de manche
 * ne continue pendant l'absence : les deux clients reçoivent le même état,
 * et seul un retour confirmé peut relancer la phase exactement au temps
 * restant. Les duels contre l'ordinateur gardent leur logique dédiée.
 */
function pauseMatch(
  match: Match,
  reason: PauseReason,
  missingUserIds: string[],
  options: {
    from?: ResumablePhase;
    remainingMs?: number;
    resumeAction?: PauseResumeAction;
    nextQuestionIndex?: number;
  } = {},
) {
  if (match.botDifficulty || match.status === "done" || match.status === "resolving" || match.cancelled) return;

  // Une déconnexion pendant l'attente de préchargement d'une question
  // (§prepareQuestion) doit annuler cette attente proprement : sans ça, son
  // timeout de secours démarrerait le round quelques secondes plus tard
  // SOUS la pause qu'on est justement en train de poser.
  if (match.pendingReady) match.pendingReady.cancel();

  const now = Date.now();
  const previous = match.pause;
  const from = options.from ?? previous?.from ?? (match.status as ResumablePhase);
  if (!["waiting_ready", "countdown", "question", "reveal"].includes(from)) return;

  if (match.roundTimer) { clearTimeout(match.roundTimer); match.roundTimer = null; }
  if (match.readyTimer) { clearTimeout(match.readyTimer); match.readyTimer = null; }
  if (previous?.timeoutHandle) clearTimeout(previous.timeoutHandle);

  const missing = previous?.missingUserIds ?? new Set<string>();
  for (const userId of missingUserIds) missing.add(userId);
  const confirmed = previous?.confirmedUserIds ?? new Set<string>();
  for (const userId of missingUserIds) confirmed.delete(userId);
  for (const player of match.players) {
    if (player.connected && !missing.has(player.userId)) confirmed.add(player.userId);
  }

  const fallback = defaultResumeAction(match, from);
  const pause: MatchPause = {
    from,
    reason,
    missingUserIds: missing,
    confirmedUserIds: confirmed,
    remainingMs: options.remainingMs ?? previous?.remainingMs ?? remainingForPhase(match, from),
    startedAt: previous?.startedAt ?? now,
    expiresAt: now + PRESENCE_CONFIRM_MS,
    timeoutHandle: null,
    resumeAction: options.resumeAction ?? previous?.resumeAction ?? fallback.resumeAction,
    nextQuestionIndex: options.nextQuestionIndex ?? previous?.nextQuestionIndex ?? fallback.nextQuestionIndex,
  };

  match.pause = pause;
  match.status = "paused";
  pause.timeoutHandle = setTimeout(() => void expirePresencePause(match, pause), PRESENCE_CONFIRM_MS);
  emitPauseState(match);
}

async function expirePresencePause(match: Match, pause: MatchPause) {
  if (match.pause !== pause || match.status !== "paused") return;
  const absent = match.players.filter(
    (player) => pause.missingUserIds.has(player.userId)
      && (!player.connected || !pause.confirmedUserIds.has(player.userId)),
  );
  if (!absent.length) return resumePausedMatch(match);
  if (!match.startedAnyQuestion) {
    await refundAndCancel(match, "presence_non_confirmee_avant_depart");
    return;
  }
  if (absent.length === 1) {
    await finalizeMatch(match, absent[0]!.userId);
    return;
  }
  await refundAndCancel(match, "absence_des_deux_joueurs");
}

function resumedQuestionPayload(match: Match, player: MatchPlayer) {
  const q = match.questions[match.index];
  if (!q) return {};
  return {
    index: match.index,
    total: match.questions.length,
    questionId: q.questionId,
    text: q.text,
    mediaUrl: q.mediaUrl,
    mediaAlt: q.mediaAlt,
    categoryId: q.categoryId,
    options: q.optionsText,
    deadline: match.phaseDeadlineAt,
    alreadyAnswered: player.answered,
    chosenIndex: player.chosenIndex,
  };
}

function resumePausedMatch(match: Match) {
  const pause = match.pause;
  if (!pause || match.status !== "paused") return;
  if (match.players.some((player) => !player.connected)) return;
  if ([...pause.missingUserIds].some((userId) => !pause.confirmedUserIds.has(userId))) return;

  if (pause.timeoutHandle) clearTimeout(pause.timeoutHandle);
  match.pause = null;
  const now = Date.now();

  if (pause.resumeAction === "resolve_round") {
    match.status = "question";
    for (const player of match.players) player.send?.({ type: "duel_resumed", phase: "question", resolving: true });
    void resolveRound(match);
    return;
  }
  if (pause.resumeAction === "send_question") {
    match.status = pause.from;
    for (const player of match.players) player.send?.({ type: "duel_resumed", phase: pause.from });
    prepareQuestion(match, pause.nextQuestionIndex ?? Math.max(0, match.index + 1));
    return;
  }
  if (pause.resumeAction === "finalize") {
    match.status = "reveal";
    for (const player of match.players) player.send?.({ type: "duel_resumed", phase: "reveal" });
    match.phaseDeadlineAt = now + Math.max(0, pause.remainingMs);
    match.roundTimer = setTimeout(() => void finalizeMatch(match), Math.max(0, pause.remainingMs));
    return;
  }
  if (pause.from === "waiting_ready") {
    match.status = "waiting_ready";
    for (const player of match.players) player.send?.({ type: "duel_resumed", phase: "waiting_ready" });
    match.readyTimer = setTimeout(() => {
      if (match.status === "waiting_ready") void refundAndCancel(match, "adversaire_pas_pret");
    }, Math.max(1_000, pause.remainingMs));
    return;
  }
  if (pause.from === "question") {
    const remainingMs = Math.max(250, pause.remainingMs);
    match.status = "question";
    match.questionSentAt = now - (DUEL_TIME_PER_QUESTION_MS - remainingMs);
    match.phaseDeadlineAt = now + remainingMs;
    for (const player of match.players) {
      player.send?.({ type: "duel_resumed", phase: "question", ...resumedQuestionPayload(match, player) });
    }
    match.roundTimer = setTimeout(() => void resolveRound(match), remainingMs);
    if (match.botDifficulty) scheduleBotAnswer(match, match.questions[match.index]!);
  }
}

export function handlePresenceConfirm(userId: string) {
  const match = activeMatchByUser.get(userId);
  const pause = match?.pause;
  if (!match || !pause || match.status !== "paused") return;
  const player = playerOf(match, userId);
  if (!player.connected || !pause.missingUserIds.has(userId)) return;
  pause.confirmedUserIds.add(userId);
  for (const participant of match.players) {
    participant.send?.({
      type: "presence_confirmed",
      username: player.username,
      allReady: [...pause.missingUserIds].every((id) => pause.confirmedUserIds.has(id)),
    });
  }
  resumePausedMatch(match);
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
// Un duel ouvert (§isPublic) vit plus longtemps qu'un lien privé : il
// doit laisser le temps à quelqu'un de le découvrir en parcourant
// /duels-ouverts ou l'accueil, pas juste à la personne à qui le lien a
// été envoyé directement (19/08).
const PUBLIC_INVITE_TTL_MS = 30 * 60_000;
// Une coupure de courte durée (onglet mis en arrière-plan sur mobile,
// aléa réseau) ne doit pas faire disparaître un duel ouvert publié —
// seulement si la déconnexion dure vraiment (20/08, retour direct de
// Paul : un duel ouvert publié disparaissait sans explication).
const INVITE_DISCONNECT_GRACE_MS = 30_000;
const INVITE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sans 0/O/1/I/L, ambigus à l'oral/à l'écrit

type PendingInvite = MatchSeed & {
  code: string;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  disconnectGraceHandle: ReturnType<typeof setTimeout> | null;
  isPublic: boolean;
  createdAtMs: number;
  targetUserId?: string;
  targetUsername?: string;
};

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
  if (invite) {
    if (invite.timeoutHandle) clearTimeout(invite.timeoutHandle);
    if (invite.disconnectGraceHandle) clearTimeout(invite.disconnectGraceHandle);
    if (invite.targetUserId) allSends.get(invite.targetUserId)?.({ type: "duel_challenge_cancelled", code });
  }
  invites.delete(code);
  pendingInviteByUser.delete(userId);
}

/** Appelé depuis detachSocket : n'annule PAS l'invitation tout de suite,
 * laisse une fenêtre de grâce pour une reconnexion (onglet mis en
 * arrière-plan, aléa réseau court) — seulement si la déconnexion dure
 * vraiment, l'invitation est vraiment annulée (et remboursée par le
 * TTL normal de toute façon si personne ne revient). */
function scheduleInviteCancelIfStillDisconnected(userId: string) {
  const code = pendingInviteByUser.get(userId);
  if (!code) return;
  const invite = invites.get(code);
  if (!invite) return;
  // Un défi adressé à une personne reste affiché jusqu'à sa décision. Une
  // déconnexion du challenger ne doit pas faire disparaître la demande.
  if (invite.targetUserId) return;
  if (invite.disconnectGraceHandle) clearTimeout(invite.disconnectGraceHandle);
  invite.disconnectGraceHandle = setTimeout(() => {
    // attachSocket() aurait déjà nettoyé disconnectGraceHandle en cas de
    // reconnexion entre-temps — s'il est encore défini ici, c'est que
    // personne n'est revenu.
    if (pendingInviteByUser.get(userId) === code) cancelInvite(userId);
  }, INVITE_DISCONNECT_GRACE_MS);
}

export async function createInvite(entry: MatchSeed, isPublic = false, targetUsername?: string) {
  if (activeMatchByUser.has(entry.userId) || reserving.has(entry.userId)) {
    entry.send({ type: "error", message: "Déjà en duel" });
    return;
  }
  // Republier remplace l'ancienne invitation au lieu d'échouer avec une
  // erreur confuse — bug réel vécu le 20/08 : une invitation restée
  // pendante (test antérieur, onglet fermé sans revenir dans la fenêtre
  // de grâce) bloquait silencieusement toute nouvelle publication sans
  // que l'utilisateur comprenne pourquoi son duel ouvert n'apparaissait
  // jamais. Republier doit toujours marcher, jamais rester bloqué.
  if (pendingInviteByUser.has(entry.userId)) {
    cancelInvite(entry.userId);
  }

  const balance = await getBalance(entry.userId);
  if (balance < entry.stakeCoins) {
    entry.send({ type: "error", message: "Solde insuffisant pour cette mise" });
    return;
  }

  let target: { id: string; username: string } | null = null;
  if (targetUsername) {
    target = await prisma.user.findFirst({
      where: { username: { equals: targetUsername.trim(), mode: "insensitive" }, isBot: false },
      select: { id: true, username: true },
    });
    if (!target || target.id === entry.userId) {
      entry.send({ type: "error", message: "Joueur à défier introuvable" });
      return;
    }
    if (!allSends.has(target.id)) {
      entry.send({ type: "error", message: `${target.username} n'est plus en ligne` });
      return;
    }
    if (activeMatchByUser.has(target.id) || reserving.has(target.id)) {
      entry.send({ type: "error", message: `${target.username} est déjà en duel` });
      return;
    }
    // Un défi privé ne doit jamais être envoyé si la personne invitée ne
    // peut pas couvrir la mise. Auparavant cette vérification arrivait
    // seulement dans createMatch(), après le message `matched` : les deux
    // navigateurs ouvraient donc brièvement l'arène avant l'annulation.
    const targetBalance = await getBalance(target.id);
    if (targetBalance < entry.stakeCoins) {
      entry.send({
        type: "error",
        message: `${target.username} n'a pas les ${entry.stakeCoins.toLocaleString("fr-FR")} F nécessaires pour ce défi`,
      });
      return;
    }
  }

  const code = generateInviteCode();
  const ttlMs = isPublic ? PUBLIC_INVITE_TTL_MS : INVITE_TTL_MS;
  const timeoutHandle = target ? null : setTimeout(() => {
    if (invites.has(code)) {
      invites.delete(code);
      pendingInviteByUser.delete(entry.userId);
      entry.send({ type: "invite_expired" });
    }
  }, ttlMs);

  invites.set(code, { ...entry, code, timeoutHandle, disconnectGraceHandle: null, isPublic, createdAtMs: Date.now(), targetUserId: target?.id, targetUsername: target?.username });
  pendingInviteByUser.set(entry.userId, code);
  entry.send({ type: "invite_created", code, expiresInMs: target ? null : ttlMs, isPublic, direct: Boolean(target), targetUsername: target?.username, persistent: Boolean(target) });

  if (target) {
    allSends.get(target.id)?.({ type: "duel_challenge", code, username: entry.username, stakeCoins: entry.stakeCoins, createdAtMs: Date.now(), persistent: true });
    // Push : le défi reste affiché tant qu'il n'est pas traité (§ci-dessus),
    // mais encore faut-il que le joueur visé ait l'app ouverte pour le voir.
    void sendPush(target.id, {
      title: "Nouveau défi",
      body: `${entry.username} te défie pour ${entry.stakeCoins.toLocaleString("fr-FR")} F`,
      url: `/duel?invite=${code}`,
      tag: `duel-challenge-${code}`,
    });
  }

  // Signaler à tous les joueurs connectés qu'un nouveau duel ouvert est disponible
  if (isPublic) {
    broadcastToAll(
      { type: "duel_opened", username: entry.username, stakeCoins: entry.stakeCoins, code },
      entry.userId, // ne pas envoyer au créateur lui-même
    );
  }
}

/** Liste des duels ouverts (§GET /api/duel/open, REST — la page "duels
 * ouverts" et l'accueil interrogent, pas de canal WS dédié pour ça, même
 * principe que le bracket de tournoi §tournament/routes.ts). */
export function listOpenInvites() {
  const now = Date.now();
  return [...invites.values()]
    .filter((inv) => inv.isPublic)
    .map((inv) => ({
      code: inv.code,
      userId: inv.userId,
      username: inv.username,
      eloRating: inv.eloRating,
      stakeCoins: inv.stakeCoins,
      prizeCoins: duelWinnerPayout(inv.stakeCoins), // ce que le vainqueur emporte — même formule que finalizeMatch
      createdAtMs: inv.createdAtMs,
      expiresInMs: Math.max(0, PUBLIC_INVITE_TTL_MS - (now - inv.createdAtMs)),
    }))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

/** Consultation d'une invitation par son code (§GET /api/duel/invite/:code)
 * — bug réel du 31/08 : l'écran d'acceptation d'un lien privé affichait la
 * mise par défaut du formulaire (500 F) au lieu de la vraie mise fixée par
 * le créateur (ex. 100 F), car rien ne renvoyait jamais cette information
 * avant l'acceptation. Le débit réel restait correct (le serveur utilise
 * toujours `invite.stakeCoins`), mais le joueur validait "à l'aveugle" un
 * montant affiché faux — inacceptable sur une appli d'argent réel. */
export function getInviteInfo(code: string) {
  const invite = invites.get(code.trim().toUpperCase());
  if (!invite) return null;
  return {
    code: invite.code,
    hostUsername: invite.username,
    stakeCoins: invite.stakeCoins,
    isPublic: invite.isPublic,
    direct: Boolean(invite.targetUserId),
  };
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
  if (invite.targetUserId && invite.targetUserId !== entry.userId) {
    entry.send({ type: "error", message: "Cette invitation est réservée à un autre joueur" });
    return;
  }
  if (activeMatchByUser.has(invite.userId) || reserving.has(invite.userId)) {
    // L'hôte s'est engagé ailleurs entre-temps (queue publique, autre
    // invitation acceptée en double onglet…) — l'invitation est caduque.
    if (invite.timeoutHandle) clearTimeout(invite.timeoutHandle);
    invites.delete(code);
    pendingInviteByUser.delete(invite.userId);
    entry.send({ type: "error", message: "Invitation invalide ou expirée" });
    return;
  }

  if (invite.targetUserId && !allSends.has(invite.userId)) {
    entry.send({ type: "error", message: `${invite.username} est temporairement hors ligne. Le défi reste disponible.` });
    return;
  }

  // Verrou pris avant toute lecture de solde : deux invitations acceptées
  // dans le même tick ne peuvent ni former deux matchs ni débiter deux fois.
  reserving.add(entry.userId);
  reserving.add(invite.userId);

  // Seconde garde au moment de l'acceptation : un solde peut changer entre
  // l'envoi du défi et le clic « Accepter ». L'invitation publique reste
  // disponible si seul ce candidat n'a pas assez d'argent.
  try {
    const [hostBalance, guestBalance] = await Promise.all([
      getBalance(invite.userId),
      getBalance(entry.userId),
    ]);
    if (guestBalance < invite.stakeCoins) {
      entry.send({ type: "error", message: `Il te faut ${invite.stakeCoins.toLocaleString("fr-FR")} F pour accepter ce duel` });
      return;
    }
    if (hostBalance < invite.stakeCoins) {
      if (invite.timeoutHandle) clearTimeout(invite.timeoutHandle);
      if (invite.disconnectGraceHandle) clearTimeout(invite.disconnectGraceHandle);
      invites.delete(code);
      pendingInviteByUser.delete(invite.userId);
      entry.send({ type: "error", message: "Ce duel n'est plus disponible : son créateur n'a plus assez de solde" });
      invite.send({ type: "duel_cancelled", reason: "solde_insuffisant" });
      return;
    }

    // Accepter ce défi refuse automatiquement toutes les autres demandes
    // encore adressées au même joueur, côté destinataire et challenger.
    for (const [otherCode, otherInvite] of [...invites]) {
      if (otherCode === code || otherInvite.targetUserId !== entry.userId) continue;
      if (otherInvite.timeoutHandle) clearTimeout(otherInvite.timeoutHandle);
      if (otherInvite.disconnectGraceHandle) clearTimeout(otherInvite.disconnectGraceHandle);
      invites.delete(otherCode);
      pendingInviteByUser.delete(otherInvite.userId);
      otherInvite.send({ type: "invite_declined", username: otherInvite.targetUsername, reason: "accepted_other" });
      allSends.get(entry.userId)?.({ type: "duel_challenge_cancelled", code: otherCode, reason: "accepted_other" });
    }

    if (invite.timeoutHandle) clearTimeout(invite.timeoutHandle);
    if (invite.disconnectGraceHandle) clearTimeout(invite.disconnectGraceHandle);
    invites.delete(code);
    pendingInviteByUser.delete(invite.userId);
    allSends.get(entry.userId)?.({ type: "duel_challenge_accepted", code });

    entry.send({ type: "queued" });
    await createMatch(invite, entry);
  } finally {
    reserving.delete(entry.userId);
    reserving.delete(invite.userId);
  }
}

export function declineInvite(userId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  const invite = invites.get(code);
  if (!invite || invite.targetUserId !== userId) return;
  if (invite.timeoutHandle) clearTimeout(invite.timeoutHandle);
  if (invite.disconnectGraceHandle) clearTimeout(invite.disconnectGraceHandle);
  invites.delete(code);
  pendingInviteByUser.delete(invite.userId);
  invite.send({ type: "invite_declined", username: invite.targetUsername });
  allSends.get(userId)?.({ type: "duel_challenge_declined", code });
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
    countdownSentAt: 0,
    countdownSeconds: 0,
    phaseDeadlineAt: 0,
    roundTimer: null,
    readyTimer: null,
    pendingReady: null,
    cancelled: false,
    awaitingReconnect: false,
    pause: null,
    botDifficulty: entry.difficulty,
    tournamentMatchId: null,
    players: [
      { userId: entry.userId, username: entry.username, eloRating: entry.eloRating, send: entry.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0, disconnectCount: 0, ready: false },
      { userId: botUserId, username: botUsername(entry.difficulty), eloRating: 1000, send: null, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0, disconnectCount: 0, ready: false },
    ],
  };
  matches.set(match.id, match);
  activeMatchByUser.set(entry.userId, match);

  let debitTx: { id: string } | null = null;
  // Mode entraînement sans mise (stakeCoins = 0) : pas de débit, aucune
  // transaction à créer (un STAKE à 0 serait un bruit inutile dans le ledger).
  if (match.stakeCoins > 0) {
    try {
      debitTx = await debit({ userId: entry.userId, type: "STAKE", amountCoins: match.stakeCoins, duelMatchId: match.id });
    } catch (err) {
      if (!(err instanceof InsufficientBalanceError)) throw err;
      await prisma.duelMatch.update({ where: { id: match.id }, data: { status: "CANCELLED", completedAt: new Date() } });
      cleanupMatch(match);
      entry.send({ type: "duel_cancelled", reason: "solde_insuffisant" });
      return;
    }
  }

  if (match.cancelled) {
    // Le joueur s'est déconnecté pendant le débit — personne à notifier,
    // mais on rembourse quand même (le débit, lui, a bien eu lieu).
    if (debitTx) await credit({ userId: entry.userId, type: "REFUND", amountCoins: match.stakeCoins, duelMatchId: match.id, relatedTransactionId: debitTx.id, metadata: { reason: "left_before_start" } });
    await prisma.duelMatch.update({ where: { id: match.id }, data: { status: "CANCELLED", completedAt: new Date() } });
    cleanupMatch(match);
    return;
  }

  try {
    const rawQuestions = await pickQuestions(match.categoryId, entry.userId, DUEL_ROUND_SIZE);
    if (!rawQuestions || rawQuestions.length === 0) throw new Error("Aucune question disponible");
    match.questions = rawQuestions.map((q) => {
      const { text, permutation } = shuffledOptions(q.options);
      return { questionId: q.id, text: q.textFr, mediaUrl: q.mediaUrl, mediaAlt: q.mediaAlt, optionsText: text, permutation, answerIndex: q.answerIndex, categoryId: q.categoryId };
    });
    await prisma.duelMatch.update({
      where: { id: match.id },
      data: { status: "IN_PROGRESS", questionIds: match.questions.map((q) => q.questionId) },
    });
  } catch (err) {
    console.error("[startBotDuel] Erreur préparation questions :", err);
    if (debitTx) {
      await credit({ userId: entry.userId, type: "REFUND", amountCoins: match.stakeCoins, duelMatchId: match.id, relatedTransactionId: debitTx.id, metadata: { reason: "server_error" } })
        .catch((e) => console.error("[startBotDuel] Erreur remboursement urgence :", e));
    }
    await prisma.duelMatch.update({ where: { id: match.id }, data: { status: "CANCELLED", completedAt: new Date() } }).catch(() => {});
    cleanupMatch(match);
    entry.send({ type: "duel_cancelled", reason: "erreur_serveur" });
    return;
  }

  // L'arène ne s'ouvre qu'une fois la mise débitée et les questions prêtes.
  // Aucun écran de duel fantôme en cas de solde insuffisant ou d'erreur DB.
  entry.send({
    type: "matched",
    duelMatchId: match.id,
    categoryId: match.categoryId,
    stakeCoins: match.stakeCoins,
    opponent: { username: match.players[1].username, eloRating: match.players[1].eloRating },
  });

  match.status = "countdown";
  match.countdownSentAt = Date.now();
  match.countdownSeconds = 3;
  match.phaseDeadlineAt = match.countdownSentAt + 3_200;
  entry.send({ type: "countdown", seconds: 3 });
  match.roundTimer = setTimeout(() => {
    if (!match.cancelled) prepareQuestion(match, 0);
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
    countdownSentAt: 0,
    countdownSeconds: 0,
    phaseDeadlineAt: 0,
    roundTimer: null,
    readyTimer: null,
    pendingReady: null,
    cancelled: false,
    awaitingReconnect: false,
    pause: null,
    botDifficulty: null,
    tournamentMatchId: null,
    players: [
      { userId: a.userId, username: a.username, eloRating: a.eloRating, send: a.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0, disconnectCount: 0, ready: false },
      { userId: b.userId, username: b.username, eloRating: b.eloRating, send: b.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0, disconnectCount: 0, ready: false },
    ],
  };
  matches.set(match.id, match);
  activeMatchByUser.set(a.userId, match);
  activeMatchByUser.set(b.userId, match);

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

  // Toute erreur ici (DB, questions indisponibles…) est attrapée pour garantir
  // que les clients ne restent jamais bloqués sur le Loader/countdown indéfiniment.
  try {
    const rawQuestions = await pickQuestions(null, [a.userId, b.userId], DUEL_ROUND_SIZE);
    if (!rawQuestions || rawQuestions.length === 0) throw new Error("Aucune question disponible");
    match.questions = rawQuestions.map((q) => {
      const { text, permutation } = shuffledOptions(q.options);
      return { questionId: q.id, text: q.textFr, mediaUrl: q.mediaUrl, mediaAlt: q.mediaAlt, optionsText: text, permutation, answerIndex: q.answerIndex, categoryId: q.categoryId };
    });
    await prisma.duelMatch.update({
      where: { id: match.id },
      data: { status: "IN_PROGRESS", questionIds: match.questions.map((q) => q.questionId) },
    });
  } catch (err) {
    console.error("[createMatch] Erreur préparation questions :", err);
    // Rembourser les deux joueurs et signaler l'annulation côté client
    await Promise.all([
      credit({ userId: a.userId, type: "REFUND", amountCoins: match.stakeCoins, duelMatchId: match.id, relatedTransactionId: debitA!.id, metadata: { reason: "server_error" } }),
      credit({ userId: b.userId, type: "REFUND", amountCoins: match.stakeCoins, duelMatchId: match.id, relatedTransactionId: debitB!.id, metadata: { reason: "server_error" } }),
    ]).catch((e) => console.error("[createMatch] Erreur remboursement urgence :", e));
    await prisma.duelMatch.update({ where: { id: match.id }, data: { status: "CANCELLED", completedAt: new Date() } }).catch(() => {});
    cleanupMatch(match);
    match.players[0].send?.({ type: "duel_cancelled", reason: "erreur_serveur" });
    match.players[1].send?.({ type: "duel_cancelled", reason: "erreur_serveur" });
    return;
  }

  // `matched` est volontairement le dernier feu vert : GlobalDuelWatcher
  // navigue immédiatement vers /duel/play dès qu'il le reçoit.
  a.send({ type: "matched", duelMatchId: match.id, categoryId: match.categoryId, stakeCoins: match.stakeCoins, opponent: { username: b.username, eloRating: b.eloRating } });
  b.send({ type: "matched", duelMatchId: match.id, categoryId: match.categoryId, stakeCoins: match.stakeCoins, opponent: { username: a.username, eloRating: a.eloRating } });

  // Phase "Prêt" : les deux joueurs voient l'écran avec le nom de l'adversaire
  // et doivent cliquer "Prêt !" avant que le countdown ne démarre. Ce clic
  // est un geste utilisateur garanti → AudioContext se réveille → son joué.
  // Timeout de 90 s : si l'un des deux ne répond pas, on annule et rembourse.
  const READY_TIMEOUT_MS = 90_000;
  match.status = "waiting_ready";
  match.phaseDeadlineAt = Date.now() + READY_TIMEOUT_MS;
  match.players[0].send?.({ type: "waiting_ready" });
  match.players[1].send?.({ type: "waiting_ready" });
  match.readyTimer = setTimeout(() => {
    if (match.status === "waiting_ready") void refundAndCancel(match, "adversaire_pas_pret");
  }, READY_TIMEOUT_MS);
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

async function createTournamentMatch(tournamentMatchId: string, categoryIdOrNull: string | null, a: TournamentWaiter, b: TournamentWaiter) {
  // Tournoi créé sans catégorie (19/08) => questions mélangées, comme un
  // duel PvP normal (§MIXED_CATEGORY) ; DuelMatch.categoryId n'a pas de
  // contrainte de clé étrangère donc ce repli est sûr, mais pickQuestions
  // reçoit bien `null` en dessous — c'est LUI qui décide du mélange.
  const categoryId = categoryIdOrNull ?? MIXED_CATEGORY;
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
    countdownSentAt: 0,
    countdownSeconds: 0,
    phaseDeadlineAt: 0,
    roundTimer: null,
    readyTimer: null,
    pendingReady: null,
    cancelled: false,
    awaitingReconnect: false,
    pause: null,
    botDifficulty: null,
    tournamentMatchId,
    players: [
      { userId: a.userId, username: a.username, eloRating: a.eloRating, send: a.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0, disconnectCount: 0, ready: false },
      { userId: b.userId, username: b.username, eloRating: b.eloRating, send: b.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0, disconnectCount: 0, ready: false },
    ],
  };
  matches.set(match.id, match);
  activeMatchByUser.set(a.userId, match);
  activeMatchByUser.set(b.userId, match);

  match.players[0].send?.({ type: "matched", duelMatchId: match.id, categoryId, stakeCoins: 0, opponent: { username: b.username, eloRating: b.eloRating } });
  match.players[1].send?.({ type: "matched", duelMatchId: match.id, categoryId, stakeCoins: 0, opponent: { username: a.username, eloRating: a.eloRating } });

  try {
    const rawQuestions = await pickQuestions(categoryIdOrNull, [a.userId, b.userId], DUEL_ROUND_SIZE);
    if (!rawQuestions || rawQuestions.length === 0) throw new Error("Aucune question disponible");
    match.questions = rawQuestions.map((q) => {
      const { text, permutation } = shuffledOptions(q.options);
      return { questionId: q.id, text: q.textFr, mediaUrl: q.mediaUrl, mediaAlt: q.mediaAlt, optionsText: text, permutation, answerIndex: q.answerIndex, categoryId: q.categoryId };
    });
    await prisma.duelMatch.update({
      where: { id: match.id },
      data: { status: "IN_PROGRESS", questionIds: match.questions.map((q) => q.questionId) },
    });
  } catch (err) {
    console.error("[createTournamentMatch] Erreur préparation questions :", err);
    cleanupMatch(match);
    match.players[0].send?.({ type: "duel_cancelled", reason: "erreur_serveur" });
    match.players[1].send?.({ type: "duel_cancelled", reason: "erreur_serveur" });
    return;
  }

  const TOURNEY_PREP = 10;
  match.countdownSentAt = Date.now();
  match.countdownSeconds = TOURNEY_PREP;
  match.phaseDeadlineAt = match.countdownSentAt + TOURNEY_PREP * 1000 + 500;
  match.players[0].send?.({ type: "countdown", seconds: TOURNEY_PREP });
  match.players[1].send?.({ type: "countdown", seconds: TOURNEY_PREP });
  match.roundTimer = setTimeout(() => {
    if (!match.cancelled) prepareQuestion(match, 0);
  }, TOURNEY_PREP * 1000 + 500);
}

// ── Confrontation de guerre de clans ────────────────────────────────
// Même moteur de questions qu'un tournoi, mais sans mise et sans ELO.
const clanWarPending = new Map<string, TournamentWaiter>();

export async function resolveClanWarWalkover(clanWarMatchId: string) {
  const row = await prisma.clanWarMatch.findUnique({ where: { id: clanWarMatchId } });
  if (!row || row.status === "COMPLETED" || row.status === "FORFEIT") return;
  const waiter = clanWarPending.get(clanWarMatchId);
  clanWarPending.delete(clanWarMatchId);
  await notifyClanWarMatchDone(clanWarMatchId, waiter?.userId ?? null);
}

export async function enterClanWarMatch(entry: TournamentWaiter, clanWarMatchId: string) {
  if (activeMatchByUser.has(entry.userId)) return entry.send({ type: "error", message: "Déjà en duel" });
  const row = await prisma.clanWarMatch.findUnique({ where: { id: clanWarMatchId }, include: { war: true } });
  if (!row || (row.playerAId !== entry.userId && row.playerBId !== entry.userId)) return entry.send({ type: "error", message: "Confrontation de clan introuvable" });
  if (row.war.status !== "IN_PROGRESS" || !row.war.endsAt || row.war.endsAt <= new Date()) return entry.send({ type: "error", message: "Cette guerre est terminée" });
  if (row.status === "IN_PROGRESS" || row.status === "COMPLETED" || row.status === "FORFEIT") return;
  const waiter = clanWarPending.get(clanWarMatchId);
  if (!waiter) {
    clanWarPending.set(clanWarMatchId, entry);
    entry.send({ type: "clan_war_waiting", endsAt: row.war.endsAt });
    return;
  }
  if (waiter.userId === entry.userId) {
    clanWarPending.set(clanWarMatchId, entry);
    entry.send({ type: "clan_war_waiting", endsAt: row.war.endsAt });
    return;
  }
  clanWarPending.delete(clanWarMatchId);
  await createClanWarDuel(clanWarMatchId, row.warId, waiter, entry);
}

async function createClanWarDuel(clanWarMatchId: string, clanWarId: string, a: TournamentWaiter, b: TournamentWaiter) {
  const categoryId = MIXED_CATEGORY;
  const dbRow = await prisma.duelMatch.create({ data: { categoryId, stakeCoins: 0, playerAId: a.userId, playerBId: b.userId } });
  await prisma.clanWarMatch.update({ where: { id: clanWarMatchId }, data: { status: "IN_PROGRESS", duelMatchId: dbRow.id } });
  const match: Match = {
    id: dbRow.id, categoryId, stakeCoins: 0, questions: [], index: -1, status: "countdown",
    startedAnyQuestion: false, questionSentAt: 0, countdownSentAt: 0, countdownSeconds: 0, phaseDeadlineAt: 0,
    roundTimer: null, readyTimer: null,
    pendingReady: null, cancelled: false, awaitingReconnect: false, pause: null,
    botDifficulty: null, tournamentMatchId: null, clanWarMatchId, clanWarId,
    players: [
      { userId: a.userId, username: a.username, eloRating: a.eloRating, send: a.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0, disconnectCount: 0, ready: false },
      { userId: b.userId, username: b.username, eloRating: b.eloRating, send: b.send, connected: true, disconnectTimer: null, score: 0, answered: false, chosenIndex: null, answeredAt: null, totalResponseMs: 0, disconnectCount: 0, ready: false },
    ],
  };
  matches.set(match.id, match); activeMatchByUser.set(a.userId, match); activeMatchByUser.set(b.userId, match);
  try {
    const rawQuestions = await pickQuestions(null, [a.userId, b.userId], DUEL_ROUND_SIZE);
    match.questions = rawQuestions.map((q) => { const { text, permutation } = shuffledOptions(q.options); return { questionId: q.id, text: q.textFr, mediaUrl: q.mediaUrl, mediaAlt: q.mediaAlt, optionsText: text, permutation, answerIndex: q.answerIndex, categoryId: q.categoryId }; });
    await prisma.duelMatch.update({ where: { id: match.id }, data: { status: "IN_PROGRESS", questionIds: match.questions.map((q) => q.questionId) } });
  } catch (err) {
    console.error("[createClanWarDuel] préparation impossible", err); cleanupMatch(match);
    await notifyClanWarMatchDone(clanWarMatchId, null); return;
  }
  match.players[0].send?.({ type: "matched", duelMatchId: match.id, categoryId, stakeCoins: 0, clanWarMatchId, clanWarId, opponent: { username: b.username, eloRating: b.eloRating } });
  match.players[1].send?.({ type: "matched", duelMatchId: match.id, categoryId, stakeCoins: 0, clanWarMatchId, clanWarId, opponent: { username: a.username, eloRating: a.eloRating } });
  const prepSeconds = 10; match.countdownSentAt = Date.now(); match.countdownSeconds = prepSeconds; match.phaseDeadlineAt = match.countdownSentAt + prepSeconds * 1000 + 500;
  match.players[0].send?.({ type: "countdown", seconds: prepSeconds }); match.players[1].send?.({ type: "countdown", seconds: prepSeconds });
  match.roundTimer = setTimeout(() => { if (!match.cancelled) prepareQuestion(match, 0); }, prepSeconds * 1000 + 500);
}

// ── Déroulé question par question ──────────────────────────────────────

/**
 * Point d'entrée UNIQUE pour lancer une question — remplace tous les
 * appels directs à `sendQuestion(match, index)` (30/08/2026).
 *
 * Avant, le serveur envoyait la question ET démarrait le chrono partagé
 * dans le même geste : si l'image d'un joueur mettait plus longtemps à
 * charger que celle de son adversaire (réseau plus lent, cache froid…),
 * ce joueur perdait réellement des secondes de réponse pendant que son
 * écran affichait encore un chargement — sur un duel avec de l'argent
 * réel, c'est un vrai désavantage, pas juste un défaut visuel.
 *
 * Ici, la question (texte, options, média) est envoyée sans chrono. Les
 * DEUX joueurs doivent confirmer ("question_ready") avoir fini de
 * charger avant que `sendQuestion` — INCHANGÉ — ne soit appelé pour de
 * bon et n'arme le chrono partagé. Un joueur qui répond à un bot n'a
 * jamais besoin d'attendre : le bot n'affiche rien, il est toujours
 * "prêt" immédiatement. `QUESTION_READY_TIMEOUT_MS` est le filet de
 * sécurité : au-delà, le round démarre quoi qu'il arrive — un client
 * bloqué ou déconnecté pendant cette fenêtre est alors détecté et mis
 * en pause par les garde-fous déjà existants dans `sendQuestion` lui-même
 * (vérification `disconnected.length` en tout début de fonction),
 * inchangés eux aussi.
 */
function prepareQuestion(match: Match, index: number) {
  if (match.cancelled) return;
  const q = match.questions[index];
  if (!q) return;

  const waitingForUserIds = match.botDifficulty
    ? [match.players[0].userId] // seul le joueur humain charge quoi que ce soit face à un bot
    : match.players.map((p) => p.userId);

  for (const p of match.players) {
    p.send?.({ type: "question_preload", questionId: q.questionId, mediaUrl: q.mediaUrl, categoryId: q.categoryId, index, total: match.questions.length });
  }

  const readyUserIds = new Set<string>();
  // Un seul indicateur ferme les trois portes à la fois : le timeout de
  // secours, un `notify()` tardif (message reçu juste après coup) et un
  // `cancel()` externe (§pauseMatch — une déconnexion pendant l'attente ne
  // doit JAMAIS laisser ce timeout démarrer le round sous une pause active).
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutHandle);
    match.pendingReady = null;
    sendQuestion(match, index);
  };
  const timeoutHandle = setTimeout(finish, QUESTION_READY_TIMEOUT_MS);
  match.pendingReady = {
    questionId: q.questionId,
    readyUserIds,
    notify: () => {
      if (waitingForUserIds.every((uid) => readyUserIds.has(uid))) finish();
    },
    cancel: () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      match.pendingReady = null;
    },
  };
}

/** Reçoit la confirmation de préchargement d'un joueur pour la question en
 * attente de démarrage. Ignore silencieusement tout message hors contexte
 * (mauvais questionId, pas de préparation en cours) : un message tardif ou
 * dupliqué ne doit jamais faire planter le duel. */
export function handleQuestionReady(userId: string, questionId: string) {
  const match = activeMatchByUser.get(userId);
  if (!match?.pendingReady || match.pendingReady.questionId !== questionId) return;
  match.pendingReady.readyUserIds.add(userId);
  match.pendingReady.notify();
}

function sendQuestion(match: Match, index: number) {
  const disconnected = match.botDifficulty ? [] : match.players.filter((player) => !player.connected);
  if (disconnected.length) {
    pauseMatch(match, "connection_lost", disconnected.map((player) => player.userId), {
      from: match.index >= 0 ? "reveal" : "countdown",
      remainingMs: 0,
      resumeAction: "send_question",
      nextQuestionIndex: index,
    });
    return;
  }
  if (match.roundTimer) { clearTimeout(match.roundTimer); match.roundTimer = null; }
  match.index = index;
  match.status = "question";
  match.startedAnyQuestion = true;
  match.questionSentAt = Date.now();
  match.phaseDeadlineAt = match.questionSentAt + DUEL_TIME_PER_QUESTION_MS;
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
    mediaUrl: q.mediaUrl,
    mediaAlt: q.mediaAlt,
    categoryId: q.categoryId,
    options: q.optionsText,
    deadline: match.phaseDeadlineAt,
  };
  match.players[0].send?.(payload);
  match.players[1].send?.(payload);
  emitToSpectators(match);

  match.roundTimer = setTimeout(() => resolveRound(match), DUEL_TIME_PER_QUESTION_MS);

  if (match.botDifficulty) scheduleBotAnswer(match, q);
}

/**
 * Estime la complexité d'une question à partir de son texte (0 = simple,
 * 1 = très complexe). Utilisé pour moduler l'accuracy de l'IA par question
 * plutôt qu'un taux fixe — comportement plus humain et moins prédictible.
 *
 * Heuristiques (pas de NLP, pas de réseau, O(n) sur le texte) :
 *  - longueur moyenne des mots (> 8 car. = vocabulaire technique/spécifique)
 *  - proportion de mots "longs" dans la question
 *  - longueur totale de la question (questions courtes souvent plus directes)
 */
function questionComplexity(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0.5;
  const avgLen = words.reduce((s, w) => s + w.replace(/[^a-zA-ZÀ-ÿ]/g, "").length, 0) / words.length;
  const longFrac = words.filter((w) => w.replace(/[^a-zA-ZÀ-ÿ]/g, "").length > 8).length / words.length;
  // Complexité ∈ [0, 1] ; calibré pour du français (~5 car/mot en moyenne)
  const raw = ((avgLen - 4) / 7) * 0.55 + longFrac * 0.45;
  return Math.min(1, Math.max(0, raw));
}

/**
 * Accuracy réelle de l'IA pour cette question spécifique.
 * Questions simples → au-dessus de la base ; questions complexes → en dessous.
 * Plage de variation : ±0.22 autour de l'accuracy de base du niveau.
 */
function dynamicAccuracy(base: number, complexity: number): number {
  // complexity 0 → +0.22 ; complexity 1 → -0.22 ; complexity 0.5 → ±0
  const adj = (0.5 - complexity) * 0.44;
  return Math.max(0.05, Math.min(0.95, base + adj));
}

/** L'ordinateur "répond" après un délai qui dépend de la difficulté ET de
 * la complexité de la question — jamais instantané (§ANTICHEAT_SPEC.md :
 * un temps de réponse nul est le signe d'un bot… ce qu'il est, mais rien
 * ne doit le trahir côté protocole, le client ne fait aucune différence
 * avec un humain). Questions complexes → l'IA "réfléchit" plus longtemps. */
function scheduleBotAnswer(match: Match, q: MatchQuestion) {
  const bot = match.players[1];
  const params = BOT_PARAMS[match.botDifficulty!];
  const complexity = questionComplexity(q.text);

  // Le temps de réflexion de l'IA augmente avec la complexité de la question
  const thinkBase = params.minMs + Math.random() * (params.maxMs - params.minMs);
  const complexityBonus = complexity * (params.maxMs - params.minMs) * 0.4;
  const thinkMs = Math.min(thinkBase + complexityBonus, DUEL_TIME_PER_QUESTION_MS - 300);

  const acc = dynamicAccuracy(params.accuracy, complexity);

  setTimeout(() => {
    if (match.status !== "question" || match.questions[match.index] !== q) return; // round déjà résolu
    const correct = Math.random() < acc;
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

/** Les deux joueurs ont cliqué "Prêt !" → countdown 5 s → première question.
 * Idempotent : un double-clic ou un message dupliqué ne relance pas le
 * countdown. L'adversaire est notifié dès qu'un seul joueur clique (pour
 * afficher "l'adversaire est prêt" côté UI). */
export function handleReady(userId: string) {
  const match = activeMatchByUser.get(userId);
  if (!match || match.status !== "waiting_ready") return;
  const player = playerOf(match, userId);
  if (player.ready) return; // idempotent
  player.ready = true;
  otherPlayer(match, userId).send?.({ type: "opponent_ready" });

  if (match.players[0].ready && match.players[1].ready) {
    if (match.readyTimer) { clearTimeout(match.readyTimer); match.readyTimer = null; }
    match.status = "countdown";
    const PREP_SECONDS = 5; // court — les joueurs ont déjà eu le temps de se préparer
    match.countdownSentAt = Date.now();
    match.countdownSeconds = PREP_SECONDS;
    match.phaseDeadlineAt = match.countdownSentAt + PREP_SECONDS * 1000 + 500;
    match.players[0].send?.({ type: "countdown", seconds: PREP_SECONDS });
    match.players[1].send?.({ type: "countdown", seconds: PREP_SECONDS });
    match.roundTimer = setTimeout(() => {
      if (!match.cancelled) prepareQuestion(match, 0);
    }, PREP_SECONDS * 1000 + 500);
  }
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
  // La fenêtre visible dure exactement DUEL_TIME_PER_QUESTION_MS. La marge
  // réseau sert à résoudre les paquets en vol, pas à accepter un nouveau
  // clic effectué après la fin du chronomètre.
  if (Date.now() > match.phaseDeadlineAt) return;

  const player = playerOf(match, userId);
  recordAnswer(match, player, chosenIndex);
}

/** Enregistre la proposition courante. Un nouveau clic avant l'échéance
 * remplace le précédent ; la dernière proposition reçue par le serveur
 * est la seule comptabilisée. La manche reste ouverte jusqu'au timer afin
 * que l'adversaire ne puisse pas couper ce droit en répondant rapidement. */
function recordAnswer(match: Match, player: MatchPlayer, chosenIndex: number) {
  const firstAnswer = !player.answered;
  player.answered = true;
  player.chosenIndex = chosenIndex;
  player.answeredAt = Date.now();

  if (firstAnswer) otherPlayer(match, player.userId).send?.({ type: "opponent_answered" });
}

async function resolveRound(match: Match) {
  if (match.status !== "question") return; // déjà résolu (course timer/réponse simultanée)
  if (match.roundTimer) { clearTimeout(match.roundTimer); match.roundTimer = null; }

  // Une seule absence de réponse dans un duel humain déclenche une vraie
  // vérification de présence. La réponse de la manche reste nulle (le chrono
  // est terminé), mais la partie n'avance pas tant que le joueur n'a pas
  // confirmé son retour. Deux non-réponses simultanées restent une manche
  // blanche afin d'éviter qu'un joueur puisse retenir l'autre indéfiniment.
  const unanswered = match.botDifficulty ? [] : match.players.filter((player) => !player.answered);
  if (unanswered.length === 1) {
    const absent = unanswered[0]!;
    absent.answered = true;
    absent.chosenIndex = -1;
    absent.answeredAt = match.phaseDeadlineAt;
    pauseMatch(match, "missing_answer", [absent.userId], {
      from: "question",
      remainingMs: 0,
      resumeAction: "resolve_round",
    });
    return;
  }

  match.status = "reveal";
  const q = match.questions[match.index]!;

  const results: Record<string, { correct: boolean; chosenIndex: number; responseMs: number }> = {};
  for (const p of match.players) {
    const chosen = p.answered ? p.chosenIndex! : -1;
    const canonical = chosen >= 0 ? q.permutation[chosen] : -1;
    const correct = canonical === q.answerIndex;
    const responseMs = p.answered ? Math.max(0, p.answeredAt! - match.questionSentAt) : DUEL_TIME_PER_QUESTION_MS;
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
  const isLast = match.index + 1 >= match.questions.length;

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
      // Côté client : démarre un compte à rebours de ROUND_GRACE_MS avant
      // la prochaine question. 0 si c'est la dernière (→ fin de partie).
      nextInMs: isLast ? 0 : ROUND_GRACE_MS,
    });
  }
  emitToSpectators(match);
  match.phaseDeadlineAt = Date.now() + ROUND_GRACE_MS;
  const disconnected = match.botDifficulty ? [] : match.players.filter((player) => !player.connected);
  if (disconnected.length) {
    pauseMatch(match, "connection_lost", disconnected.map((player) => player.userId), {
      from: "reveal",
      remainingMs: ROUND_GRACE_MS,
      resumeAction: isLast ? "finalize" : "send_question",
      nextQuestionIndex: isLast ? undefined : match.index + 1,
    });
  } else if (isLast) {
    match.roundTimer = setTimeout(() => void finalizeMatch(match), ROUND_GRACE_MS);
  } else {
    match.roundTimer = setTimeout(() => {
      if (!match.cancelled) prepareQuestion(match, match.index + 1);
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
  // Signalé au client (§duel_result ci-dessous) pour que l'écran de
  // résultat explique le "1-1 → VICTOIRE" au lieu de ressembler à un bug
  // (retour Paul du 31/08 : score identique affiché à côté de "VICTOIRE",
  // incompréhensible sans ce contexte).
  let decidedBySpeed = false;
  if (forfeitedBy) {
    resultA = forfeitedBy === pa.userId ? "loss" : "win";
  } else {
    resultA = duelResultOf(pa.score, pb.score);
    // Retour Paul du 31/08 : "en cas d'égalité il y a égalité" — un score
    // identique en duel normal (file d'attente, invitation entre amis,
    // duel ouvert) est désormais un vrai nul, mise remboursée aux deux
    // (§duelDrawPayout), exactement comme contre l'ordinateur.
    //
    // Le départage par rapidité de réponse reste nécessaire UNIQUEMENT
    // pour un match de tournoi ou de guerre de clans : la structure d'un
    // bracket ne supporte pas "les deux avancent" ni "match nul" — un
    // winnerId null y bloquait littéralement le tournoi (bug du 19/08,
    // cf. plus bas "impossible par construction"). Ça reste donc un
    // départage technique de bracket, pas une règle de duel normal.
    if (resultA === "draw" && !match.botDifficulty && (match.tournamentMatchId || match.clanWarMatchId)) {
      decidedBySpeed = true;
      if (pa.totalResponseMs !== pb.totalResponseMs) {
        resultA = pa.totalResponseMs < pb.totalResponseMs ? "win" : "loss";
      } else {
        // Égalité parfaite jusque dans le temps de réponse (ex. 0-0,
        // aucun des deux n'a jamais répondu) : dernier recours
        // déterministe, jamais de nul en multijoueur.
        resultA = pa.userId < pb.userId ? "win" : "loss";
      }
    }
  }
  const resultB = resultA === "win" ? "loss" : resultA === "loss" ? "win" : "draw";

  const eloA = calcNewElo(pa.eloRating, pb.eloRating, resultA);
  const eloB = calcNewElo(pb.eloRating, pa.eloRating, resultB);
  const newEloA = match.clanWarMatchId ? pa.eloRating : eloA.newElo;
  const newEloB = match.clanWarMatchId ? pb.eloRating : eloB.newElo;
  const deltaA = match.clanWarMatchId ? 0 : eloA.delta;
  const deltaB = match.clanWarMatchId ? 0 : eloB.delta;

  // Plus jamais null pour un match de tournoi (jamais botDifficulty, donc
  // le départage ci-dessus s'applique toujours) — un match de bracket DOIT
  // désigner un vainqueur pour faire avancer le tournoi ; bug réel du
  // 19/08 (winnerId=null envoyé au bracket éliminait les DEUX joueurs et
  // bloquait le tournoi) désormais impossible par construction plutôt que
  // corrigé après coup.
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
  if (match.tournamentMatchId || match.clanWarMatchId) {
    // Match de bracket : le droit d'entrée a déjà été débité une seule
    // fois à l'inscription au tournoi, et stakeCoins vaut 0 ici — aucun
    // paiement par match, seule la fin du tournoi distribue les gains
    // (§tournament/payout.ts). On se contente de faire avancer le bracket.
  } else if (match.botDifficulty) {
    // Récompense IA progressive : le risque et la précision du bot
    // augmentent avec le niveau. Le montant est toujours recalculé ici,
    // côté serveur, à partir de la mise réellement débitée.
    if (resultA === "win") payoutA = botWinnerPayout(match.stakeCoins, match.botDifficulty);
    else if (resultA === "draw") payoutA = duelDrawPayout(match.stakeCoins);
    // resultA === "loss" : payoutA reste 0, mise perdue.
  } else if (resultA === "win") payoutA = duelWinnerPayout(match.stakeCoins);
  else if (resultB === "win") payoutB = duelWinnerPayout(match.stakeCoins);
  else {
    // Vrai nul en duel normal (§ci-dessus, retour Paul du 31/08) : mise
    // remboursée aux deux, comme contre l'ordinateur. Un match de
    // tournoi/guerre de clans n'arrive jamais ici — toujours départagé
    // en win/loss avant, winnerId nul y étant structurellement impossible.
    payoutA = duelDrawPayout(match.stakeCoins);
    payoutB = duelDrawPayout(match.stakeCoins);
  }
  const bonusPayout = (amount: number) => bonusAmountForPayout(amount, { duelMatchId: match.id });
  if (payoutA > 0) await credit({ userId: pa.userId, type: "PAYOUT", amountCoins: payoutA, bonusAmountCoins: await bonusPayout(payoutA), duelMatchId: match.id, metadata: { forfeit: !!forfeitedBy, botDifficulty: match.botDifficulty, botMultiplier: match.botDifficulty ? BOT_PARAMS[match.botDifficulty].payoutMultiplier : undefined } });
  if (payoutB > 0 && !match.botDifficulty) await credit({ userId: pb.userId, type: "PAYOUT", amountCoins: payoutB, bonusAmountCoins: await bonusPayout(payoutB), duelMatchId: match.id, metadata: { forfeit: !!forfeitedBy } });

  if (match.tournamentMatchId) await notifyTournamentMatchDone(match.tournamentMatchId, winnerId);
  if (match.clanWarMatchId) await notifyClanWarMatchDone(match.clanWarMatchId, winnerId);

  const [balanceA, balanceB] = await Promise.all([getBalance(pa.userId), getBalance(pb.userId)]);

  pa.send?.({
    type: "duel_result", result: resultA, forfeit: forfeitedBy === pb.userId ? "opponent" : forfeitedBy === pa.userId ? "you" : null,
    scoreYou: pa.score, scoreOpponent: pb.score, payoutCoins: payoutA, eloDelta: deltaA, eloRating: newEloA, balanceCoins: balanceA,
    decidedBySpeed, clanWarMatchId: match.clanWarMatchId ?? null, clanWarId: match.clanWarId ?? null,
  });
  pb.send?.({
    type: "duel_result", result: resultB, forfeit: forfeitedBy === pa.userId ? "opponent" : forfeitedBy === pb.userId ? "you" : null,
    scoreYou: pb.score, scoreOpponent: pa.score, payoutCoins: payoutB, eloDelta: deltaB, eloRating: newEloB, balanceCoins: balanceB,
    decidedBySpeed, clanWarMatchId: match.clanWarMatchId ?? null, clanWarId: match.clanWarId ?? null,
  });

  // Push : utile surtout à celui qui n'a plus l'app au premier plan (WS
  // déjà reçu ci-dessus sinon) — jamais à un bot, qui n'a pas d'abonnement.
  void sendPush(pa.userId, resultA === "win"
    ? { title: "Duel gagné !", body: `+${payoutA.toLocaleString("fr-FR")} F contre ${pb.username}`, url: "/duel", tag: `duel-result-${match.id}` }
    : { title: "Duel terminé", body: `Défaite contre ${pb.username}`, url: "/duel", tag: `duel-result-${match.id}` });
  if (!match.botDifficulty) {
    void sendPush(pb.userId, resultB === "win"
      ? { title: "Duel gagné !", body: `+${payoutB.toLocaleString("fr-FR")} F contre ${pa.username}`, url: "/duel", tag: `duel-result-${match.id}` }
      : { title: "Duel terminé", body: `Défaite contre ${pa.username}`, url: "/duel", tag: `duel-result-${match.id}` });
  }

  emitToSpectators(match, {
    type: "spectator_result", matchId: match.id,
    scoreA: pa.score, scoreB: pb.score,
    winnerUsername: winnerId === pa.userId ? pa.username : winnerId === pb.userId ? pb.username : null,
  });

  match.status = "done";
  cleanupMatch(match);
}

function cleanupMatch(match: Match) {
  spectatorsByMatch.delete(match.id);
  matches.delete(match.id);
  activeMatchByUser.delete(match.players[0].userId);
  activeMatchByUser.delete(match.players[1].userId);
  if (match.roundTimer) clearTimeout(match.roundTimer);
  if (match.readyTimer) clearTimeout(match.readyTimer);
  if (match.pause?.timeoutHandle) clearTimeout(match.pause.timeoutHandle);
  for (const player of match.players) {
    const hiddenTimer = tabHiddenTimers.get(player.userId);
    if (hiddenTimer) clearTimeout(hiddenTimer);
    tabHiddenTimers.delete(player.userId);
    tabHiddenEvents.delete(player.userId);
  }
  for (const p of match.players) if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
}

// ── Connexion / déconnexion socket ──────────────────────────────────────

/** Un joueur qui revient (reconnexion réseau) dans le délai de grâce
 * retrouve directement l'état courant du match, sans tout recréer. */
export function attachSocket(userId: string, send: Send): { resumed: boolean } {
  // Une invitation (dont un duel ouvert) en attente doit survivre à une
  // reconnexion : la fonction `send` d'origine pointe vers une socket
  // fermée, il faut la remplacer par la nouvelle, et annuler l'annulation
  // programmée par detachSocket si elle n'a pas encore eu lieu.
  const pendingCode = pendingInviteByUser.get(userId);
  if (pendingCode) {
    const invite = invites.get(pendingCode);
    if (invite) {
      invite.send = send;
      if (invite.disconnectGraceHandle) {
        clearTimeout(invite.disconnectGraceHandle);
        invite.disconnectGraceHandle = null;
      }
    }
  }

  // Les défis ciblés reçus sont restaurés après un rafraîchissement, une
  // reconnexion mobile ou un changement de page. Ils ne dépendent donc pas
  // de l'instant exact où la première notification WebSocket a été reçue.
  for (const invite of invites.values()) {
    if (invite.targetUserId !== userId) continue;
    send({
      type: "duel_challenge",
      code: invite.code,
      username: invite.username,
      stakeCoins: invite.stakeCoins,
      createdAtMs: invite.createdAtMs,
      persistent: true,
    });
  }

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

  // Secondes restantes du countdown — calculées ici pour que le client
  // puisse reprendre au bon endroit plutôt que de repartir de zéro ou
  // d'afficher un Loader indéfiniment après un rafraîchissement de page.
  const effectivePhase = match.status === "paused" ? match.pause?.from : match.status;
  const countdownRemainingSeconds =
    effectivePhase === "countdown" && match.countdownSentAt > 0
      ? Math.max(1, Math.ceil(((match.status === "paused" ? match.pause?.remainingMs : match.phaseDeadlineAt - Date.now()) ?? 0) / 1000))
      : undefined;

  send({
    type: "resumed",
    duelMatchId: match.id,
    categoryId: match.categoryId,
    stakeCoins: match.stakeCoins,
    clanWarMatchId: match.clanWarMatchId ?? null,
    clanWarId: match.clanWarId ?? null,
    opponent: { username: opp.username, eloRating: opp.eloRating },
    scoreYou: player.score,
    scoreOpponent: opp.score,
    phase: match.status,
    pausedFrom: match.pause?.from,
    // "waiting_ready" → client sait s'il avait déjà cliqué avant la coupure
    ...(effectivePhase === "waiting_ready" ? { alreadyReady: player.ready, opponentAlreadyReady: opp.ready } : {}),
    ...(effectivePhase === "countdown" ? { countdownRemainingSeconds } : {}),
    ...(effectivePhase === "question" || effectivePhase === "reveal" ? resumedQuestionPayload(match, player) : {}),
  });

  if (match.pause) {
    // Une seule diffusion suffit : elle contient une version personnalisée
    // pour chacun des deux joueurs. Envoyer d'abord directement au joueur
    // reconnecté doublait l'événement et faisait clignoter la modale.
    emitPauseState(match);
  }

  // Reconnexion pendant la phase "Prêt" : remettre en route le timer global
  // qui avait été mis en pause lors de la déconnexion (§detachSocket
  // waiting_ready branch). On repart de 90 s depuis maintenant — on ne sait
  // pas combien de temps a été consommé et c'est négligeable ici.
  if (match.status === "waiting_ready" && !match.readyTimer) {
    match.readyTimer = setTimeout(() => {
      if (match.status === "waiting_ready") void refundAndCancel(match, "adversaire_pas_pret");
    }, 90_000);
  }

  return { resumed: true };
}

export function detachSocket(userId: string, closingSend?: Send) {
  cancelQueue(userId);
  scheduleInviteCancelIfStillDisconnected(userId);

  const match = activeMatchByUser.get(userId);
  if (!match) return;
  const player = playerOf(match, userId);
  // Une socket plus récente a déjà repris ce joueur. La fermeture tardive
  // de l'ancienne connexion ne doit ni geler le match ni lancer un forfait.
  if (closingSend && player.send && player.send !== closingSend) return;
  player.connected = false;
  player.send = null;

  if (match.status === "debiting") {
    // Coupure pendant le débit bancaire : createMatch rembourse une fois le
    // débit transactionnel terminé.
    match.cancelled = true;
    return;
  }

  // Le solo ne bloque pas un second humain. Il conserve une fenêtre de
  // reconnexion, puis devient un abandon enregistré si le joueur ne revient
  // pas. Le verrou de pause ci-dessous est réservé aux confrontations humaines.
  if (match.botDifficulty) {
    player.disconnectCount += 1;
    if (match.status === "question" && !player.answered) {
      player.answered = true;
      player.chosenIndex = -1;
      player.answeredAt = Date.now();
    }
    player.disconnectTimer = setTimeout(() => void finalizeMatch(match, userId), RECONNECT_GRACE_MS);
    return;
  }

  player.disconnectCount += 1;

  // Anti-triche : au-delà de 2 déconnexions en cours de partie, forfait
  // immédiat — empêche le cycle "déconnecter dès qu'on perd une question"
  // et le "déconnecter en espérant que l'adversaire se lasse et abandonne".
  if (player.disconnectCount > 2) {
    void finalizeMatch(match, userId);
    return;
  }

  const opp = otherPlayer(match, userId);
  opp.send?.({ type: "opponent_disconnected", graceMs: PRESENCE_CONFIRM_MS });
  pauseMatch(match, "connection_lost", [userId]);
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

// ── Anti-triche : changement d'onglet / mise en arrière-plan ─────────────
// Le client envoie "tab_hidden" dès que document.hidden passe à true
// (visibilitychange). 3 s de grâce (tunnel réseau, notification mobile…) :
// si "tab_visible" n'arrive pas dans ce délai, la réponse est forcée nulle.

export function handleTabHidden(userId: string) {
  // Annule un éventuel timer précédent (double-fire mobile)
  if (tabHiddenTimers.has(userId)) return;

  const match = activeMatchByUser.get(userId);
  if (!match || match.status !== "question") return;
  const player = playerOf(match, userId);
  if (player.answered) return; // déjà répondu, rien à protéger
  const activity = tabHiddenEvents.get(userId) ?? { count: 0, totalMs: 0, startedAt: Date.now() };
  activity.count += 1; activity.startedAt = Date.now(); tabHiddenEvents.set(userId, activity);

  const timer = setTimeout(() => {
    tabHiddenTimers.delete(userId);
    const m = activeMatchByUser.get(userId);
    if (!m || m.status !== "question") return;
    const p = playerOf(m, userId);
    if (p.answered) return;
    // La proposition est annulée après la grâce anti-triche. Dans un duel
    // humain, le chrono est ensuite gelé et le joueur doit confirmer sa
    // présence avant que son adversaire ne soit autorisé à continuer.
    p.answered = true;
    p.chosenIndex = -1;
    p.answeredAt = Date.now();
    const ev = tabHiddenEvents.get(userId);
    if (ev && ev.count >= 2) void prisma.flag.create({ data: { userId, rule: "TAB_HIDDEN_LOOKUP", detail: { matchId: m.id, count: ev.count, durationMs: Date.now() - ev.startedAt } } });
    if (!m.botDifficulty) {
      pauseMatch(m, "visibility_lost", [userId], {
        from: "question",
        remainingMs: Math.max(0, m.phaseDeadlineAt - Date.now()),
        resumeAction: "continue_phase",
      });
    } else if (m.players[0].answered && m.players[1].answered) {
      if (m.roundTimer) clearTimeout(m.roundTimer);
      void resolveRound(m);
    }
  }, TAB_HIDDEN_GRACE_MS);

  tabHiddenTimers.set(userId, timer);
}

export function handleTabVisible(userId: string) {
  const ev = tabHiddenEvents.get(userId);
  if (ev) ev.totalMs += Date.now() - ev.startedAt;
  const timer = tabHiddenTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    tabHiddenTimers.delete(userId);
  }
}
