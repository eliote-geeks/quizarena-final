-- Ces tables avaient initialement été créées directement sur le serveur.
-- Migration idempotente pour rendre une installation depuis zéro fiable.
CREATE TABLE IF NOT EXISTS "Clan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "description" TEXT,
  "bannerColor" TEXT NOT NULL DEFAULT '#f59e0b',
  "leaderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Clan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Clan_name_key" ON "Clan"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Clan_tag_key" ON "Clan"("tag");
CREATE INDEX IF NOT EXISTS "Clan_createdAt_idx" ON "Clan"("createdAt");

CREATE TABLE IF NOT EXISTS "ClanMember" (
  "userId" TEXT NOT NULL,
  "clanId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClanMember_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX IF NOT EXISTS "ClanMember_clanId_idx" ON "ClanMember"("clanId");

DO $$ BEGIN
  ALTER TABLE "ClanMember" ADD CONSTRAINT "ClanMember_clanId_fkey"
    FOREIGN KEY ("clanId") REFERENCES "Clan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ClanMember" ADD CONSTRAINT "ClanMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
