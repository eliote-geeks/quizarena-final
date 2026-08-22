CREATE TYPE "ClanWarStatus" AS ENUM ('PENDING', 'TEAM_SELECTION', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'EXPIRED');
CREATE TYPE "ClanWarMatchStatus" AS ENUM ('READY', 'IN_PROGRESS', 'COMPLETED', 'FORFEIT');

CREATE TABLE "ClanWar" (
  "id" TEXT NOT NULL,
  "challengerClanId" TEXT NOT NULL,
  "defenderClanId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "teamSize" INTEGER NOT NULL,
  "status" "ClanWarStatus" NOT NULL DEFAULT 'PENDING',
  "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3),
  "challengerScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "defenderScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "winnerClanId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "ClanWar_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClanWarMember" (
  "id" TEXT NOT NULL, "warId" TEXT NOT NULL, "userId" TEXT NOT NULL, "clanId" TEXT NOT NULL, "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanWarMember_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ClanWarMatch" (
  "id" TEXT NOT NULL, "warId" TEXT NOT NULL, "playerAId" TEXT NOT NULL, "playerBId" TEXT NOT NULL, "winnerId" TEXT, "status" "ClanWarMatchStatus" NOT NULL DEFAULT 'READY', "duelMatchId" TEXT, "completedAt" TIMESTAMP(3),
  CONSTRAINT "ClanWarMatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClanWarMember_warId_userId_key" ON "ClanWarMember"("warId", "userId");
CREATE UNIQUE INDEX "ClanWarMember_warId_clanId_userId_key" ON "ClanWarMember"("warId", "clanId", "userId");
CREATE UNIQUE INDEX "ClanWarMatch_duelMatchId_key" ON "ClanWarMatch"("duelMatchId");
CREATE INDEX "ClanWar_challengerClanId_status_idx" ON "ClanWar"("challengerClanId", "status");
CREATE INDEX "ClanWar_defenderClanId_status_idx" ON "ClanWar"("defenderClanId", "status");
CREATE INDEX "ClanWar_status_endsAt_idx" ON "ClanWar"("status", "endsAt");
CREATE INDEX "ClanWarMember_warId_clanId_idx" ON "ClanWarMember"("warId", "clanId");
CREATE INDEX "ClanWarMatch_warId_status_idx" ON "ClanWarMatch"("warId", "status");
CREATE INDEX "ClanWarMatch_playerAId_idx" ON "ClanWarMatch"("playerAId");
CREATE INDEX "ClanWarMatch_playerBId_idx" ON "ClanWarMatch"("playerBId");
ALTER TABLE "ClanWar" ADD CONSTRAINT "ClanWar_challengerClanId_fkey" FOREIGN KEY ("challengerClanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClanWar" ADD CONSTRAINT "ClanWar_defenderClanId_fkey" FOREIGN KEY ("defenderClanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClanWarMember" ADD CONSTRAINT "ClanWarMember_warId_fkey" FOREIGN KEY ("warId") REFERENCES "ClanWar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClanWarMatch" ADD CONSTRAINT "ClanWarMatch_warId_fkey" FOREIGN KEY ("warId") REFERENCES "ClanWar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClanWarMatch" ADD CONSTRAINT "ClanWarMatch_duelMatchId_fkey" FOREIGN KEY ("duelMatchId") REFERENCES "DuelMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
