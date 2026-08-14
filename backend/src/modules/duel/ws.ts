import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { clientMessageSchema } from "./protocol.js";
import {
  enqueue, startBotDuel, cancelQueue, handleAnswer, handleForfeit, attachSocket, detachSocket,
  createInvite, joinInvite, cancelInvite,
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
          void enqueue({ userId, username, eloRating, send, categoryId: msg.categoryId, stakeCoins: msg.stakeCoins });
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
          void createInvite({ userId, username, eloRating, send, categoryId: msg.categoryId, stakeCoins: msg.stakeCoins });
          break;
        case "join_invite":
          void joinInvite({ userId, username, eloRating, send }, msg.code);
          break;
        case "cancel_invite":
          cancelInvite(userId);
          break;
        case "answer":
          handleAnswer(userId, msg.questionId, msg.chosenIndex);
          break;
        case "forfeit":
          handleForfeit(userId);
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

    socket.on("close", () => detachSocket(userId));

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

      // Reconnexion : si ce joueur avait un match en cours (coupure
      // réseau récente), on le raccroche directement au lieu de repartir
      // à zéro.
      attachSocket(userId, send);

      for (const raw of pending) handleMessage(raw);
      pending.length = 0;
    })();
  });
}
