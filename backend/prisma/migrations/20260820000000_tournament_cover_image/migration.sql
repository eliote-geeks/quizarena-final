-- AlterTable
-- Image de couverture choisie par le créateur du tournoi, parmi un set
-- fermé de photos déjà vérifiées (jamais un upload libre — voir
-- COVER_IMAGE_ALLOWLIST côté serveur).
ALTER TABLE "Tournament" ADD COLUMN "coverImage" TEXT;
