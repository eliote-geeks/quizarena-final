#!/usr/bin/env node
/** Crée ou actualise les catégories éditoriales sans toucher aux questions. */
import { PrismaClient } from "@prisma/client";

export const QUESTION_CATEGORIES = [
  ["animaux", "Animaux", "Animals", "moyen"],
  ["environnement", "Environnement", "Environment", "moyen"],
  ["television", "Télévision", "Television", "facile"],
  ["jeux-video", "Jeux vidéo", "Video games", "moyen"],
  ["automobile", "Automobile", "Automotive", "moyen"],
  ["sante", "Santé", "Health", "difficile"],
  ["arts", "Arts", "Arts", "moyen"],
  ["societe", "Société", "Society", "moyen"],
  ["voyages", "Voyages & tourisme", "Travel & tourism", "facile"],
  ["bandes-dessinees", "Bande dessinée", "Comics", "moyen"],
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const [id, nameFr, nameEn, difficulty] of QUESTION_CATEGORIES) {
      await prisma.category.upsert({
        where: { id },
        create: { id, nameFr, nameEn, difficulty },
        update: { nameFr, nameEn, difficulty },
      });
    }
    console.log(`${QUESTION_CATEGORIES.length} catégories disponibles.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}

