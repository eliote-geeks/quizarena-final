ALTER TABLE "Clan"
  ADD COLUMN "warWins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "warLosses" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ClanInvite" (
  "id" TEXT NOT NULL,
  "clanId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "maxUses" INTEGER NOT NULL DEFAULT 10,
  "uses" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClanInvite_token_key" ON "ClanInvite"("token");
CREATE INDEX "ClanInvite_clanId_expiresAt_idx" ON "ClanInvite"("clanId", "expiresAt");

ALTER TABLE "ClanInvite"
  ADD CONSTRAINT "ClanInvite_clanId_fkey"
  FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
