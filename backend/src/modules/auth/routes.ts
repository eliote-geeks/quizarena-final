import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../lib/env.js";
import { resolveVipStatus } from "../vip/service.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../lib/mailer.js";
import { createSession, listSessions, revokeSession } from "../../lib/sessions.js";

const registerSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_.]+$/, "lettres, chiffres, _ et . uniquement"),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  identifier: z.string().min(3), // téléphone ou e-mail
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const verifyEmailSchema = z.object({ code: z.string().min(4).max(8) });
const forgotPasswordSchema = z.object({ identifier: z.string().min(3) });
const resetPasswordSchema = z.object({
  identifier: z.string().min(3),
  code: z.string().min(4).max(8),
  newPassword: z.string().min(8),
});
const updateProfileSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_.]+$/, "lettres, chiffres, _ et . uniquement").optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(20).optional(),
  region: z.string().max(60).optional(),
});

const EMAIL_CODE_TTL_MS = 15 * 60_000;
const EMAIL_RESEND_COOLDOWN_MS = 60_000;

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/** Génère un code à 6 chiffres, l'enregistre (hashé) et l'envoie — best
 * effort : un SMTP en panne ne doit jamais faire échouer l'inscription
 * ni bloquer la connexion, juste laisser le compte "non vérifié". */
async function issueAndSendVerificationCode(userId: string, email: string, username: string) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifyCodeHash: hashCode(code),
      emailVerifyCodeExpiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
      emailVerifyLastSentAt: new Date(),
    },
  });
  try {
    await sendVerificationEmail(email, username, code);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[auth] envoi du code de vérification échoué :", err);
  }
}

