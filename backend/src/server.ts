import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ZodError } from "zod";
import { env, corsOrigins } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { authRoutes } from "./modules/auth/routes.js";
import { walletRoutes } from "./modules/wallet/routes.js";
import { webhookRoutes } from "./modules/wallet/webhook.js";
import { quizRoutes } from "./modules/quiz/routes.js";
import { playerRoutes } from "./modules/players/routes.js";
import { publicRoutes } from "./modules/public/routes.js";
import { duelWsRoutes } from "./modules/duel/ws.js";
import { ensureBotUsers } from "./modules/duel/bot.js";
import { setTournamentMatchDoneHandler } from "./modules/duel/hooks.js";
import { tournamentRoutes } from "./modules/tournament/routes.js";
import { advanceBracket } from "./modules/tournament/bracket.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { sweepPendingTransactions } from "./modules/wallet/reconcile.js";

const app = Fastify({
  logger: { transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined },
});

await app.register(sensible);
await app.register(cors, { origin: corsOrigins.length ? corsOrigins : true, credentials: true });
await app.register(jwt, { secret: env.JWT_SECRET });
await app.register(websocket);

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

// Un admin est un User comme les autres (isAdmin=true, jamais via
// l'inscription publique — §scripts/make-admin.mjs) : pas de second
// système d'auth, juste une vérification DB en plus du JWT (le JWT ne
// porte que userId, donc révoquer l'accès admin est immédiat, pas
// besoin d'invalider un token).
app.decorate("requireAdmin", async (req: FastifyRequest, reply: FastifyReply) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { isAdmin: true } });
  if (!user?.isAdmin) return reply.forbidden("Accès réservé aux administrateurs");
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
await app.register(webhookRoutes);
await app.register(quizRoutes);
await app.register(playerRoutes);
await app.register(publicRoutes);
await app.register(tournamentRoutes);
await app.register(adminRoutes);
await app.register(duelWsRoutes);

// Dashboard admin — une seule page HTML statique, servie directement
// (pas de build front séparé pour un outil interne à un seul
// utilisateur, §public/admin.html). Consomme /api/admin/* avec le même
// JWT que le reste du produit.
const __dirname = dirname(fileURLToPath(import.meta.url));
const adminHtml = readFileSync(join(__dirname, "../public/admin.html"), "utf8");
app.get("/admin", async (_req, reply) => {
  reply.type("text/html");
  return adminHtml;
});

// Comptes "Ordinateur" (facile/moyen/difficile) — créés une fois pour
// toutes s'ils n'existent pas encore (§duel/bot.ts), nécessaire avant
// d'accepter des duels contre l'ordinateur.
await ensureBotUsers();

// Branche le moteur de duel (générique) sur le bracket de tournoi —
// voir duel/hooks.ts pour la raison de ce registre plutôt qu'un import
// direct (duel/engine.ts ne doit rien savoir des tournois).
setTournamentMatchDoneHandler(advanceBracket);

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// Filet de sécurité webhook (§reconcile.ts) — un dépôt réel du 13/08/2026
// a réussi côté SharePay sans jamais notifier notre webhook. Toutes les
// 20s, on interroge directement l'état des transactions PENDING oubliées
// au lieu d'attendre indéfiniment une notification qui peut ne jamais venir.
setInterval(() => {
  sweepPendingTransactions()
    .then((n) => {
      if (n > 0) app.log.info(`[reconcile] ${n} transaction(s) en attente vérifiée(s)`);
    })
    .catch((err) => app.log.error(err, "[reconcile] balayage échoué"));
}, 20_000);
