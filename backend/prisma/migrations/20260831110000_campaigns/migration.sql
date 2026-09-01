-- Suivi anti-spam des campagnes email/push automatiques (31/08).
ALTER TABLE "User" ADD COLUMN "lastCampaignSentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastCampaignType" TEXT;
