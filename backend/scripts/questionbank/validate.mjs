// Porte de qualité de la banque de questions. AUCUNE question n'entre en
// base sans passer par ici.
//
// Raison d'être (30/08/2026) : le lot `wikimedia_test_2026` (500 questions)
// a été généré à l'envers — on partait d'une image Commons et on fabriquait
// l'énoncé depuis ses métadonnées. L'image ne déterminait donc jamais la
// réponse. Exemples réellement insérés en production :
//   • options ["Montagne","montagne","Saint-Clément","Châtillon"]
//     → deux options identiques à la casse près, question insoluble
//   • "Reconnais-tu l'élément illustré ?" → "robotique" contre "ordinateur"
//     et "ordinateur personnel", aucune réponse défendable
// Sur une plateforme à argent réel, une question ambiguë est une
// réclamation. Chaque règle ci-dessous correspond à un défaut constaté.

/** Normalise pour comparer deux options : casse, accents, espaces,
 *  ponctuation et articles initiaux ignorés — "Le Lesotho" et "lesotho"
 *  sont la même réponse pour un joueur. */
export function normalize(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // accents
    .toLowerCase()
    .replace(/^(le|la|les|l'|un|une|des|the)\s+/i, "") // article initial
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Formulations qui rendent une question indéfendable : elles appellent une
// opinion, ou un superlatif qui bouge avec le temps.
const VAGUE_PATTERNS = [
  // Cible la 2e personne uniquement : « À quel sujet associes-tu cette
  // illustration ? » demande un avis. « Quel plat associe riz et poisson ? »
  // est une définition parfaitement vérifiable — ne pas confondre les deux.
  { re: /\bassoci(es-tu|ez-vous)\b/i, why: "demande une association personnelle, pas un fait" },
  { re: /\bselon (toi|vous)\b/i,    why: "appelle une opinion, pas un fait" },
  { re: /\breconnais-tu\b/i,        why: "ne pose pas de question vérifiable" },
  { re: /\bbon intitul[ée]\b/i,     why: "porte sur une légende, pas sur un fait" },
  { re: /\bque penses-tu\b/i,       why: "appelle une opinion" },
];

// Marqueurs de présent : la question sera fausse dans six mois si elle n'est
// pas datée. On exige alors soit une date dans l'énoncé, soit un expiresAt.
const PRESENT_MARKERS = /\b(actuellement|aujourd'hui|en ce moment|à ce jour|désormais|record actuel)\b/i;
const HAS_DATE = /\b(1[0-9]{3}|20[0-9]{2})\b|\b(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/i;

const MAX_TEXT = 180;
const MIN_TEXT = 15;
const MAX_OPTION = 70;

/**
 * Valide une question seule. Renvoie un tableau d'erreurs (vide = conforme).
 * @param {object} q question au format d'insertion
 */
export function validateQuestion(q) {
  const errors = [];
  const text = String(q.textFr ?? "");

  if (!text) errors.push("textFr manquant");
  if (text && text.length < MIN_TEXT) errors.push(`énoncé trop court (${text.length} < ${MIN_TEXT})`);
  if (text.length > MAX_TEXT) errors.push(`énoncé trop long (${text.length} > ${MAX_TEXT})`);
  if (text && !text.includes("?")) errors.push("l'énoncé ne pose pas de question (pas de « ? »)");

  if (!q.categoryId) errors.push("categoryId manquant");

  // Traçabilité : sur de l'argent réel, toute réponse doit être opposable.
  if (!q.sourceUrl) errors.push("sourceUrl manquante (réponse non opposable en cas de contestation)");

  const opts = Array.isArray(q.options) ? q.options.map((o) => String(o ?? "")) : null;
  if (!opts || opts.length !== 4) {
    errors.push(`il faut exactement 4 options (reçu ${opts ? opts.length : "aucune"})`);
  } else {
    if (opts.some((o) => !o.trim())) errors.push("option vide");
    if (opts.some((o) => o.length > MAX_OPTION)) errors.push(`option trop longue (> ${MAX_OPTION})`);

    // LE bug du lot Wikimedia : deux options que le joueur ne peut pas départager.
    const seen = new Map();
    opts.forEach((o, i) => {
      const key = normalize(o);
      if (seen.has(key)) errors.push(`options ${seen.get(key) + 1} et ${i + 1} identiques une fois normalisées (« ${opts[seen.get(key)]} » / « ${o} »)`);
      else seen.set(key, i);
    });

    // Une option contenue dans une autre laisse deviner ou crée l'ambiguïté
    // (« ordinateur » vs « ordinateur personnel »).
    for (let i = 0; i < opts.length; i++) {
      for (let j = 0; j < opts.length; j++) {
        if (i === j) continue;
        const a = normalize(opts[i]);
        const b = normalize(opts[j]);
        if (a && b && a !== b && (b.startsWith(a + " ") || b.endsWith(" " + a))) {
          errors.push(`l'option « ${opts[i]} » est contenue dans « ${opts[j]} » : départage impossible`);
        }
      }
    }
  }

  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) {
    errors.push(`answerIndex hors bornes (${q.answerIndex})`);
  }

  for (const { re, why } of VAGUE_PATTERNS) {
    if (re.test(text)) errors.push(`énoncé non vérifiable — ${why}`);
  }

  // Question au présent sans date ni péremption : elle deviendra fausse.
  if (PRESENT_MARKERS.test(text) && !HAS_DATE.test(text) && !q.expiresAt) {
    errors.push("formulée au présent sans date dans l'énoncé ni expiresAt : deviendra fausse");
  }

  // Une question d'actualité doit être datée dans l'énoncé — c'est ce qui la
  // rend permanente au lieu de périssable.
  //
  // Exception : une question dont la RÉPONSE est la date ("En quelle année…")
  // ne peut évidemment pas porter cette date dans son énoncé, et elle est
  // permanente par construction — le Nobel 2025 aura toujours été décerné
  // en 2025. On accepte alors la date portée par les options.
  const asksForDate = /\bquelle ann[ée]e\b|\ben quelle ann[ée]e\b/i.test(text);
  const optionsCarryDate = Array.isArray(q.options) && q.options.some((o) => HAS_DATE.test(String(o)));
  if (q.isActualite && !HAS_DATE.test(text) && !(asksForDate && optionsCarryDate)) {
    errors.push("question d'actualité sans date dans l'énoncé");
  }

  if (q.mediaUrl && !q.mediaAlt) {
    errors.push("image sans mediaAlt (accessibilité)");
  }

  return errors;
}

/**
 * Valide un lot entier : règles individuelles + règles qui n'ont de sens
 * qu'à l'échelle du lot (doublons, biais de longueur).
 * @param {Array} batch questions candidates
 * @param {Array<string>} existingTexts énoncés déjà en base
 */
export function validateBatch(batch, existingTexts = []) {
  const report = { ok: [], rejected: [], warnings: [] };

  const existing = new Set(existingTexts.map(normalize));
  const seenInBatch = new Map();

  for (const q of batch) {
    const errors = validateQuestion(q);

    const key = normalize(q.textFr);
    if (existing.has(key)) errors.push("doublon d'une question déjà en base");
    if (seenInBatch.has(key)) errors.push(`doublon interne au lot (position ${seenInBatch.get(key) + 1})`);
    else seenInBatch.set(key, report.ok.length + report.rejected.length);

    if (errors.length) report.rejected.push({ question: q, errors });
    else report.ok.push(q);
  }

  // Biais de longueur : si la bonne réponse est trop souvent la plus longue,
  // un joueur peut gagner sans rien savoir. Seuil au hasard = 25 %.
  const withOpts = report.ok.filter((q) => Array.isArray(q.options) && q.options.length === 4);
  if (withOpts.length >= 20) {
    const longest = withOpts.filter((q) => {
      const lens = q.options.map((o) => String(o).length);
      return lens[q.answerIndex] === Math.max(...lens) && new Set(lens).size > 1;
    }).length;
    const ratio = longest / withOpts.length;
    if (ratio > 0.4) {
      report.warnings.push(
        `biais de longueur : la bonne réponse est la plus longue dans ${(ratio * 100).toFixed(0)} % des cas (attendu ~25 %) — rallonge des distracteurs`
      );
    }
  }

  // Répartition des bonnes réponses : un answerIndex trop concentré est
  // exploitable. (Le serveur permute à l'envoi, §shuffledOptions, mais on
  // garde la banque saine à la source.)
  if (report.ok.length >= 40) {
    const counts = [0, 0, 0, 0];
    report.ok.forEach((q) => counts[q.answerIndex]++);
    const max = Math.max(...counts) / report.ok.length;
    if (max > 0.45) report.warnings.push(`answerIndex déséquilibré : ${counts.join("/")} sur ${report.ok.length}`);
  }

  return report;
}
