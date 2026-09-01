import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { isSessionValid, touchSession } from "../../lib/sessions.js";
import { clientMessageSchema } from "./protocol.js";
import {
  enqueue, startBotDuel, cancelQueue, handleAnswer, handleForfeit, attachSocket, detachSocket,
  createInvite, joinInvite, cancelInvite, declineInvite, enterTournamentMatch,
  enterClanWarMatch,
  handleReady, handlePresenceConfirm, handleTabHidden, handleTabVisible, handleQuestionReady,
  registerSend, unregisterSend, isCurrentSend,
  spectateMatch, leaveSpectate,
} from "./engine.js";

/**
 * Un seul canal WebSocket (/ws/duel). Le navigateur ne peut pas fixer
 * d'en-tête Authorization sur une poignée de main WS — le JWT passe donc
 * en query string, vérifié manuellement ici avant tout accès au moteur.
 */
export async function duelWsRoutes(app: FastifyInstance) {
  app.get("/ws/duel", { websocket: true }, (socket, req) => {
    const token = (req.query as Record<string, string | undefined>)?.token;
    let userId: string;
    let sessionId: string | undefined;
    try {
      if (!token) throw new Error("missing token");
      const payload = app.jwt.verify<{ userId: string; sessionId?: string }>(token);
      userId = payload.userId;
      sessionId = payload.sessionId;
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Non authentifié" }));
      socket.close();
      return;
    }

    const send = (msg: object) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
    };

    // IMPORTANT : le listener "message" doit être attaché de façon
    // SYNCHRONE, avant tout `await`. Le client envoie souvent son
    // premier message ("queue") dès l'ouverture, et `ws` n'a aucun
    // rejeu d'événement pour un listener attaché en retard — un message
    // arrivé pendant la vérification async de l'utilisateur serait
    // silencieusement perdu. On bufferise donc les messages jusqu'à ce
    // que l'utilisateur soit chargé.
    let ready = false;
    let username = "";
    let eloRating = 1000;
    const pending: Buffer[] = [];

    function handleMessage(raw: Buffer) {
      // Une nouvelle connexion du même compte remplace atomiquement
      // l'ancienne. Un ancien onglet ne peut donc plus répondre à sa place.
      // Avant le 31/08 ce cas était totalement silencieux côté client :
      // un joueur ayant deux onglets ouverts (cas réel en testant un
      // lien privé) voyait un clic "Publier le duel" ne rien faire, sans
      // le moindre message d'erreur — juste un onglet devenu fantôme.
      if (!isCurrentSend(userId, send)) {
        send({ type: "error", message: "Cet onglet n'est plus la connexion active de ton compte (ouvert ailleurs ?). Recharge la page." });
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return send({ type: "error", message: "Message invalide" });
      }
      const result = clientMessageSchema.safeParse(parsed);
      if (!result.success) return send({ type: "error", message: "Message invalide" });
      const msg = result.data;

      switch (msg.type) {
        case "queue":
          void enqueue({ userId, username, eloRating, send, stakeCoins: msg.stakeCoins });
          break;
        case "bot_duel":
          void startBotDuel({
            userId, username, eloRating, send,
            categoryId: msg.categoryId, stakeCoins: msg.stakeCoins, difficulty: msg.difficulty,
          });
          break;
        case "cancel_queue":
          cancelQueue(userId);
          break;
        case "create_invite":
          void createInvite({ userId, username, eloRating, send, stakeCoins: msg.stakeCoins }, msg.isPublic ?? false, msg.targetUsername);
          break;
        case "join_invite":
          void joinInvite({ userId, username, eloRating, send }, msg.code);
          break;
        case "cancel_invite":
          cancelInvite(userId);
          break;
        case "decline_invite":
          declineInvite(userId, msg.code);
          break;
        case "tournament_enter":
          void enterTournamentMatch({ userId, username, eloRating, send }, msg.tournamentMatchId);
          break;
        case "clan_war_enter":
          void enterClanWarMatch({ userId, username, eloRating, send }, msg.clanWarMatchId);
          break;
        case "spectate":
          spectateMatch(userId, msg.matchId, send);
          break;
        case "leave_spectate":
          leaveSpectate(userId, msg.matchId);
          break;
        case "answer":
          handleAnswer(userId, msg.questionId, msg.chosenIndex);
          break;
        case "question_ready":
          handleQuestionReady(userId, msg.questionId);
          break;
        case "forfeit":
          handleForfeit(userId);
          break;
        case "ready":
          handleReady(userId);
          break;
        case "resume_confirm":
          handlePresenceConfirm(userId);
          break;
        case "tab_hidden":
          handleTabHidden(userId);
          break;
        case "tab_visible":
          handleTabVisible(userId);
          break;
        case "ping":
          send({ type: "pong" });
          break;
      }
    }

    socket.on("message", (raw: Buffer) => {
      if (!ready) {
        pending.push(raw);
        return;
      }
      handleMessage(raw);
    });

    // Heartbeat côté serveur : détecte les connexions "zombie" (téléphone
    // dont le réseau est coupé sans fermeture propre du WebSocket).
    // Le navigateur répond automatiquement aux pings WebSocket (niveau
    // protocole, invisible JS côté client). Si deux pongs de suite manquent,
    // la socket est considérée morte → terminate() force le `close` event
    // → detachSocket → toute la logique de déconnexion s'applique (réponse
    // nulle, timer de forfait, etc.).
    //
    // Correctif du 30/08/2026 : la version précédente coupait dès qu'UN
    // SEUL pong dépassait 2 s — sur un réseau mobile avec du jitter normal
    // (changement de cellule, pic de latence 3G/4G, quelques centaines de
    // ms à 2-3 s de retard ponctuel), c'est un faux positif quasi garanti
    // sur toute manche un peu longue, pas une vraie coupure. D'où les
    // signalements de « coupures » en duel alors que la connexion était
    // en réalité tout à fait valide. Exiger DEUX échecs consécutifs absorbe
    // un pic isolé sans rien perdre côté détection d'une vraie coupure :
    // pire cas ~2×PING_INTERVAL_MS, toujours largement sous la durée d'une
    // manche de 8 s.
    const PING_INTERVAL_MS = 2_500;
    const MAX_MISSED_PONGS = 2;
    let missedPongs = 0;
    const pingInterval = setInterval(() => {
      if (missedPongs >= MAX_MISSED_PONGS) {
        // Deux pings sans réponse de suite → connexion réellement morte.
        socket.terminate();
        return;
      }
      missedPongs += 1;
      if (socket.readyState === socket.OPEN) socket.ping();
    }, PING_INTERVAL_MS);

    socket.on("pong", () => { missedPongs = 0; });

    socket.on("close", () => {
      clearInterval(pingInterval);
      unregisterSend(userId, send);
      leaveSpectate(userId);
      detachSocket(userId, send);
    });

    void (async () => {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.accountStatus === "BANNED" || user.accountStatus === "SUSPENDED") {
        send({ type: "error", message: "Compte non actif" });
        socket.close();
        return;
      }
      // sessionId absent = token émis avant le 31/08, traité comme valide
      // (§types/fastify.d.ts) — même règle que l'API REST.
      if (sessionId && !(await isSessionValid(sessionId))) {
        send({ type: "error", message: "Session révoquée" });
        socket.close();
        return;
      }
      if (sessionId) touchSession(sessionId);
      username = user.username;
      eloRating = user.eloRating;
      ready = true;

      // Enregistre cette socket dans le registry broadcast (§duel_opened)
      registerSend(userId, send);

      // Reconnexion : si ce joueur avait un match en cours (coupure
      // réseau récente), on le raccroche directement au lieu de repartir
      // à zéro.
      attachSocket(userId, send);

      for (const raw of pending) handleMessage(raw);
      pending.length = 0;
    })();
  });
}
