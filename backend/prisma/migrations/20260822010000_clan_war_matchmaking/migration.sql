CREATE TABLE "ClanWarSearch" (
  "clanId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "teamSize" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanWarSearch_pkey" PRIMARY KEY ("clanId")
);

CREATE INDEX "ClanWarSearch_teamSize_createdAt_idx"
  ON "ClanWarSearch"("teamSize", "createdAt");

ALTER TABLE "ClanWarSearch"
  ADD CONSTRAINT "ClanWarSearch_clanId_fkey"
  FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
