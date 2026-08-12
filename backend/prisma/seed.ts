// Importe la banque de questions réelle du front v1
// (frontend/src/data/questions.js, copiée telle quelle dans
// ./seed-data/questions.js) plutôt que d'en inventer une nouvelle.

import { PrismaClient } from "@prisma/client";
// @ts-expect-error — fichier JS source sans types, contenu vérifié à la main
import { QUESTIONS_BANK } from "./seed-data/questions.js";

const prisma = new PrismaClient();

const CATEGORIES: { id: string; nameFr: string; nameEn: string; difficulty: string }[] = [
  { id: "culture", nameFr: "Culture générale", nameEn: "General knowledge", difficulty: "mixte" },
  { id: "histoire", nameFr: "Histoire", nameEn: "History", difficulty: "moyen" },
  { id: "geographie", nameFr: "Géographie", nameEn: "Geography", difficulty: "moyen" },
  { id: "sciences", nameFr: "Sciences", nameEn: "Science", difficulty: "difficile" },
  { id: "sport", nameFr: "Sport", nameEn: "Sport", difficulty: "facile" },
  { id: "afrique", nameFr: "Afrique", nameEn: "Africa", difficulty: "moyen" },
  { id: "cinema", nameFr: "Cinéma", nameEn: "Cinema", difficulty: "facile" },
  { id: "musique", nameFr: "Musique", nameEn: "Music", difficulty: "facile" },
  { id: "celebrites", nameFr: "Célébrités", nameEn: "Celebrities", difficulty: "facile" },
  { id: "technologie", nameFr: "Tech", nameEn: "Tech", difficulty: "difficile" },
  { id: "nature", nameFr: "Nature", nameEn: "Nature", difficulty: "moyen" },
  { id: "gastronomie", nameFr: "Gastronomie", nameEn: "Food", difficulty: "facile" },
  { id: "litterature", nameFr: "Littérature", nameEn: "Literature", difficulty: "difficile" },
  { id: "anime", nameFr: "Anime & Manga", nameEn: "Anime & Manga", difficulty: "moyen" },
];

type BankEntry = { q: { fr: string; en: string }; options: string[]; answer: number };

async function main() {
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      create: cat,
      update: { nameFr: cat.nameFr, nameEn: cat.nameEn, difficulty: cat.difficulty },
    });
  }
  console.log(`✓ ${CATEGORIES.length} catégories`);

  let total = 0;
  for (const cat of CATEGORIES) {
    const entries = (QUESTIONS_BANK as Record<string, BankEntry[]>)[cat.id];
    if (!entries?.length) {
      console.warn(`  ⚠ pas de question pour "${cat.id}" dans questions.js`);
      continue;
    }
    // Idempotent : on vide puis réinsère plutôt que d'upsert question par
    // question (pas d'id stable côté source, seed = source de vérité).
    await prisma.question.deleteMany({ where: { categoryId: cat.id } });
    await prisma.question.createMany({
      data: entries.map((e) => ({
        categoryId: cat.id,
        textFr: e.q.fr,
        textEn: e.q.en,
        options: e.options,
        answerIndex: e.answer,
      })),
    });
    total += entries.length;
    console.log(`  ${cat.id.padEnd(14)} ${entries.length} questions`);
  }
  console.log(`✓ ${total} questions importées`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
