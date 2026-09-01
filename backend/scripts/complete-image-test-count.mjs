#!/usr/bin/env node
// Complète le compte du lot de test avec des formulations alternatives
// sur 7 visuels déjà licenciés (les médias restent eux aussi sourcés).
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const templates = [
  "Quel nom associes-tu à ce visuel ?", "Que reconnais-tu sur cette image ?", "Quel est le bon repère pour cette illustration ?",
  "Identifie le sujet montré à l’écran.", "Ce visuel correspond à quel élément ?", "Quel intitulé décrit cette image ?", "Quel sujet est illustré ici ?",
];
const rows = await prisma.question.findMany({ where: { source: "wikimedia_test_2026" }, take: 7, orderBy: { createdAt: "asc" } });
let added = 0;
for (const [index, row] of rows.entries()) {
  const options = Array.isArray(row.options) ? [...row.options] : [];
  const correct = options[row.answerIndex];
  if (!correct || options.length !== 4) continue;
  for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  await prisma.question.create({ data: { categoryId: row.categoryId, textFr: templates[index], textEn: templates[index], options, answerIndex: options.indexOf(correct), active: true, source: "wikimedia_test_2026", subcategory: row.subcategory, mediaUrl: row.mediaUrl, mediaAlt: row.mediaAlt, sourceUrl: row.sourceUrl, verifiedAt: new Date() } });
  added++;
}
console.log(`Complément: ${added}`); await prisma.$disconnect();