async function issueAndSendPasswordResetCode(userId: string, email: string, username: string) {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetCodeHash: hashCode(code),
      passwordResetCodeExpiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
      passwordResetLastSentAt: new Date(),
    },
  });
  try {
    await sendPasswordResetEmail(email, username, code);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[auth] envoi du code de réinitialisation échoué :", err);
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: body.username }, { phone: body.phone }, { email: body.email ?? undefined }] },
    });
    if (existing) return reply.conflict("Pseudo, téléphone ou e-mail déjà utilisé");

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { username: body.username, phone: body.phone, email: body.email, passwordHash, stats: { create: {} } },
      });
      if (env.SIGNUP_BONUS_COINS > 0) {
        await tx.transaction.create({
          data: {
            userId: created.id, type: "BONUS", amountCoins: env.SIGNUP_BONUS_COINS,
            bonusAmountCoins: env.SIGNUP_BONUS_COINS,
            metadata: { reason: "signup_bonus", withdrawable: false },
          },
        });
      }
      return created;
    });

    if (user.email) await issueAndSendVerificationCode(user.id, user.email, user.username);

    const session = await createSession(user.id, req.headers["user-agent"], req.ip);
    const token = app.jwt.sign({ userId: user.id, sessionId: session.id }, { expiresIn: "30d" });
    return reply.code(201).send({ token, user: toPublicUser(user) });
  });

  app.post("/api/auth/verify-email", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { code } = verifyEmailSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });

    if (user.emailVerified) return reply.send({ ok: true, alreadyVerified: true });
    if (!user.email || !user.emailVerifyCodeHash || !user.emailVerifyCodeExpiresAt) {
      return reply.badRequest("Aucune vérification en attente pour ce compte");
    }
    if (user.emailVerifyCodeExpiresAt < new Date()) return reply.badRequest("Code expiré, demande-en un nouveau");
    if (hashCode(code) !== user.emailVerifyCodeHash) return reply.badRequest("Code incorrect");

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyCodeHash: null, emailVerifyCodeExpiresAt: null },
    });
    return reply.send({ ok: true });
  });

  app.post("/api/auth/resend-verification", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });
    if (!user.email) return reply.badRequest("Aucune adresse e-mail sur ce compte");
    if (user.emailVerified) return reply.send({ ok: true, alreadyVerified: true });
    if (user.emailVerifyLastSentAt && Date.now() - user.emailVerifyLastSentAt.getTime() < EMAIL_RESEND_COOLDOWN_MS) {
      return reply.code(429).send({ error: "Attends un instant avant de redemander un code" });
    }
    await issueAndSendVerificationCode(user.id, user.email, user.username);
    return reply.send({ ok: true });
  });

  // Public à dessein (pas de session à ce stade) — la réponse est
  // volontairement générique dans tous les cas (compte introuvable, sans
  // e-mail, ou SMTP en panne) pour ne jamais laisser deviner si un
  // identifiant existe (§3.4 anti-énumération de comptes).
  app.post("/api/auth/forgot-password", async (req, reply) => {
    const { identifier } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { phone: identifier }, { email: identifier }] },
    });
    if (user?.email) {
      const cooledDown = !user.passwordResetLastSentAt
        || Date.now() - user.passwordResetLastSentAt.getTime() >= EMAIL_RESEND_COOLDOWN_MS;
      if (cooledDown) await issueAndSendPasswordResetCode(user.id, user.email, user.username);
    }
    return reply.send({ ok: true });
  });

  app.post("/api/auth/reset-password", async (req, reply) => {
    const body = resetPasswordSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: body.identifier }, { phone: body.identifier }, { email: body.identifier }] },
    });
    // Même message générique qu'un code faux : ne jamais confirmer qu'un
    // compte existe ou non par la différence de réponse.
    if (!user || !user.passwordResetCodeHash || !user.passwordResetCodeExpiresAt) {
      return reply.badRequest("Code invalide ou expiré");
    }
    if (user.passwordResetCodeExpiresAt < new Date()) return reply.badRequest("Code invalide ou expiré");
    if (hashCode(body.code) !== user.passwordResetCodeHash) return reply.badRequest("Code invalide ou expiré");

    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetCodeHash: null, passwordResetCodeExpiresAt: null },
    });
    return reply.send({ ok: true });
  });

  app.post("/api/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: body.identifier }, { phone: body.identifier }, { email: body.identifier }] },
    });
    if (!user) return reply.unauthorized("Identifiants invalides");

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return reply.unauthorized("Identifiants invalides");

    if (user.accountStatus === "BANNED") return reply.forbidden("Compte banni");
    if (user.accountStatus === "SUSPENDED") return reply.forbidden("Compte suspendu");

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const session = await createSession(user.id, req.headers["user-agent"], req.ip);
    const token = app.jwt.sign({ userId: user.id, sessionId: session.id }, { expiresIn: "30d" });
    return reply.send({ token, user: toPublicUser(user) });
  });

  // ── Sessions de connexion ─────────────────────────────────────────
  app.get("/api/auth/sessions", { preHandler: [app.authenticate] }, async (req, reply) => {
    const sessions = await listSessions(req.user.userId);
    return reply.send({
      sessions: sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        current: s.id === req.user.sessionId,
      })),
    });
  });

  app.post("/api/auth/sessions/:id/revoke", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (id === req.user.sessionId) return reply.badRequest("Utilise la déconnexion normale pour ta propre session");
    await revokeSession(req.user.userId, id);
    return reply.send({ ok: true });
  });

  app.post("/api/auth/change-password", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });

    const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!ok) return reply.unauthorized("Mot de passe actuel incorrect");

    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return reply.send({ ok: true });
  });

  // Espace membre — modifier e-mail / téléphone / région. Le mot de passe a
  // sa propre route (change-password, ci-dessus) : jamais mélangé ici, une
  // action sensible mérite son propre appel explicite.
  app.patch("/api/auth/profile", { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = updateProfileSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.userId } });

    if (body.username || body.email || body.phone) {
      const conflict = await prisma.user.findFirst({
        where: {
          id: { not: user.id },
          OR: [
            ...(body.username ? [{ username: body.username }] : []),
            ...(body.email ? [{ email: body.email }] : []),
            ...(body.phone ? [{ phone: body.phone }] : []),
          ],
        },
      });
      if (conflict) {
        const field = conflict.username === body.username ? "Ce pseudo"
          : conflict.email === body.email ? "Cet e-mail" : "Ce téléphone";
        return reply.conflict(`${field} est déjà utilisé par un autre compte`);
      }
    }

    const emailChanged = Boolean(body.email && body.email !== user.email);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.username !== undefined ? { username: body.username } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.region !== undefined ? { region: body.region } : {}),
        // Changer d'adresse invalide la vérification précédente — elle
        // portait sur l'ancienne adresse, pas sur la nouvelle.
        ...(emailChanged ? { emailVerified: false } : {}),
      },
    });

    if (emailChanged && updated.email) await issueAndSendVerificationCode(updated.id, updated.email, updated.username);

    return reply.send({ user: toPublicUser(updated) });
  });

  app.get("/api/auth/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const [user, duelsWon30d] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.userId }, include: { stats: true } }) as any,
      prisma.duelMatch.count({
        where: { winnerId: req.user.userId, status: "COMPLETED", completedAt: { gte: since30d } },
      }),
    ]);
    if (!user) return reply.notFound();
    const vip = resolveVipStatus(user.vipGrantedAt, duelsWon30d, user.isAdmin);
    return reply.send({
      user: {
        ...toPublicUser(user),
        isVip: vip.isVip,
        vipSource: vip.source,
        vipGrantedAt: vip.grantedAt,
        canCreateTournament: vip.canCreateTournament,
      },
      vip,
      stats: user.stats && {
        totalGames: user.stats.totalGames,
        winRateGlobal: user.stats.winRateGlobal,
        avgScore: user.stats.avgScore,
        games7d: user.stats.games7d,
        winRate7d: user.stats.winRate7d,
        games30d: user.stats.games30d,
        winRate30d: user.stats.winRate30d,
        duelsWon30d,
      },
    });
  });
}

function toPublicUser(user: {
  id: string;
  username: string;
  email: string | null;
  phone: string;
  eloRating: number;
  accountStatus: string;
  region: string | null;
  vipGrantedAt?: Date | null;
  createdAt: Date;
}) {
  // Ne jamais renvoyer passwordHash ni riskScore (§10 du spec :
  // ne jamais montrer à l'utilisateur ce qui l'a fait flaguer). Idem pour
  // emailVerifyCodeHash — même hashé, un secret de vérification n'a rien
  // à faire dans une réponse publique.
  const { id, username, email, phone, eloRating, accountStatus, region, vipGrantedAt, createdAt } = user as any;
  const isAdmin = (user as any).isAdmin ?? false;
  const emailVerified = (user as any).emailVerified ?? false;
  const avatarUrl = (user as any).avatarUrl ?? null;
  return { id, username, email, phone, eloRating, accountStatus, region, vipGrantedAt, createdAt, isAdmin, emailVerified, avatarUrl };
}
