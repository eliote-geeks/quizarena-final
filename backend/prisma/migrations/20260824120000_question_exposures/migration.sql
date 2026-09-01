CREATE TABLE "QuestionExposure" (
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionExposure_pkey" PRIMARY KEY ("userId", "questionId"),
  CONSTRAINT "QuestionExposure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuestionExposure_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "QuestionExposure_userId_seenAt_idx" ON "QuestionExposure"("userId", "seenAt");
CREATE INDEX "QuestionExposure_questionId_idx" ON "QuestionExposure"("questionId");
