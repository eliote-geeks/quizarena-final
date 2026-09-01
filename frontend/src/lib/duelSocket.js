import { getToken } from "./api";

const API_URL = process.env.REACT_APP_API_URL || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:4010");
const WS_BASE = API_URL.replace(/^http/, "ws");
const listeners = new Map();
let socket = null;
let manualClose = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
let snapshot = { phase: "idle" };

const ACTIVE_DUEL_PHASES = new Set([
  "matched", "waiting_ready", "countdown", "question", "reveal",
  "resumed", "duel_paused", "duel_resumed", "presence_confirmed",
  "opponent_disconnected", "opponent_reconnected",
]);

const SNAPSHOT_TYPES = new Set([
  "matched", "waiting_ready", "countdown", "question", "reveal", "duel_result",
  "duel_cancelled", "opponent_disconnected", "opponent_reconnected", "resumed",
  "duel_paused", "duel_resumed", "presence_confirmed",
  "tournament_waiting",
]);

export const getSnapshot = () => snapshot;
export const hasActiveDuel = () => Boolean(snapshot.match) && ACTIVE_DUEL_PHASES.has(snapshot.phase);

function emit(type, message) {
  if (SNAPSHOT_TYPES.has(type)) {
    const match = type === "matched" || type === "resumed" ? message : snapshot.match;
    snapshot = { ...snapshot, phase: type, last: message, match };
  }
  for (const listener of listeners.get(type) || []) listener(message);
  for (const listener of listeners.get("*") || []) listener(message);
}

export function on(type, listener) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(listener);
  return () => listeners.get(type)?.delete(listener);
}

function scheduleReconnect() {
  if (manualClose || reconnectAttempts >= 5) return;
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(connect, Math.min(5000, 500 * 2 ** reconnectAttempts));
}

export function connect() {
  if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) return socket;
  const token = getToken();
  if (!token) return null;
  manualClose = false;
  clearTimeout(reconnectTimer);
  socket = new WebSocket(`${WS_BASE}/ws/duel?token=${encodeURIComponent(token)}`);
  socket.addEventListener("open", () => { reconnectAttempts = 0; emit("_open", {}); });
  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      emit(message.type, message);
    } catch (_) {}
  });
  socket.addEventListener("close", () => { emit("_close", {}); socket = null; scheduleReconnect(); });
  return socket;
}

export function send(message) {
  const current = connect();
  if (!current) return;
  if (current.readyState === WebSocket.OPEN) current.send(JSON.stringify(message));
  else current.addEventListener("open", () => current.send(JSON.stringify(message)), { once: true });
}

export function queue(stakeCoins) { snapshot = { phase: "queued" }; send({ type: "queue", stakeCoins }); }
export function botDuel(categoryId, stakeCoins, difficulty) { snapshot = { phase: "queued" }; send({ type: "bot_duel", categoryId, stakeCoins, difficulty }); }
export function createInvite(stakeCoins, isPublic = false, targetUsername) {
  send({ type: "create_invite", stakeCoins, isPublic, ...(targetUsername ? { targetUsername } : {}) });
}
export function joinInvite(code) { snapshot = { phase: "queued" }; send({ type: "join_invite", code }); }
export function cancelInvite() { send({ type: "cancel_invite" }); }
export function declineInvite(code) { send({ type: "decline_invite", code }); }
export function cancelQueue() { send({ type: "cancel_queue" }); }
export function tournamentEnter(tournamentMatchId) { snapshot = { phase: "queued" }; send({ type: "tournament_enter", tournamentMatchId }); }
export function spectate(matchId) { send({ type: "spectate", matchId }); }
export function leaveSpectate(matchId) { send({ type: "leave_spectate", ...(matchId ? { matchId } : {}) }); }
export function ready() { send({ type: "ready" }); }
export function confirmPresence() { send({ type: "resume_confirm" }); }
export function answer(questionId, chosenIndex) { send({ type: "answer", questionId, chosenIndex }); }
// Confirme au serveur que la question a fini de charger côté client (média
// compris) — le serveur n'arme le chrono partagé qu'une fois les deux
// joueurs prêts (§backend engine.ts prepareQuestion), pour qu'aucun des
// deux ne perde du temps de réponse à cause d'un chargement plus lent.
export function questionReady(questionId) { send({ type: "question_ready", questionId }); }
export function forfeit() {
  // Libère immédiatement les gardes de navigation locaux. Le serveur reste
  // l'unique autorité et enregistre ensuite le forfait et le règlement.
  snapshot = { ...snapshot, phase: "forfeiting" };
  send({ type: "forfeit" });
}
export function disconnect() {
  manualClose = true;
  clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
}
