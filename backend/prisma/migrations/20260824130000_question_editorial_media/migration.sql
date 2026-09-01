ALTER TABLE "Question"
  ADD COLUMN "subcategory" TEXT,
  ADD COLUMN "mediaUrl" TEXT,
  ADD COLUMN "mediaAlt" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "tournamentEligible" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Question_subcategory_idx" ON "Question"("subcategory");
CREATE INDEX "Question_expiresAt_idx" ON "Question"("expiresAt");
