-- Mot de passe oublié par OTP e-mail (31/08), même principe que la
-- vérification de compte.

ALTER TABLE "User" ADD COLUMN "passwordResetCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetCodeExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "passwordResetLastSentAt" TIMESTAMP(3);
