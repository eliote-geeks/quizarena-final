import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { clientMessageSchema } from "./protocol.js";
import {
  enqueue, startBotDuel, cancelQueue, handleAnswer, handleForfeit, attachSocket, detachSocket,
  createInvite, joinInvite, cancelInvite, declineInvite, enterTournamentMatch,
  enterClanWarMatch,
  handleReady, handleTabHidden, handleTabVisible,
  registerSend, unregisterSend,
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
    try {
      if (!token) throw new Error("missing token");
      const payload = app.jwt.verify<{ userId: string }>(token);
      userId = payload.userId;
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
        case "forfeit":
          handleForfeit(userId);
          break;
        case "ready":
          handleReady(userId);
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
    // protocole, invisible JS côté client). Si on n'a pas reçu de pong
    // avant le prochain ping, la socket est considérée morte → terminate()
    // force le `close` event → detachSocket → toute la logique de
    // déconnexion s'applique (réponse nulle, timer de forfait, etc.).
    const PING_INTERVAL_MS = 15_000;
    let pongReceived = true; // vrai au départ : on donne le premier cycle entier
    const pingInterval = setInterval(() => {
      if (!pongReceived) {
        // Pas de pong depuis le dernier ping → connexion zombie → on coupe
        socket.terminate();
        return;
      }
      pongReceived = false;
      if (socket.readyState === socket.OPEN) socket.ping();
    }, PING_INTERVAL_MS);

    socket.on("pong", () => { pongReceived = true; });

    socket.on("close", () => {
      clearInterval(pingInterval);
      unregisterSend(userId);
      leaveSpectate(userId);
      detachSocket(userId);
    });

    void (async () => {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.accountStatus === "BANNED" || user.accountStatus === "SUSPENDED") {
        send({ type: "error", message: "Compte non actif" });
        socket.close();
        return;
      }
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
