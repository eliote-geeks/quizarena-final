-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'WATCHED', 'RESTRICTED', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'STAKE', 'PAYOUT', 'REFUND', 'BONUS');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "QuizMode" AS ENUM ('LIBRE', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('STARTED', 'SUBMITTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DuelStatus" AS ENUM ('MATCHING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "region" TEXT,
    "eloRating" INTEGER NOT NULL DEFAULT 1000,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amountCoins" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "provider" TEXT,
    "providerRef" TEXT,
    "quizSessionId" TEXT,
    "duelMatchId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'moyen',

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "textFr" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "answerIndex" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "mode" "QuizMode" NOT NULL,
    "stakeCoins" INTEGER NOT NULL DEFAULT 0,
    "targetScore" INTEGER,
    "questionIds" JSONB NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "scoreServer" INTEGER,
    "tabSwitches" INTEGER NOT NULL DEFAULT 0,
    "totalDurationMs" INTEGER,
    "suspicionScore" DOUBLE PRECISION,
    "suspicionFlags" JSONB,
    "clientScoreMismatch" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "chosenIndex" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "responseMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuelMatch" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "stakeCoins" INTEGER NOT NULL,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT NOT NULL,
    "status" "DuelStatus" NOT NULL DEFAULT 'MATCHING',
    "scoreA" INTEGER NOT NULL DEFAULT 0,
    "scoreB" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "eloDeltaA" INTEGER,
    "eloDeltaB" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DuelMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "userId" TEXT NOT NULL,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "winRateGlobal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "games7d" INTEGER NOT NULL DEFAULT 0,
    "winRate7d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coinsWon7d" INTEGER NOT NULL DEFAULT 0,
    "coinsLost7d" INTEGER NOT NULL DEFAULT 0,
    "games30d" INTEGER NOT NULL DEFAULT 0,
    "winRate30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgScore30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTabSwitches" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fastAnswerRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timingVariance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "eloDelta7d" INTEGER NOT NULL DEFAULT 0,
    "suspicionScoreAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "flagsCount" INTEGER NOT NULL DEFAULT 0,
    "lastFlagAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "detail" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_riskScore_idx" ON "User"("riskScore");

-- CreateIndex
CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");

-- CreateIndex
CREATE INDEX "Transaction_userId_status_idx" ON "Transaction"("userId", "status");

-- CreateIndex
CREATE INDEX "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Question_categoryId_active_idx" ON "Question"("categoryId", "active");

-- CreateIndex
CREATE INDEX "QuizSession_userId_status_idx" ON "QuizSession"("userId", "status");

-- CreateIndex
CREATE INDEX "QuizAnswer_sessionId_idx" ON "QuizAnswer"("sessionId");

-- CreateIndex
CREATE INDEX "DuelMatch_playerAId_idx" ON "DuelMatch"("playerAId");

-- CreateIndex
CREATE INDEX "DuelMatch_playerBId_idx" ON "DuelMatch"("playerBId");

-- CreateIndex
CREATE INDEX "Flag_userId_resolved_idx" ON "Flag"("userId", "resolved");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_quizSessionId_fkey" FOREIGN KEY ("quizSessionId") REFERENCES "QuizSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_duelMatchId_fkey" FOREIGN KEY ("duelMatchId") REFERENCES "DuelMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelMatch" ADD CONSTRAINT "DuelMatch_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuelMatch" ADD CONSTRAINT "DuelMatch_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
