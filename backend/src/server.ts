import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import multipart from "@fastify/multipart";
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
import { duelRestRoutes } from "./modules/duel/routes.js";
import { pushRoutes } from "./modules/push/routes.js";
import { ensureBotUsers } from "./modules/duel/bot.js";
import { setTournamentMatchDoneHandler, setClanWarMatchDoneHandler } from "./modules/duel/hooks.js";
import { tournamentRoutes } from "./modules/tournament/routes.js";
import { advanceBracket } from "./modules/tournament/bracket.js";
import { adminRoutes } from "./modules/admin/routes.js";
import { avatarRoutes } from "./modules/avatar/routes.js";
import { uploadRoutes } from "./modules/uploads/routes.js";
import { runCampaignSweep } from "./modules/campaigns/scheduler.js";
import { isSessionValid, touchSession } from "./lib/sessions.js";
import { clanRoutes } from "./modules/clans/routes.js";
import { clanWarRoutes, finalizeClanWarMatch, sweepExpiredClanWars } from "./modules/clan-wars/routes.js";
import { sweepPendingTransactions } from "./modules/wallet/reconcile.js";

const app = Fastify({
  logger: { transport: process.env.NODE_ENV !== "production" ? { target: "pino-pretty" } : undefined },
});

await app.register(sensible);
await app.register(cors, { origin: corsOrigins.length ? corsOrigins : true, credentials: true });
await app.register(jwt, { secret: env.JWT_SECRET });
await app.register(websocket);
await app.register(multipart);

// Anti-bourrinage générique sur toute l'API — les endpoits sensibles
// (submit, withdraw) ont en plus leur propre logique métier de garde-fou.
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify();
  } catch {
    return reply.unauthorized("Token invalide ou absent");
  }
  // sessionId absent = token émis avant le 31/08 (§types/fastify.d.ts) —
  // traité comme valide, pas de déconnexion de masse au déploiement.
  if (req.user.sessionId) {
    if (!(await isSessionValid(req.user.sessionId))) return reply.unauthorized("Session révoquée");
    touchSession(req.user.sessionId); // best-effort, jamais attendu
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

app.get("/api/health", async () => ({
  ok: true,
  service: env.APP_EDITION === "classic" ? "quizarena-classic-backend" : "quizarena-backend",
  edition: env.APP_EDITION,
}));

await app.register(authRoutes);
await app.register(walletRoutes);
await app.register(webhookRoutes);
await app.register(quizRoutes);
await app.register(playerRoutes);
await app.register(publicRoutes);
await app.register(tournamentRoutes);
await app.register(adminRoutes);
if (env.APP_EDITION === "main") {
  await app.register(clanRoutes);
  await app.register(clanWarRoutes);
}
await app.register(avatarRoutes);
await app.register(uploadRoutes);
await app.register(duelWsRoutes);
await app.register(duelRestRoutes);
await app.register(pushRoutes);

// Dashboard admin — une seule page HTML statique, servie directement
// (pas de build front séparé pour un outil interne à un seul
// utilisateur, §public/admin.html). Consomme /api/admin/* avec le même
// JWT que le reste du produit. Chemin volontairement non-devinable
// (pas "/admin") : la vraie protection reste isAdmin+mot de passe côté
// serveur, mais ça évite le scan/curiosité casuelle sur une URL connue.
const __dirname = dirname(fileURLToPath(import.meta.url));
const adminHtml = readFileSync(join(__dirname, "../public/admin.html"), "utf8");
if (env.APP_EDITION === "main") {
  app.get("/ops-b92f2835255d", async (_req, reply) => {
    reply.type("text/html");
    return adminHtml;
  });
}

// Backoffice de l'édition historique servie sur :3010. Il utilise les
// mêmes contrôles d'authentification/isAdmin et les mêmes routes serveur,
// mais masque explicitement les modules qui n'existent pas dans ce produit
// (clans et guerres de clans). Cela évite deux consoles divergentes tout en
// respectant le périmètre fonctionnel découvert pendant l'audit terrain.
if (env.APP_EDITION === "classic") {
  app.get("/ops-classic-3010-b92f2835255d", async (_req, reply) => {
    reply.type("text/html");
    return adminHtml
      .replace("<title>QuizArena — Backoffice</title>", "<title>QuizArena Classic — Backoffice</title>")
      .replace("<body>", '<body data-edition="classic">')
      .replace("QuizArena · Backoffice", "QuizArena Classic · Backoffice");
  });
}

// Comptes "Ordinateur" (facile/moyen/difficile) — créés une fois pour
// toutes s'ils n'existent pas encore (§duel/bot.ts), nécessaire avant
// d'accepter des duels contre l'ordinateur.
await ensureBotUsers();

// Branche le moteur de duel (générique) sur le bracket de tournoi —
// voir duel/hooks.ts pour la raison de ce registre plutôt qu'un import
// direct (duel/engine.ts ne doit rien savoir des tournois).
setTournamentMatchDoneHandler(advanceBracket);
if (env.APP_EDITION === "main") setClanWarMatchDoneHandler(finalizeClanWarMatch);

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

if (env.APP_EDITION === "main") {
  setInterval(() => {
    sweepExpiredClanWars().catch((err) => app.log.error(err, "[clan-wars] clôture automatique échouée"));
  }, 60_000);
}

// Campagnes e-mail/push automatiques (31/08, retour Paul : "programme un
// envoi régulier et auto... ça ne doit pas toujours être la même chose").
// Passe toutes les 6h, un petit lot de joueurs à la fois (§scheduler.ts
// CAMPAIGN_BATCH_SIZE) — étale l'envoi dans le temps plutôt qu'une rafale
// unique sur toute la base à heure fixe.
const CAMPAIGN_SWEEP_INTERVAL_MS = 6 * 60 * 60_000;
const runCampaignSweepLogged = () =>
  runCampaignSweep()
    .then((n) => { app.log.info(`[campaigns] passe terminée — ${n} message(s) envoyé(s)`); })
    .catch((err) => app.log.error(err, "[campaigns] passe échouée"));
// Une première passe 2 min après le démarrage — sans ça, un simple
// redémarrage (déploiement) repousse le premier envoi de 6h à chaque
// fois, ce qui rendait la fonctionnalité invisible en pratique (retour
// Paul du 31/08 : "depuis que tu étais censé activer je n'ai encore rien
// reçu"). Le journal loggue désormais aussi les passes à 0 envoi, pour
// distinguer "ça n'a pas encore tourné" de "ça tourne, personne n'était éligible".
setTimeout(runCampaignSweepLogged, 2 * 60_000);
setInterval(runCampaignSweepLogged, CAMPAIGN_SWEEP_INTERVAL_MS);
