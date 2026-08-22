// Client WebSocket du duel 1v1 — un singleton au niveau module (pas un
// hook), pour que la connexion survive à la navigation entre l'écran de
// recherche d'adversaire (DuelSetup) et l'écran de jeu (Duel) : ce sont
// deux composants différents qui montent/démontent, mais le duel est une
// seule conversation avec le serveur du début à la fin.

import { getToken } from "./api";

const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/^http/, "ws");

const listeners = new Map(); // type -> Set<fn>
let socket = null;
let manualClose = false;
let reconnectAttempts = 0;
let reconnectTimer = null;

// Dernier état connu du duel en cours. Un écran qui monte APRÈS qu'un
// événement soit passé (ex: Duel.jsx monte après que "matched" soit déjà
// arrivé pendant que DuelSetup.jsx était encore affiché) le rate s'il ne
// compte que sur les événements — d'où ce snapshot lisible à tout moment.
let snapshot = { phase: "idle" };

const SNAPSHOT_TYPES = new Set([
  "matched", "waiting_ready", "countdown", "question", "reveal", "duel_result",
  "duel_cancelled", "opponent_disconnected", "opponent_reconnected", "resumed",
  "tournament_waiting",
  "clan_war_waiting",
]);

export function getSnapshot() {
  return snapshot;
}

function emit(type, msg) {
  if (SNAPSHOT_TYPES.has(type)) {
    // "matched"/"resumed" portent l'identité du match (adversaire, mise,
    // catégorie) — ça doit survivre aux phases suivantes ("countdown",
    // "question", …) qui écrasent `last`/`phase`, sinon un écran qui monte
    // après plusieurs événements déjà passés (typique d'un duel contre
    // l'ordinateur : matched→countdown→question peuvent arriver dans le
    // même tick, avant que Duel.jsx n'ait fini de monter) perd
    // définitivement l'adversaire et la mise — bug réel trouvé en test
    // le 19/08 (mise affichée à "0 F", adversaire à "Adversaire" générique).
    const match = type === "matched" || type === "resumed" ? msg : snapshot.match;
    snapshot = { ...snapshot, phase: type, last: msg, match };
  }
  for (const fn of listeners.get(type) ?? []) fn(msg);
  for (const fn of listeners.get("*") ?? []) fn(msg);
}

/** S'abonne à un type de message serveur ("matched", "question", "reveal",
 * "duel_result", "opponent_disconnected", ...) ou "*" pour tout recevoir.
 * Retourne une fonction de désabonnement. */
export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type)?.delete(fn);
}

function scheduleReconnect() {
  if (manualClose || reconnectAttempts >= 5) return;
  reconnectAttempts += 1;
  const delay = Math.min(5000, 500 * 2 ** reconnectAttempts);
  reconnectTimer = setTimeout(() => connect(), delay);
}

/** Ouvre la connexion si elle n'existe pas déjà. Idempotent : on peut
 * l'appeler à chaque montage d'écran sans risque de doubler la socket. */
export function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }
  const token = getToken();
  if (!token) return null;

  manualClose = false;
  clearTimeout(reconnectTimer);
  socket = new WebSocket(`${WS_BASE}/ws/duel?token=${encodeURIComponent(token)}`);

  socket.addEventListener("open", () => {
    reconnectAttempts = 0;
    emit("_open", {});
  });
  socket.addEventListener("message", (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    emit(msg.type, msg);
  });
  socket.addEventListener("close", () => {
    emit("_close", {});
    socket = null;
    scheduleReconnect();
  });
  socket.addEventListener("error", () => {
    /* le close qui suit gère la reconnexion */
  });

  return socket;
}

export function send(msg) {
  const s = connect();
  if (!s) return;
  if (s.readyState === WebSocket.OPEN) s.send(JSON.stringify(msg));
  else s.addEventListener("open", () => s.send(JSON.stringify(msg)), { once: true });
}

// Contre un vrai adversaire : plus de catégorie à choisir, le serveur
// mélange les questions de tout le bank (§backend duel/engine.ts).
export function queue(stakeCoins) {
  snapshot = { phase: "queued" }; // repart d'un état propre pour ce nouveau duel
  send({ type: "queue", stakeCoins });
}

/** Duel contre l'ordinateur — même moteur, même paiement, seul
 * l'adversaire change (voir backend/src/modules/duel/bot.ts).
 * `difficulty` : "facile" | "moyen" | "difficile". */
export function botDuel(categoryId, stakeCoins, difficulty) {
  snapshot = { phase: "queued" };
  send({ type: "bot_duel", categoryId, stakeCoins, difficulty });
}

/** Génère un code d'invitation — le lien partagé pointe vers
 * /duel/join/<code>. `isPublic` : en plus listé sur /duels-ouverts,
 * rejoignable par n'importe qui sans le lien (§DuelSetup.jsx mode
 * "Duel ouvert", ajouté 19/08). */
export function createInvite(stakeCoins, isPublic = false, targetUsername) {
  send({ type: "create_invite", stakeCoins, isPublic, ...(targetUsername ? { targetUsername } : {}) });
}

export function joinInvite(code) {
  snapshot = { phase: "queued" };
  send({ type: "join_invite", code });
}

export function cancelInvite() {
  send({ type: "cancel_invite" });
}

export function declineInvite(code) {
  send({ type: "decline_invite", code });
}

export function cancelQueue() {
  send({ type: "cancel_queue" });
}

/** Rejoint son match de tournoi (bracket déjà généré côté serveur,
 * §Tournaments.jsx) — pas de mise à envoyer, déjà débitée à
 * l'inscription au tournoi. */
export function tournamentEnter(tournamentMatchId) {
  snapshot = { phase: "queued" };
  send({ type: "tournament_enter", tournamentMatchId });
}

export function clanWarEnter(clanWarMatchId) {
  snapshot = { phase: "queued" };
  send({ type: "clan_war_enter", clanWarMatchId });
}

export function spectate(matchId) {
  send({ type: "spectate", matchId });
}

export function leaveSpectate(matchId) {
  send({ type: "leave_spectate", ...(matchId ? { matchId } : {}) });
}

export function answer(questionId, chosenIndex) {
  send({ type: "answer", questionId, chosenIndex });
}

/** Départ volontaire en cours de duel : défaite immédiate côté serveur
 * (§engine.ts handleForfeit) — le "duel_result" qui suit navigue vers
 * /result comme une fin de partie normale. */
export function forfeit() {
  send({ type: "forfeit" });
}

/** À appeler quand l'utilisateur quitte volontairement le flux duel
 * (retour au lobby avant tout match) — n'interrompt pas un duel en
 * cours, la déconnexion réseau seule gère ce cas côté serveur. */
export function disconnect() {
  manualClose = true;
  clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
}
