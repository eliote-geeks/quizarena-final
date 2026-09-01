#!/usr/bin/env node
// Récupère les illustrations depuis Wikimedia Commons, les convertit en WebP
// et les héberge en local.
//
//   node scripts/questionbank/fetch-images.mjs
//
// Pourquoi auto-héberger plutôt que pointer sur upload.wikimedia.org, comme
// le faisait le lot `wikimedia_test_2026` :
//   • depuis le Cameroun, un aller-retour vers les serveurs Wikimedia à
//     chaque question rallonge sensiblement le chargement — sur un quiz
//     chronométré à 8 secondes, c'est du temps de réponse volé au joueur ;
//   • Wikimedia décourage explicitement le hotlink en production ;
//   • un fichier renommé ou supprimé sur Commons casse la question en pleine
//     partie, sans prévenir ;
//   • les licences libres imposent l'attribution : on la stocke ici plutôt
//     que de l'oublier.
//
// Les images atterrissent dans le `public/` du front, servi par le même
// serveur statique que la SPA (§frontend/server.js) — donc aucune
// infrastructure supplémentaire.

import { execFile } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, "../../../frontend/public/questions");
const CREDITS = path.join(HERE, "image-credits.json");

// Wikimedia impose un User-Agent identifiant pour l'accès automatisé.
const UA = "QuizArena/1.0 (banque de questions éducative; contact via obuy360@gmail.com)";
const API = "https://commons.wikimedia.org/w/api.php";

/**
 * Cherche un fichier sur Commons à partir d'un mot-clé.
 *
 * Deviner un nom de fichier exact ("Tour Eiffel Wikimedia Commons.jpg") est
 * fragile : sur le premier lot, 2 entrées sur 20 pointaient dans le vide. On
 * interroge donc l'index de recherche, restreint aux bitmaps, et on retient
 * le premier résultat — Commons classe par pertinence et les photos de tête
 * d'un sujet notable sont presque toujours des vues représentatives.
 *
 * Les SVG sont exclus : ImageMagick les rastérise mal sans libsrvg complet,
 * et les drapeaux (le cas SVG typique) sont demandés nommément par `file`.
 */
async function commonsSearch(query) {
  // Deux passes : une requête longue et précise donne le meilleur résultat
  // quand elle aboutit, mais l'index Commons rend souvent zéro dès qu'on
  // enchaîne trop de termes. On retombe alors sur les trois premiers mots,
  // qui portent l'essentiel du sujet.
  const attempts = [
    "filetype:bitmap " + query,
    query,
    query.split(/\s+/).slice(0, 3).join(" "),
  ];
  for (const srsearch of attempts) {
    const url = `${API}?action=query&list=search&srsearch=${encodeURIComponent(srsearch)}` +
      `&srnamespace=6&srlimit=5&format=json&origin=*`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) continue;
    const data = await res.json();
    const hits = (data?.query?.search ?? []).filter((h) => !/\.(svg|ogg|ogv|webm|pdf|tif)$/i.test(h.title));
    if (hits.length) return hits[0].title.replace(/^File:/, "");
  }
  throw new Error(`aucun résultat pour « ${query} »`);
}

/**
 * Interroge l'API Commons : URL du fichier, licence et auteur.
 * On demande une vignette de 800 px — inutile de rapatrier un original de
 * 20 Mo pour l'afficher dans une carte de quiz.
 */
async function commonsInfo(fileName) {
  const url = `${API}?action=query&titles=${encodeURIComponent("File:" + fileName)}` +
    `&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`API Commons ${res.status} pour ${fileName}`);
  const data = await res.json();
  const pages = data?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) throw new Error(`fichier introuvable sur Commons : ${fileName}`);
  const info = page.imageinfo?.[0];
  if (!info) throw new Error(`pas d'imageinfo pour ${fileName}`);
  const meta = info.extmetadata ?? {};
  const strip = (html) => String(html ?? "").replace(/<[^>]*>/g, "").trim();
  return {
    url: info.thumburl || info.url,
    descriptionUrl: info.descriptionurl,
    license: strip(meta.LicenseShortName?.value) || "licence non précisée",
    artist: strip(meta.Artist?.value) || "auteur non précisé",
  };
}

/** Télécharge, recadre en 4:3 et encode en WebP (qualité 82, ~40-80 Ko). */
async function toWebp(srcUrl, destPath) {
  const res = await fetch(srcUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`téléchargement ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = destPath + ".tmp";
  await writeFile(tmp, buf);
  // -strip retire les métadonnées EXIF (poids inutile, parfois données GPS).
  await run("magick", [tmp, "-strip", "-resize", "800x600^", "-gravity", "center",
                       "-extent", "800x600", "-quality", "82", destPath]);
  await run("rm", ["-f", tmp]);
}

/**
 * @param {Array<{slug:string, file:string}>} wanted
 */
export async function fetchAll(wanted) {
  await mkdir(OUT_DIR, { recursive: true });
  let credits = {};
  if (existsSync(CREDITS)) credits = JSON.parse(await readFile(CREDITS, "utf8"));

  let done = 0, skipped = 0, failed = 0;
  for (const { slug, file, search } of wanted) {
    const dest = path.join(OUT_DIR, `${slug}.webp`);
    if (existsSync(dest)) { skipped++; continue; }
    try {
      const resolved = file ?? (await commonsSearch(search));
      const info = await commonsInfo(resolved);
      await toWebp(info.url, dest);
      credits[slug] = { file: resolved, license: info.license, artist: info.artist, source: info.descriptionUrl };
      done++;
      console.log(`  ok   ${slug}  (${info.license})`);
      // Politesse envers l'API Commons : pas de rafale.
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      failed++;
      console.log(`  ÉCHEC ${slug} — ${e.message}`);
    }
  }
  await writeFile(CREDITS, JSON.stringify(credits, null, 1));
  console.log(`\n${done} téléchargées, ${skipped} déjà présentes, ${failed} en échec.`);
  console.log(`Images  : ${OUT_DIR}`);
  console.log(`Crédits : ${CREDITS}`);
  return credits;
}

// Exécution directe : lit la liste depuis images.manifest.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const { default: manifest } = await import("./images.manifest.mjs");
  console.log(`${manifest.length} images demandées.\n`);
  await fetchAll(manifest);
}
