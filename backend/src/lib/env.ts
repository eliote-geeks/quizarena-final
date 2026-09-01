import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, "JWT_SECRET doit faire au moins 16 caractères"),
  PORT: z.coerce.number().default(4000),
  APP_EDITION: z.enum(["main", "classic"]).default("main"),
  CORS_ORIGINS: z.string().default(""),
  SHAREPAY_API_KEY: z.string().optional(),
  SHAREPAY_BASE_URL: z.string().default("https://sharepay-api.te-sea.com"),
  SHAREPAY_WEBHOOK_SECRET: z.string().optional(),
  ALLOW_SIMULATED_PAYMENTS: z.string().default("false").transform((value) => value === "true"),
  SIGNUP_BONUS_COINS: z.coerce.number().int().min(0).max(50_000).default(0),

  // Envoi d'e-mails (vérification de compte, notifications) — boîte pro
  // LWS dédiée sur le domaine (§lib/mailer.ts). Facultatif : en dev/local,
  // aucun SMTP configuré = mailer.ts logue le contenu au lieu d'envoyer,
  // pour ne jamais bloquer l'inscription si ces variables manquent.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(465),
  SMTP_SECURE: z.string().default("true").transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("QuizArena <noreply@quizarenaworld.com>"),

  // Notifications push navigateur (défi reçu, résultat de duel...) — clés
  // générées une fois via `npx web-push generate-vapid-keys` (§lib/push.ts).
  // Facultatif comme le SMTP : sans clés, push.ts n'envoie rien plutôt que
  // de faire planter le serveur.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:noreply@quizarenaworld.com"),
});

export const env = schema.parse(process.env);

export const corsOrigins = env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
