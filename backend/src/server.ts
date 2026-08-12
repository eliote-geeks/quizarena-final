import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { env, corsOrigins } from "./lib/env.js";
import { authRoutes } from "./modules/auth/routes.js";
import { walletRoutes } from "./modules/wallet/routes.js";
import { quizRoutes } from "./modules/quiz/routes.js";

const app = Fastify({
  logger: { transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined },
});

await app.register(sensible);
await app.register(cors, { origin: corsOrigins.length ? corsOrigins : true, credentials: true });
await app.register(jwt, { secret: env.JWT_SECRET });

// Anti-bourrinage générique sur toute l'API — les endpoits sensibles
// (submit, withdraw) ont en plus leur propre logique métier de garde-fou.
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify();
  } catch {
    return reply.unauthorized("Token invalide ou absent");
  }
});

app.setErrorHandler((err, req, reply) => {
  if (err instanceof ZodError) {
    return reply.badRequest(err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · "));
  }
  req.log.error(err);
  return reply.send(err);
});

app.get("/api/health", async () => ({ ok: true, service: "quizarena-backend" }));

await app.register(authRoutes);
await app.register(walletRoutes);
await app.register(quizRoutes);

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
