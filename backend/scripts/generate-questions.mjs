#!/usr/bin/env node
// Génère des questions de quiz via un modèle IA local (Ollama, installé
// sur le serveur — AUCUNE clé API, aucun coût par appel). Principe
// directeur (décision du 15/08/2026, voir MEMORY) : la génération est
// TOUJOURS hors ligne, en lot, jamais pendant une partie en cours — le
// bank de questions résultant est ensuite pioché exactement comme le
// bank écrit à la main (§quiz/questions.ts pickQuestions), l'IA n'a
// donc jamais accès aux réponses "en direct", ni contre un joueur ni
// contre l'ordinateur (dont le niveau reste réglé par bot.ts, inchangé).
//
// Insère toujours avec active=false : une question générée n'est jamais
// visible des joueurs sans relecture humaine (petit modèle local = du
// bon contenu la plupart du temps, mais de vraies hallucinations
// factuelles possibles sur des détails précis, vu en test). Activer au
// cas par cas après relecture, ex. :
//   UPDATE "Question" SET active=true WHERE id IN (...);
//
// Usage : node scripts/generate-questions.mjs <categoryId> <count> [modele]
// Ex.    : node scripts/generate-questions.mjs culture 20 qwen2.5:7b-instruct

import { PrismaClient } from "@prisma/client";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.argv[4] || "qwen2.5:7b-instruct";
const BATCH_SIZE = 5; // questions par appel modèle — trop grand = réponses tronquées/moins fiables

const SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
          answerIndex: { type: "integer", minimum: 0, maximum: 3 },
        },
        required: ["text", "options", "answerIndex"],
      },
    },
  },
  required: ["questions"],
};

function buildPrompt(categoryName, n, existingTexts) {
  const avoid = existingTexts.length
    ? `\nNe répète aucune de ces questions déjà existantes :\n- ${existingTexts.join("\n- ")}`
    : "";
  return (
    `Génère ${n} questions de quiz à choix multiple en français, catégorie ` +
    `"${categoryName}", niveau moyen, adaptées à un public camerounais/` +
    `francophone. Chaque question doit porter sur un fait VÉRIFIABLE et ` +
    `largement connu — pas de détail obscur, pas de nom propre dont tu ` +
    `n'es pas certain de l'exactitude. Pour chaque question : un texte ` +
    `clair, exactement 4 options plausibles (une seule correcte), et ` +
    `answerIndex = l'index (0 à 3) de la bonne réponse dans le tableau ` +
    `options. N'ajoute jamais l'index entre parenthèses dans le texte ` +
    `des options.${avoid}`
  );
}

function cleanOption(s) {
  return s.replace(/\s*\(\d\)\s*$/, "").trim();
}

async function generateBatch(categoryName, n, existingTexts) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt: buildPrompt(categoryName, n, existingTexts),
      stream: false,
      format: SCHEMA,
      // num_thread plafonné : le serveur est PARTAGÉ avec d'autres
      // projets (k3s, bases de données...) — sans ce plafond, Ollama
      // prend tous les cœurs disponibles et le reste des services en a
      // pâti en test (load average > 12 sur 12 cœurs). 6 cœurs laisse
      // de la marge, quitte à générer un peu plus lentement.
      options: { temperature: 0.8, num_thread: 6 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const parsed = JSON.parse(data.response);
  return parsed.questions ?? [];
}

function isValid(q) {
  if (!q || typeof q.text !== "string" || !q.text.trim()) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (q.options.some((o) => typeof o !== "string" || !o.trim())) return false;
  const cleaned = q.options.map(cleanOption);
  if (new Set(cleaned.map((o) => o.toLowerCase())).size !== 4) return false; // options en double
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) return false;
  return true;
}

async function main() {
  const [, , categoryId, countArg] = process.argv;
  const count = Number(countArg) || 10;
  if (!categoryId) {
    console.error("Usage: node scripts/generate-questions.mjs <categoryId> <count> [modele]");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error(`Catégorie inconnue: ${categoryId}`);

  const existing = await prisma.question.findMany({ where: { categoryId }, select: { textFr: true } });
  const existingTexts = existing.map((q) => q.textFr);

  let created = 0;
  let rejected = 0;
  let attempts = 0;
  while (created < count && attempts < count * 4) {
    attempts += 1;
    const batchN = Math.min(BATCH_SIZE, count - created);
    let batch;
    try {
      batch = await generateBatch(category.nameFr, batchN, existingTexts.slice(-40)); // borne la taille du prompt
    } catch (err) {
      console.error("Échec génération, on continue :", err.message);
      continue;
    }
    for (const q of batch) {
      if (created >= count) break;
      if (!isValid(q)) {
        rejected += 1;
        console.warn("Rejetée (format invalide) :", JSON.stringify(q));
        continue;
      }
      const text = q.text.trim();
      if (existingTexts.some((t) => t.toLowerCase() === text.toLowerCase())) {
        rejected += 1;
        console.warn("Rejetée (doublon) :", text);
        continue;
      }
      const options = q.options.map(cleanOption);
      await prisma.question.create({
        data: {
          categoryId,
          textFr: text,
          textEn: text, // jamais lu par l'app, champ dormant (§schema.prisma)
          options,
          answerIndex: q.answerIndex,
          active: false, // relecture humaine avant mise en jeu
          source: "ai",
        },
      });
      existingTexts.push(text);
      created += 1;
      console.log(`✓ [${created}/${count}] ${text}`);
    }
  }

  console.log(`\nTerminé : ${created} créées (active=false, à relire), ${rejected} rejetées.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
