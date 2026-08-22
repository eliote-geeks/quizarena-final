ALTER TABLE "Clan"
  ADD COLUMN "warDraws" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "warEarnings" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ClanWarSearch"
  ADD COLUMN "stakeCoins" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ClanWar"
  ADD COLUMN "stakeCoins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "challengerStakeTxId" TEXT,
  ADD COLUMN "defenderStakeTxId" TEXT,
  ADD COLUMN "payoutCoins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "payoutDistributedAt" TIMESTAMP(3);

CREATE INDEX "ClanWarSearch_teamSize_stakeCoins_createdAt_idx"
  ON "ClanWarSearch"("teamSize", "stakeCoins", "createdAt");
