const STOPWORDS = new Set([
  "le","la","les","de","du","des","un","une","et","est","en","que","qui",
  "dans","sur","par","pour","avec","ce","il","elle","on","se","sa","son",
  "ses","au","aux","quel","quelle","quels","quelles","comment","quand",
  "dont","ou","mais","car","ni","après","avant","entre","lors","plus",
  "très","bien","tout","tous","toute","toutes","cette","cet","ces","mon",
  "ton","leur","nos","vos","premier","première","deux","trois","quatre",
  "cinq","six","sept","huit","neuf","dix","pays","ville","année","siècle",
  "monde","grand","grande","petit","petite","même","autre","chaque",
  "appelle","connue","connu","titre","était","furent","fut","sont",
  "sera","seront","which","what","when","where","who","how","did","does",
  "was","were","the","and","for","with","from","that","this","have",
  "been","they","also","are","not","its","his","her","their","name",
  "called","known","which","first","last","only","most","many",
]);

// One evocative word per category — cycles deterministically based on question text length
const CAT_ATMOSPHERE = {
  histoire:   ["CHRONOLOGIE", "ARCHIVES", "ÉPOQUE", "MÉMOIRE", "CONQUÊTE"],
  sciences:   ["LABORATOIRE", "FORMULE", "DÉCOUVERTE", "THÉORÈME", "PARTICULE"],
  geographie: ["TERRITOIRE", "FRONTIÈRE", "ATLAS", "LATITUDE", "COORDONNÉES"],
  sport:      ["PERFORMANCE", "CHAMPIONNAT", "RECORD", "COMPÉTITION", "VICTOIRE"],
  cinema:     ["RÉALISATION", "PALMARÈS", "CASTING", "SCÉNARIO", "CAMÉRA"],
  musique:    ["MÉLODIE", "RYTHME", "INTERPRÈTE", "PARTITION", "SCÈNE"],
};

/**
 * Extract 2–3 contextual tags from a question.
 * @param {object} question  — question object with .q.fr / .q.en
 * @param {string} categoryId — category id (e.g. "histoire")
 * @param {string} lang       — "fr" | "en"
 */
export function extractContext(question, categoryId, lang = "fr") {
  const text = question?.q?.[lang] || question?.q?.fr || "";
  const tags = [];

  // 1. Category atmosphere word (deterministic, varies per question)
  const atmos = CAT_ATMOSPHERE[categoryId];
  if (atmos) tags.push(atmos[text.length % atmos.length]);

  // 2. Years (1000–2099)
  const years = text.match(/\b(1[0-9]{3}|2[0-9]{3})\b/g);
  if (years?.length) tags.push(years[0]);

  // 3. Roman century notation (XIXe, XXe, etc.)
  const century = text.match(/\b(XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|XX|XXI)e?\s*s/i);
  if (century) tags.push(century[1].toUpperCase() + "ᵉ SIÈCLE");

  // 4. Proper nouns: capitalized word (not first word of sentence, len ≥ 4, not stopword)
  const sentences = text.split(/(?<=[.!?])\s+/);
  const properNouns = [];
  sentences.forEach(sentence => {
    const words = sentence.trim().split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const clean = words[i].replace(/[^a-zA-ZÀ-ÿ-]/g, "");
      if (
        clean.length >= 4 &&
        /^[A-ZÀÂÉÈÊÎÔÙÛŒÆ]/.test(clean) &&
        !STOPWORDS.has(clean.toLowerCase())
      ) {
        properNouns.push(clean.toUpperCase());
      }
    }
  });

  // Deduplicate and add up to 2 proper nouns not already in tags
  const filtered = [...new Set(properNouns)].filter(n => !tags.includes(n));
  tags.push(...filtered.slice(0, 2 - (years?.length ? 1 : 0)));

  return [...new Set(tags)].slice(0, 3);
}
