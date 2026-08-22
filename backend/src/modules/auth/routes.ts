import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

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

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: body.username }, { phone: body.phone }, { email: body.email ?? undefined }] },
    });
    if (existing) return reply.conflict("Pseudo, téléphone ou e-mail déjà utilisé");

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        username: body.username,
        phone: body.phone,
        email: body.email,
        passwordHash,
        stats: { create: {} },
      },
    });

    const token = app.jwt.sign({ userId: user.id }, { expiresIn: "30d" });
    return reply.code(201).send({ token, user: toPublicUser(user) });
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

    const token = app.jwt.sign({ userId: user.id }, { expiresIn: "30d" });
    return reply.send({ token, user: toPublicUser(user) });
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

  app.get("/api/auth/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, include: { stats: true } }) as any;
    if (!user) return reply.notFound();
    return reply.send({
      user: toPublicUser(user),
      stats: user.stats && {
        totalGames: user.stats.totalGames,
        winRateGlobal: user.stats.winRateGlobal,
        avgScore: user.stats.avgScore,
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
  createdAt: Date;
}) {
  // Ne jamais renvoyer passwordHash ni riskScore (§10 du spec :
  // ne jamais montrer à l'utilisateur ce qui l'a fait flaguer).
  const { id, username, email, phone, eloRating, accountStatus, region, createdAt } = user as any;
  const isAdmin = (user as any).isAdmin ?? false;
  return { id, username, email, phone, eloRating, accountStatus, region, createdAt, isAdmin };
}
