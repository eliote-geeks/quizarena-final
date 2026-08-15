#!/usr/bin/env node
// Ajoute des catégories sans toucher au seed principal (prisma/seed.ts,
// qui vide/réinsère TOUTES les questions des catégories qu'il connaît —
// dangereux à relancer juste pour en ajouter une). upsert idempotent,
// sûr à relancer.
//
// Usage : node scripts/add-categories.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Catégories centrées sur la vie au Cameroun (15/08/2026, demande de
// Paul : "tous les domaines de la vie au Cameroun"), distinctes des
// catégories généralistes existantes (Afrique, Sport, Musique...).
const CATEGORIES = [
  { id: "football-cm", nameFr: "Football camerounais", nameEn: "Cameroonian football", difficulty: "facile" },
  { id: "musique-cm", nameFr: "Musique & stars camerounaises", nameEn: "Cameroonian music & stars", difficulty: "facile" },
  { id: "histoire-cm", nameFr: "Histoire du Cameroun", nameEn: "History of Cameroon", difficulty: "moyen" },
  { id: "societe-cm", nameFr: "Vie & société au Cameroun", nameEn: "Cameroonian life & society", difficulty: "moyen" },
  { id: "gastronomie-cm", nameFr: "Gastronomie camerounaise", nameEn: "Cameroonian cuisine", difficulty: "facile" },
  { id: "geographie-cm", nameFr: "Géographie du Cameroun", nameEn: "Geography of Cameroon", difficulty: "moyen" },
];

async function main() {
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { id: cat.id },
      create: cat,
      update: { nameFr: cat.nameFr, nameEn: cat.nameEn, difficulty: cat.difficulty },
    });
    console.log(`✓ ${cat.id} (${cat.nameFr})`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
