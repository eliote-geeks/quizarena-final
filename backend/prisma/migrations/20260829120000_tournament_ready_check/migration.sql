-- Check de présence avant le tirage du bracket.
-- Avant cette migration, un tournoi démarrait tout seul dès la dernière
-- inscription et armait immédiatement un forfait à 3 min sur chaque match :
-- un joueur absent de son écran à cet instant perdait (ou gagnait) sans
-- qu'aucune question ne soit posée. Le créateur lance désormais le tournoi
-- explicitement, puis chaque inscrit confirme sa présence.

ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'READY_CHECK' BEFORE 'IN_PROGRESS';

ALTER TABLE "TournamentEntry" ADD COLUMN IF NOT EXISTS "readyAt" TIMESTAMP(3);
