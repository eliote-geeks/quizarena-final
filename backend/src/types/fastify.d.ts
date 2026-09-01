import "@fastify/jwt";
import "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    // sessionId optionnel : un token émis avant le 31/08 (§lib/sessions.ts)
    // n'en porte pas encore — authenticate() traite son absence comme
    // valide plutôt que de déconnecter tout le monde au déploiement.
    payload: { userId: string; sessionId?: string };
    user: { userId: string; sessionId?: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
