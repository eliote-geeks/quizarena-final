#!/usr/bin/env node
/** Reclasse en place les questions OpenQuizzDB déjà importées. */
import { PrismaClient } from "@prisma/client";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { legacyCategory } from "./openquizzdb-taxonomy.mjs";

const DATA_DIR = process.argv[2];
const APPLY = process.argv.includes("--apply");
if (!DATA_DIR) {
  console.error("Usage: node --env-file=.env scripts/reclassify-openquizzdb.mjs <dossier-data> [--apply]");
  process.exit(1);
}

const prisma = new PrismaClient();

function fold(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’]/g, "'").replace(/[^a-zA-Z0-9']+/g, " ").trim().toLowerCase();
}
function decodeHtml(value) {
  return String(value ?? "").replace(/&middot;/g, "·").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function parseCsvLine(line) {
  const fields = []; let current = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') { if (quoted && line[i + 1] === '"') { current += '"'; i += 1; } else quoted = !quoted; }
    else if (char === ";" && !quoted) { fields.push(current.trim()); current = ""; }
    else current += char;
  }
  fields.push(current.trim()); return fields;
}
function questionRows(content) {
  const result = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    const languageColumn = /^[a-z]{2}$/i.test(fields[1] ?? "");
    const language = languageColumn ? String(fields[1]).toLowerCase() : "fr";
    const start = languageColumn ? 2 : 1;
    const text = decodeHtml(fields[start] ?? "");
    if (text.length >= 8) result.push({ text: fold(text), language });
  }
  return result;
}

async function main() {
  const categories = new Set((await prisma.category.findMany({ select: { id: true } })).map((row) => row.id));
  const desiredByText = new Map();
  const nonFrenchTexts = new Set();
  const conflicts = new Set();
  const sourceCounts = new Map();
  const files = (await readdir(DATA_DIR)).filter((name) => /^openquizzdb_\d+\.csv$/.test(name));
  for (const file of files) {
    const id = Number(basename(file).match(/\d+/)?.[0]);
    let title = "";
    try { title = (await readFile(join(DATA_DIR, `openquizzdb_${id}.desc`), "utf8")).match(/^TITRE\s*:\s*(.*)$/m)?.[1]?.trim() ?? ""; } catch {}
    const categoryId = legacyCategory(id, title);
    if (categoryId !== "__skip" && !categories.has(categoryId)) throw new Error(`Catégorie absente: ${categoryId}`);
    const rows = questionRows(await readFile(join(DATA_DIR, file), "utf8"));
    const frenchRows = rows.filter((row) => row.language === "fr");
    sourceCounts.set(categoryId, (sourceCounts.get(categoryId) ?? 0) + frenchRows.length);
    for (const { text, language } of rows) {
      if (language !== "fr") nonFrenchTexts.add(text);
      if (desiredByText.has(text) && desiredByText.get(text) !== categoryId) conflicts.add(text);
      else desiredByText.set(text, categoryId);
    }
  }
  for (const key of conflicts) desiredByText.delete(key);

  const questions = await prisma.question.findMany({ where: { source: "openquizzdb" }, select: { id: true, textFr: true, categoryId: true, active: true } });
  const changes = new Map();
  const excluded = [];
  const nonFrench = [];
  let matched = 0;
  for (const question of questions) {
    const normalized = fold(question.textFr);
    if (nonFrenchTexts.has(normalized)) {
      if (question.active) nonFrench.push(question.id);
      continue;
    }
    const desired = desiredByText.get(normalized);
    if (!desired) continue;
    matched += 1;
    if (desired === "__skip") { if (question.active) excluded.push(question.id); continue; }
    if (desired !== question.categoryId) {
      if (!changes.has(desired)) changes.set(desired, []);
      changes.get(desired).push(question.id);
    }
  }
  const report = {
    mode: APPLY ? "apply" : "dry-run",
    imported: questions.length,
    matched,
    ambiguousTexts: conflicts.size,
    categoryChanges: Object.fromEntries([...changes].map(([category, ids]) => [category, ids.length]).sort()),
    deactivatedAdultQuestions: excluded.length,
    deactivatedNonFrenchQuestions: nonFrench.length,
    archiveDistribution: Object.fromEntries([...sourceCounts].sort()),
  };
  console.log(JSON.stringify(report, null, 2));
  if (!APPLY) return;
  for (const [categoryId, ids] of changes) {
    for (let i = 0; i < ids.length; i += 500) await prisma.question.updateMany({ where: { id: { in: ids.slice(i, i + 500) } }, data: { categoryId } });
  }
  for (let i = 0; i < excluded.length; i += 500) await prisma.question.updateMany({ where: { id: { in: excluded.slice(i, i + 500) } }, data: { active: false } });
  for (let i = 0; i < nonFrench.length; i += 500) await prisma.question.updateMany({ where: { id: { in: nonFrench.slice(i, i + 500) } }, data: { active: false } });
  console.log("Reclassement appliqué.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
