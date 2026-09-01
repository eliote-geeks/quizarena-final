#!/usr/bin/env node
// Banque visuelle de test, issue uniquement des relations P18 Wikidata et
// fichiers Wikimedia Commons avec licence affichée. Pas d'IA factuelle ici :
// la bonne réponse est le libellé de l'entité reliée à l'image par Wikidata.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TARGET = Number(process.env.IMAGE_TEST_TARGET || 500);
const terms = {
  culture: ["monument", "musée", "architecture", "tradition", "instrument de musique"],
  histoire: ["château", "empereur", "civilisation", "explorateur", "site historique"],
  geographie: ["montagne", "île", "volcan", "fleuve", "capitale"],
  sciences: ["planète", "astronomie", "biologie", "invention", "laboratoire"],
  sport: ["athlète", "football", "tennis", "basketball", "stade"],
  afrique: ["Cameroun", "Afrique", "ville africaine", "site africain", "art africain", "Mont Cameroun", "chutes Victoria", "éléphant d'Afrique"],
  cinema: ["cinéaste", "acteur", "cinéma", "réalisateur", "film"],
  musique: ["musicien", "chanteur", "orchestre", "instrument", "compositeur"],
  celebrites: ["acteur", "artiste", "personnalité", "scientifique", "écrivain"],
  technologie: ["ordinateur", "robot", "satellite", "technologie", "véhicule"],
  nature: ["animal", "plante", "parc national", "oiseau", "paysage"],
  gastronomie: ["plat", "cuisine", "fruit", "aliment", "boisson"],
  litterature: ["écrivain", "poète", "romancier", "bibliothèque", "littérature"],
  anime: ["animation japonaise", "manga", "animateur japonais", "studio animation", "bande dessinée japonaise", "Hayao Miyazaki", "Osamu Tezuka", "Isao Takahata", "Mamoru Hosoda", "Satoshi Kon", "Makoto Shinkai"],
};
const templates = [
  "Observe l’image : quel sujet est présenté ?",
  "Reconnais-tu l’élément illustré ?",
  "Quel nom correspond à ce visuel ?",
  "Quel est le bon intitulé pour cette image ?",
  "À quel sujet associes-tu cette illustration ?",
];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function wikiFetch(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": "QuizArenaClassic/1.0 (content-curation; contact=admin@quizarena.local)" }, signal: AbortSignal.timeout(20_000) });
    if (response.status !== 429) { await pause(1_100); return response; }
    const retryAfter = Math.min(30, Math.max(5, Number(response.headers.get("retry-after")) || (attempt + 1) * 5));
    console.warn(`Limite Wikimedia atteinte, reprise dans ${retryAfter}s…`);
    await pause(retryAfter * 1_000);
  }
  throw new Error("Wikimedia limite temporairement les requêtes");
}

