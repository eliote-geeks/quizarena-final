import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Stockage disque simple (pas de S3 pour l'instant) — un dossier par usage
// (avatars / couvertures de tournoi), servi par §modules/uploads/routes.ts.
const __dirname = dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = join(__dirname, "..", "..", "uploads");

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 4 * 1024 * 1024; // 4 Mo — large pour une photo de profil/couverture, pas pour abuser du disque

export class UploadValidationError extends Error {}

/** Enregistre un fichier image uploadé dans `uploads/<subdir>/`, avec un
 * nom aléatoire (jamais le nom d'origine, jamais devinable). Retourne le
 * chemin public à servir via §modules/uploads/routes.ts. */
export async function saveUploadedImage(subdir: string, mimeType: string, buffer: Buffer): Promise<string> {
  const ext = ALLOWED_MIME[mimeType];
  if (!ext) throw new UploadValidationError("Format non supporté (jpg, png ou webp uniquement)");
  if (buffer.length > MAX_BYTES) throw new UploadValidationError("Image trop lourde (4 Mo maximum)");
  if (buffer.length === 0) throw new UploadValidationError("Fichier vide");

  const dir = join(UPLOADS_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(join(dir, filename), buffer);
  return `/api/uploads/${subdir}/${filename}`;
}
