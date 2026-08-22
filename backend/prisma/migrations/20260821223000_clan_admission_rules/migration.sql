CREATE TYPE "ClanJoinPolicy" AS ENUM ('OPEN', 'APPROVAL', 'CLOSED');

ALTER TABLE "Clan"
  ADD COLUMN "joinPolicy" "ClanJoinPolicy" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "minimumCoins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "minimumGames" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxMembers" INTEGER NOT NULL DEFAULT 30;

CREATE TABLE "ClanJoinRequest" (
  "id" TEXT NOT NULL,
  "clanId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "message" VARCHAR(180),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClanJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClanJoinRequest_clanId_userId_key"
  ON "ClanJoinRequest"("clanId", "userId");
CREATE INDEX "ClanJoinRequest_clanId_createdAt_idx"
  ON "ClanJoinRequest"("clanId", "createdAt");

ALTER TABLE "ClanJoinRequest"
  ADD CONSTRAINT "ClanJoinRequest_clanId_fkey"
  FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClanJoinRequest"
  ADD CONSTRAINT "ClanJoinRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