async function wikidataSearch(term) {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({ action: "wbsearchentities", search: term, language: "fr", format: "json", limit: "50", origin: "*" }).toString();
  const response = await wikiFetch(url);
  if (!response.ok) throw new Error(`Wikidata ${response.status}`);
  return (await response.json()).search ?? [];
}
async function enrich(items) {
  if (!items.length) return [];
  const entityUrl = new URL("https://www.wikidata.org/w/api.php");
  entityUrl.search = new URLSearchParams({ action: "wbgetentities", ids: items.map((x) => x.id).join("|"), props: "labels|descriptions|claims", languages: "fr", format: "json", origin: "*" }).toString();
  const entitiesResponse = await wikiFetch(entityUrl);
  if (!entitiesResponse.ok) return [];
  const entities = (await entitiesResponse.json()).entities ?? {};
  const rows = Object.entries(entities).flatMap(([id, entity]) => {
    const filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    const label = entity.labels?.fr?.value;
    if (!filename || !label || label.length < 2 || label.length > 90) return [];
    return [{ id, filename, label, description: entity.descriptions?.fr?.value ?? "" }];
  });
  const output = [];
  for (let start = 0; start < rows.length; start += 20) {
    const group = rows.slice(start, start + 20);
    const infoUrl = new URL("https://commons.wikimedia.org/w/api.php");
    infoUrl.search = new URLSearchParams({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "768", titles: group.map((x) => `File:${x.filename}`).join("|"), format: "json", origin: "*" }).toString();
    const infoResponse = await wikiFetch(infoUrl);
    if (!infoResponse.ok) continue;
    const pages = Object.values((await infoResponse.json()).query?.pages ?? {});
    const infoByFile = new Map(pages.map((page) => [String(page.title ?? "").replace(/^File:/, ""), page.imageinfo?.[0]]));
    for (const row of group) {
      const info = infoByFile.get(row.filename);
      const license = info?.extmetadata?.LicenseShortName?.value;
      if (!info?.thumburl || !info?.descriptionurl || !license) continue;
      output.push({ ...row, mediaUrl: info.thumburl, sourceUrl: info.descriptionurl, license: String(license).replace(/<[^>]*>/g, "") });
    }
  }
  return output;
}

function optionsFor(candidate, pool) {
  const choices = [...new Set(pool.map((x) => x.label).filter((label) => label !== candidate.label))].slice(0, 3);
  if (choices.length < 3) return null;
  const options = [candidate.label, ...choices];
  for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
  return { options, answerIndex: options.indexOf(candidate.label) };
}

async function main() {
  const perCategory = Math.floor(TARGET / Object.keys(terms).length);
  const remainder = TARGET % Object.keys(terms).length;
  const existing = await prisma.question.count({ where: { source: "wikimedia_test_2026" } });
  const existingByCategory = new Map((await prisma.question.groupBy({ by: ["categoryId"], where: { source: "wikimedia_test_2026" }, _count: { id: true } })).map((row) => [row.categoryId, row._count.id]));
  let created = 0;
  const desired = Math.max(0, TARGET - existing);
  const seenEntities = new Set();
  for (const [categoryIndex, [categoryId, searches]] of Object.entries(terms).entries()) {
    const categoryTarget = Math.max(0, perCategory + (categoryIndex < remainder ? 1 : 0) - (existingByCategory.get(categoryId) ?? 0));
    if (categoryTarget === 0) continue;
    let categoryCreated = 0;
    const candidates = [];
    for (const term of searches) {
      try {
        const raw = await wikidataSearch(term);
        const enriched = await enrich(raw);
        for (const item of enriched) if (!seenEntities.has(item.id)) candidates.push(item);
      } catch (error) { console.warn(`[${categoryId}] ${term}: ${error.message}`); }
    }
    const unique = candidates.filter((item) => !seenEntities.has(item.id));
    for (const item of unique.slice(0, categoryTarget + 8)) {
      if (created >= desired || categoryCreated >= categoryTarget) break;
      const answer = optionsFor(item, unique);
      if (!answer) continue;
      const textFr = templates[created % templates.length];
      const duplicate = await prisma.question.findFirst({ where: { categoryId, mediaUrl: item.mediaUrl } });
      if (duplicate) continue;
      await prisma.question.create({ data: {
        categoryId, textFr, textEn: textFr, options: answer.options, answerIndex: answer.answerIndex,
        active: true, source: "wikimedia_test_2026", subcategory: `Visuel · ${item.license}`,
        mediaUrl: item.mediaUrl, mediaAlt: item.label, sourceUrl: item.sourceUrl, verifiedAt: new Date(),
      } });
      seenEntities.add(item.id);
      created++;
      categoryCreated++;
    }
    console.log(`${categoryId}: ${categoryCreated} nouvelles (${existing + created}/${TARGET} total)`);
  }
  console.log(`Banque visuelle créée: ${created} nouvelles (${existing + created}/${TARGET} total)`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
