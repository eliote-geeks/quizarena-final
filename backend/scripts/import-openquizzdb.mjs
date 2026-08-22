#!/usr/bin/env node
/**
 * Importe la banque française OpenQuizzDB (CC BY-SA 4.0).
 *
 * Les anciens jeux complets (30 QCM) proviennent du miroir public :
 *   https://github.com/Zeuh/OpenQuizzDB
 * Les jeux ajoutés depuis ce miroir sont récupérés depuis le catalogue
 * officiel, au format JSON (4 QCM par jeu depuis OpenQuizzDB 4.0).
 *
 * Usage :
 *   node --env-file=.env scripts/import-openquizzdb.mjs /chemin/OpenQuizzDB/data
 *
 * L'import est idempotent : même catégorie + même texte normalisé = doublon.
 * Les questions sont activées directement car la source est une banque relue
 * par des rédacteurs, et non une sortie brute du modèle local.
 */

import { PrismaClient } from "@prisma/client";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { legacyCategory } from "./openquizzdb-taxonomy.mjs";

const LEGACY_DIR = process.argv[2];
if (!LEGACY_DIR) {
  console.error("Usage: node --env-file=.env scripts/import-openquizzdb.mjs <dossier-data>");
  process.exit(1);
}

const LISTING_URL = "https://www.openquizzdb.org/listing/";
const SOURCE = "openquizzdb";
const prisma = new PrismaClient();

const CATEGORY_MAP = new Map([
  ["ALPHAQUIZZ", "culture"],
  ["ANIMAUX", "animaux"],
  ["ARCHEOLOGIE", "histoire"],
  ["ARTS", "arts"],
  ["BD", "bandes-dessinees"],
  ["BANDE DESSINEE", "bandes-dessinees"],
  ["CELEBRITES", "celebrites"],
  ["CINEMA", "cinema"],
  ["CULTURE", "culture"],
  ["CULT GENERALE", "culture"],
  ["DEFI", "culture"],
  ["DEFI CHIFFRE", "culture"],
  ["GASTRONOMIE", "gastronomie"],
  ["GEOGRAPHIE", "geographie"],
  ["HISTOIRE", "histoire"],
  ["INFORMATIQUE", "technologie"],
  ["LITTERATURE", "litterature"],
  ["LOISIRS", "societe"],
  ["MOTS CROISES", "litterature"],
  ["MOTSCROISES", "litterature"],
  ["MUSIQUE", "musique"],
  ["NATURE", "nature"],
  ["ORTHOQUIZZ", "litterature"],
  ["PAYS DU MONDE", "geographie"],
  ["MONDE", "geographie"],
  ["ADULTES", "__skip"],
  ["QUADRIQUIZZ", "culture"],
  ["QUOTIDIEN", "societe"],
  ["SCIENCES", "sciences"],
  ["SPORTS", "sport"],
  ["TELEVISION", "television"],
  ["TOURISME", "voyages"],
  ["WEB", "technologie"],
]);

