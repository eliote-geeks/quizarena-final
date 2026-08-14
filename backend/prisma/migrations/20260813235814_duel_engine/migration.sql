-- AlterTable
ALTER TABLE "DuelMatch" ADD COLUMN     "forfeitedBy" TEXT,
ADD COLUMN     "questionIds" JSONB;

-- CreateTable
CREATE TABLE "DuelAnswer" (
    "id" TEXT NOT NULL,
    "duelMatchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "chosenIndex" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "responseMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuelAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DuelAnswer_duelMatchId_idx" ON "DuelAnswer"("duelMatchId");

-- CreateIndex
CREATE INDEX "DuelAnswer_userId_idx" ON "DuelAnswer"("userId");

-- AddForeignKey
ALTER TABLE "DuelAnswer" ADD CONSTRAINT "DuelAnswer_duelMatchId_fkey" FOREIGN KEY ("duelMatchId") REFERENCES "DuelMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
