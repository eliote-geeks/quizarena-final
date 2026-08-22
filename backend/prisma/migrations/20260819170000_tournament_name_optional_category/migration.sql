-- AlterTable
-- Ajoute un nom saisi par le créateur (absent sur les tournois déjà
-- créés — repli côté API sur le nom de catégorie) et rend la catégorie
-- optionnelle (null = questions mélangées sur tout le bank, comme un
-- duel PvP normal, §quiz/questions.ts pickQuestions). La contrainte de
-- clé étrangère existante reste valide sur une colonne nullable.
ALTER TABLE "Tournament" ADD COLUMN "name" TEXT;
ALTER TABLE "Tournament" ALTER COLUMN "categoryId" DROP NOT NULL;
