-- Vérification d'adresse e-mail à l'inscription (30/08). Le code lui-même
-- n'est jamais stocké en clair (sha256), seulement son hash + expiration
-- + horodatage du dernier envoi (anti-spam du bouton "renvoyer").

ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerifyCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerifyCodeExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailVerifyLastSentAt" TIMESTAMP(3);