function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’]/g, "'")
    .replace(/[^a-zA-Z0-9']+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeQuestion(value) {
  return fold(value).toLocaleLowerCase("fr");
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ";" && !quoted) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseLegacyCsv(content) {
  const questions = [];
  for (const rawLine of content.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const f = parseCsvLine(rawLine);
    const languageColumn = /^[a-z]{2}$/i.test(f[1] ?? "");
    if (languageColumn && String(f[1]).toLowerCase() !== "fr") continue;
    const start = languageColumn ? 2 : 1;
    if (f.length < start + 5) continue;
    const text = decodeHtml(f[start]);
    const options = f.slice(start + 1, start + 5).map(decodeHtml);
    if (text.length < 8 || options.some((option) => option.length < 1)) continue;
    questions.push({ text, options, answerIndex: 0 });
  }
  return questions;
}

function parseListing(html) {
  const categoryById = new Map();
  const titleById = new Map();
  let currentCategory = "culture";
  const tokenPattern = /<div id="([A-Z0-9_-]+)"><\/div>|onclick="goq\((\d+)\)"[^>]*>\s*([^<]+)</g;
  for (const match of html.matchAll(tokenPattern)) {
    if (match[1]) {
      currentCategory = CATEGORY_MAP.get(fold(match[1])) ?? "culture";
      continue;
    }
    const id = Number(match[2]);
    categoryById.set(id, currentCategory);
    titleById.set(id, decodeHtml(match[3]).trim());
  }
  return { categoryById, titleById };
}

function inferCategory(title, fallback = "culture") {
  const t = fold(title);
  if (/AFRIQUE|CAMEROUN|CONGO|SENEGAL|NIGERIA|GHANA|KENYA|MAROC|ALGERIE|TUNISIE|EGYPTE|MALI|IVOIRE/.test(t)) return "afrique";
  return fallback;
}

async function fetchText(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: { "User-Agent": "QuizArena content importer (contact: admin QuizArena)", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function fetchCurrentQuiz(id) {
  const page = await fetchText("https://www.openquizzdb.org/download.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `id=${id}`,
  });
  const url = page.match(/href="(https:\/\/download\.openquizzdb\.org\/[^\"]+\/openquizzdb_\d+\.json)"/i)?.[1];
  if (!url) return [];
  const json = JSON.parse(await fetchText(url));
  const rows = Array.isArray(json.quizz) ? json.quizz : [];
  return rows.map((q) => {
    const options = Array.isArray(q.propositions) ? q.propositions.map(decodeHtml) : [];
    const answerIndex = options.findIndex((option) => fold(option) === fold(q["réponse"]));
    return { text: decodeHtml(q.question), options, answerIndex };
  });
}

function structurallyValid(question) {
  if (!question || question.text.trim().length < 8) return false;
  if (!Array.isArray(question.options) || question.options.length !== 4) return false;
  if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex > 3) return false;
  if (question.options.some((option) => !String(option).trim())) return false;
  return new Set(question.options.map(fold)).size === 4;
}

async function insertQuestions(rows, existingKeys, categoryCounts) {
  let inserted = 0;
  let duplicates = 0;
  let rejected = 0;
  const data = [];
  for (const row of rows) {
    if (!structurallyValid(row)) {
      rejected += 1;
      continue;
    }
    const key = `${row.categoryId}|${normalizeQuestion(row.text)}`;
    if (existingKeys.has(key)) {
      duplicates += 1;
      continue;
    }
    existingKeys.add(key);
    data.push({
      categoryId: row.categoryId,
      textFr: row.text.trim(),
      textEn: row.text.trim(),
      options: row.options.map((option) => String(option).trim()),
      answerIndex: row.answerIndex,
      active: true,
      source: SOURCE,
    });
    categoryCounts.set(row.categoryId, (categoryCounts.get(row.categoryId) ?? 0) + 1);
  }
  for (let i = 0; i < data.length; i += 500) {
    const result = await prisma.question.createMany({ data: data.slice(i, i + 500) });
    inserted += result.count;
  }
  return { inserted, duplicates, rejected };
}

async function main() {
  const listing = await fetchText(LISTING_URL);
  const { categoryById, titleById } = parseListing(listing);
  const categories = new Set((await prisma.category.findMany({ select: { id: true } })).map((c) => c.id));
  const existing = await prisma.question.findMany({ select: { categoryId: true, textFr: true } });
  const existingKeys = new Set(existing.map((q) => `${q.categoryId}|${normalizeQuestion(q.textFr)}`));
  const categoryCounts = new Map();
  const files = (await readdir(LEGACY_DIR)).filter((name) => /^openquizzdb_\d+\.csv$/.test(name));
  const legacyIds = new Set(files.map((name) => Number(name.match(/\d+/)?.[0])));
  const legacyRows = [];

  for (const file of files) {
    const id = Number(basename(file).match(/\d+/)?.[0]);
    const title = titleById.get(id) ?? "";
    const catalogueCategory = legacyCategory(id, title);
    if (catalogueCategory === "__skip") continue;
    const mapped = inferCategory(title, catalogueCategory);
    const categoryId = categories.has(mapped) ? mapped : "culture";
    const content = await readFile(join(LEGACY_DIR, file), "utf8");
    legacyRows.push(...parseLegacyCsv(content).map((q) => ({ ...q, categoryId })));
  }

  const legacyResult = await insertQuestions(legacyRows, existingKeys, categoryCounts);
  console.log("Archive historique :", legacyResult);

  const currentIds = [...categoryById.keys()].filter((id) => !legacyIds.has(id));
  let currentInserted = 0;
  let currentRejected = 0;
  let currentDuplicates = 0;
  for (let i = 0; i < currentIds.length; i += 1) {
    const id = currentIds[i];
    try {
      const title = titleById.get(id) ?? "";
      const catalogueCategory = categoryById.get(id) ?? "culture";
      if (catalogueCategory === "__skip") continue;
      const mapped = inferCategory(title, catalogueCategory);
      const categoryId = categories.has(mapped) ? mapped : "culture";
      const questions = (await fetchCurrentQuiz(id)).map((q) => ({ ...q, categoryId }));
      const result = await insertQuestions(questions, existingKeys, categoryCounts);
      currentInserted += result.inserted;
      currentRejected += result.rejected;
      currentDuplicates += result.duplicates;
    } catch (error) {
      console.warn(`Quizz récent ${id} ignoré : ${error.message}`);
    }
    if ((i + 1) % 25 === 0) console.log(`Catalogue récent : ${i + 1}/${currentIds.length}`);
  }

  const active = await prisma.question.count({ where: { active: true } });
  console.log(JSON.stringify({
    active,
    legacy: legacyResult,
    current: { inserted: currentInserted, duplicates: currentDuplicates, rejected: currentRejected },
    importedByCategory: Object.fromEntries([...categoryCounts.entries()].sort()),
  }, null, 2));
  if (active < 10_000) throw new Error(`Objectif non atteint : ${active}/10000 questions actives`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
