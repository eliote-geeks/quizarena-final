import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, normalize } from "node:path";
import { prisma } from "../../lib/prisma.js";
import { getVipStatus } from "../vip/service.js";
import { saveUploadedImage, UploadValidationError, UPLOADS_ROOT } from "../../lib/uploads.js";

const CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function readUpload(req: any) {
  const file = await req.file({ limits: { fileSize: 4 * 1024 * 1024 } });
  if (!file) throw new UploadValidationError("Aucun fichier reçu");
  const buffer = await file.toBuffer();
  return { buffer, mimeType: file.mimetype as string };
}

export async function uploadRoutes(app: FastifyInstance) {
  // Photo de profil — remplace l'avatar généré (dicebear) une fois posée ;
  // AnimeAvatar.jsx retombe sur le seed si avatarUrl est absent.
  app.post("/api/uploads/avatar", { preHandler: [app.authenticate] }, async (req, reply) => {
    try {
      const { buffer, mimeType } = await readUpload(req);
      const url = await saveUploadedImage("avatars", mimeType, buffer);
      await prisma.user.update({ where: { id: req.user.userId }, data: { avatarUrl: url } });
      return reply.send({ avatarUrl: url });
    } catch (err) {
      if (err instanceof UploadValidationError) return reply.badRequest(err.message);
      throw err;
    }
  });

  // Couverture de tournoi — même permission que la création elle-même
  // (§tournament/routes.ts) : pas la peine de pouvoir uploader une image
  // si on n'a de toute façon pas le droit de créer le tournoi qui l'utilisera.
  app.post("/api/uploads/tournament-cover", { preHandler: [app.authenticate] }, async (req, reply) => {
    const vip = await getVipStatus(req.user.userId);
    if (!vip?.canCreateTournament) return reply.forbidden("Statut VIP requis pour créer un tournoi");
    try {
      const { buffer, mimeType } = await readUpload(req);
      const url = await saveUploadedImage("tournament-covers", mimeType, buffer);
      return reply.send({ url });
    } catch (err) {
      if (err instanceof UploadValidationError) return reply.badRequest(err.message);
      throw err;
    }
  });

  // Sert les fichiers uploadés — aucune donnée sensible dedans (juste des
  // images publiques), pas besoin d'authentification pour les afficher.
  app.get("/api/uploads/:subdir/:filename", async (req, reply) => {
    const { subdir, filename } = req.params as { subdir: string; filename: string };
    if (!/^[a-z0-9-]+$/i.test(subdir) || !/^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      return reply.notFound();
    }
    const filePath = normalize(join(UPLOADS_ROOT, subdir, filename));
    if (!filePath.startsWith(UPLOADS_ROOT)) return reply.notFound(); // garde-fou path traversal, la regex ci-dessus l'exclut déjà en pratique
    try {
      await stat(filePath);
    } catch {
      return reply.notFound();
    }
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    reply.header("Content-Type", CONTENT_TYPE[ext] || "application/octet-stream");
    reply.header("Cache-Control", "public, max-age=31536000, immutable"); // nom de fichier aléatoire (§uploads.ts) : jamais réutilisé, donc jamais invalidé
    return reply.send(createReadStream(filePath));
  });
}
