import type { FastifyInstance } from "fastify";
import { listOpenInvites, listLiveMatches } from "./engine.js";

/**
 * Duels ouverts — liste publique des invitations créées "visibles" (par
 * opposition au lien privé classique), pour la page dédiée et l'aperçu
 * sur l'accueil. Pas de canal WS pour ça : la liste est courte et lue à
 * l'ouverture d'écran / au poll, un GET simple suffit (même principe que
 * la liste des tournois ouverts, §tournament/routes.ts).
 */
export async function duelRestRoutes(app: FastifyInstance) {
  app.get("/api/duel/live", { preHandler: [app.authenticate] }, async (_req, reply) => {
    return reply.send({ matches: listLiveMatches() });
  });
  app.get("/api/duel/open", { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user.userId;
    const all = listOpenInvites();
    const strip = ({ userId: _u, ...pub }: (typeof all)[number]) => pub;
    // "mine" : le duel ouvert de l'utilisateur courant s'il en a un — renvoyé
    // séparément pour que le frontend puisse l'afficher "en attente" sans
    // proposer un bouton Rejoindre (on ne peut pas se rejoindre soi-même).
    const mine = all.find((inv) => inv.userId === userId);
    const open = all.filter((inv) => inv.userId !== userId).map(strip);
    return reply.send({ open, mine: mine ? strip(mine) : null });
  });
}
