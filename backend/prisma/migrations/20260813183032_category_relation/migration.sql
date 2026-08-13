-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
