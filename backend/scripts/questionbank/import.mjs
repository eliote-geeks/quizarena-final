#!/usr/bin/env node
// Importe la banque de questions vérifiée, en validant chaque entrée.
//
//   node scripts/questionbank/import.mjs --dry            # valide, n'écrit rien
//   node scripts/questionbank/import.mjs --append         # ajoute au bank existant
//   node scripts/questionbank/import.mjs --replace        # remplace TOUT le bank
//
// --replace fait la suppression et l'insertion dans UNE SEULE transaction.
// C'est indispensable : `pickQuestions` (§quiz/questions.ts) lève une
// exception dès qu'il y a moins de 10 questions actives disponibles, donc
// un DELETE suivi d'un INSERT séparé ferait planter tous les duels et
// tournois en cours pendant l'intervalle. Ici, aucune requête ne voit
// jamais une banque vide.

import { PrismaClient } from "@prisma/client";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateBatch } from "./validate.mjs";
import { randomInt } from "node:crypto";

const prisma = new PrismaClient();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, "data");

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry");
const REPLACE = args.has("--replace");
const APPEND = args.has("--append");

if (!DRY && !REPLACE && !APPEND) {
  console.error("Précise --dry, --append ou --replace.");
  process.exit(1);
}

async function loadBatch() {
  let files = [];
  try {
    files = (await readdir(DATA_DIR)).filter((f) => f.endsWith(".mjs")).sort();
  } catch {
    console.error(`Aucun dossier de données : ${DATA_DIR}`);
    process.exit(1);
  }
  const all = [];
  for (const file of files) {
    const mod = await import(path.join(DATA_DIR, file));
    const questions = mod.default ?? mod.questions ?? [];
    console.log(`  ${file.padEnd(28)} ${String(questions.length).padStart(4)} questions`);
    all.push(...questions);
  }
  return all;
}

/**
 * Répartit la bonne réponse sur les quatre positions.
 *
 * Écrire les questions à la main donne systématiquement answerIndex=0 : on
 * pose la bonne réponse en premier puis on invente des distracteurs. Le
 * serveur permute déjà les options à l'envoi (§shuffledOptions), donc un
 * joueur ne peut pas exploiter la position — mais la banque elle-même
 * resterait triviale à lire pour quiconque y accède (export, backoffice,
 * fuite de sauvegarde). On mélange donc à l'insertion : c'est de
 * l'infrastructure, pas de la discipline d'écriture, et ça vaut pour tous
 * les lots à venir sans que personne ait à y penser.
 */
function shuffleOptions(q) {
  const answer = q.options[q.answerIndex];
  const opts = [...q.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { ...q, options: opts, answerIndex: opts.indexOf(answer) };
}

function toRow(q, sourceTag) {
  return {
    categoryId: q.categoryId,
    textFr: q.textFr,
    // Le bank est francophone (marché Cameroun) : on ne fabrique pas une
    // fausse traduction anglaise, on recopie — le champ reste obligatoire
    // au schéma mais n'est servi nulle part côté client.
    textEn: q.textEn ?? q.textFr,
    options: q.options,
    answerIndex: q.answerIndex,
    active: true,
    source: sourceTag,
    subcategory: q.subcategory ?? null,
    mediaUrl: q.mediaUrl ?? null,
    mediaAlt: q.mediaAlt ?? null,
    sourceUrl: q.sourceUrl ?? null,
    verifiedAt: new Date(),
    // Daté dans l'énoncé = permanent. expiresAt n'est renseigné que pour le
    // résiduel réellement périssable.
    expiresAt: q.expiresAt ? new Date(q.expiresAt) : null,
    tournamentEligible: q.tournamentEligible ?? true,
  };
}

(async () => {
  console.log("Chargement des fichiers de données :");
  const loaded = await loadBatch();
  // Mélange AVANT validation : le contrôle d'équilibre des positions doit
  // porter sur ce qui sera réellement inséré.
  const batch = loaded.map((q) =>
    Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answerIndex)
      ? shuffleOptions(q)
      : q
  );
  console.log(`\nTotal candidat : ${batch.length} questions\n`);

  const existingTexts = APPEND
    ? (await prisma.question.findMany({ select: { textFr: true } })).map((r) => r.textFr)
    : []; // en --replace, l'ancien bank disparaît : pas de doublon possible

  const report = validateBatch(batch, existingTexts);

  console.log(`Validation : ${report.ok.length} conformes, ${report.rejected.length} rejetées`);
  for (const w of report.warnings) console.log(`  ATTENTION : ${w}`);
  for (const r of report.rejected.slice(0, 40)) {
    console.log(`  REJET — ${String(r.question.textFr).slice(0, 70)}`);
    r.errors.forEach((e) => console.log(`     → ${e}`));
  }
  if (report.rejected.length > 40) console.log(`  … et ${report.rejected.length - 40} autres rejets`);

  // Couverture par catégorie : une catégorie sous le seuil est retirée du
  // sélecteur côté API, autant le voir avant d'écrire.
  const byCat = {};
  for (const q of report.ok) byCat[q.categoryId] = (byCat[q.categoryId] ?? 0) + 1;
  console.log("\nCouverture par catégorie :");
  for (const [cat, n] of Object.entries(byCat).sort()) {
    const media = report.ok.filter((q) => q.categoryId === cat && q.mediaUrl).length;
    console.log(`  ${cat.padEnd(14)} ${String(n).padStart(4)}  (${media} illustrées)`);
  }
  const illustrated = report.ok.filter((q) => q.mediaUrl).length;
  const actu = report.ok.filter((q) => q.isActualite).length;
  console.log(`\nIllustrées : ${illustrated}/${report.ok.length} · actualité datée : ${actu}/${report.ok.length}`);

  if (DRY) {
    console.log("\n--dry : rien n'a été écrit.");
    await prisma.$disconnect();
    return;
  }
  if (report.rejected.length) {
    console.error("\nDes questions ont été rejetées : corrige-les avant d'importer.");
    await prisma.$disconnect();
    process.exit(1);
  }

  const tag = `qa_bank_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const rows = report.ok.map((q) => toRow(q, tag));

  if (REPLACE) {
    const before = await prisma.question.count();
    await prisma.$transaction(async (tx) => {
      // Les QuestionExposure partent en cascade (§schema.prisma) : les
      // joueurs repartent donc sur un historique vierge, ce qui est le
      // comportement voulu pour une banque entièrement neuve.
      await tx.question.deleteMany({});
      await tx.question.createMany({ data: rows });
    });
    const after = await prisma.question.count();
    console.log(`\nRemplacement effectué : ${before} → ${after} questions (transaction unique, aucune fenêtre à banque vide).`);
  } else {
    await prisma.question.createMany({ data: rows });
    console.log(`\nAjout effectué : ${rows.length} questions insérées (tag ${tag}).`);
  }

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
