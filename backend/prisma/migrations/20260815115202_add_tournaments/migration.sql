-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('REGISTERING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TournamentMatchStatus" AS ENUM ('PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "stakeCoins" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'REGISTERING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentEntry" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seed" INTEGER NOT NULL DEFAULT 0,
    "eliminatedRound" INTEGER,
    "placement" INTEGER,
    "payoutCoins" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentMatch" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "playerAId" TEXT,
    "playerBId" TEXT,
    "winnerId" TEXT,
    "status" "TournamentMatchStatus" NOT NULL DEFAULT 'PENDING',
    "duelMatchId" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TournamentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "TournamentEntry_tournamentId_idx" ON "TournamentEntry"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEntry_tournamentId_userId_key" ON "TournamentEntry"("tournamentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentMatch_duelMatchId_key" ON "TournamentMatch"("duelMatchId");

-- CreateIndex
CREATE INDEX "TournamentMatch_tournamentId_round_idx" ON "TournamentMatch"("tournamentId", "round");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_duelMatchId_fkey" FOREIGN KEY ("duelMatchId") REFERENCES "DuelMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
