#!/usr/bin/env node
// Insère le lot de questions Cameroun vérifiées manuellement (19/08/2026,
// recherche web réelle par question — voir cameroon-questions.data.mjs).
// active=true directement : source="manual", même rigueur que le
// premier lot Cameroun du 15/08 — pas de relecture différée nécessaire
// contrairement au lot généré par IA (source="ai", toujours active=false).
import { PrismaClient } from "@prisma/client";
import { QUESTIONS } from "./cameroon-questions.data.mjs";

const prisma = new PrismaClient();

async function main() {
  let created = 0;
  let skipped = 0;
  for (const q of QUESTIONS) {
    const dup = await prisma.question.findFirst({ where: { categoryId: q.categoryId, textFr: q.text } });
    if (dup) {
      skipped += 1;
      console.warn("⚠️  déjà présente, ignorée :", q.text);
      continue;
    }
    await prisma.question.create({
      data: {
        categoryId: q.categoryId,
        textFr: q.text,
        textEn: q.text, // champ dormant, jamais lu par l'app (§schema.prisma)
        options: q.options,
        answerIndex: q.answerIndex,
        active: true,
        source: "manual",
      },
    });
    created += 1;
  }
  console.log(`\n✓ ${created} questions insérées, ${skipped} déjà présentes.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
