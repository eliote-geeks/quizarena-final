// Extracts a short, typable "key" from a full answer string.
// Strips accents/punctuation, picks the most distinctive word (longest non-stopword).
// Pure digits stay as-is.

const STOPWORDS = new Set([
  "LE", "LA", "LES", "UN", "UNE", "DES", "DE", "DU", "ET", "EN",
  "THE", "AND", "OF", "AUX", "AU", "AND",
]);

export function extractKey(s) {
  if (!s) return "";
  const raw = String(s).trim();
  const norm = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  // Pure number? return as a digit string
  if (/^\d+$/.test(norm)) return norm;
  // Mixed (e.g. "1.2M"): keep digits only if mostly digits
  const digits = norm.replace(/[^0-9]/g, "");
  if (digits.length >= 2 && digits.length >= norm.replace(/\s/g, "").length / 2) {
    return digits;
  }
  const words = norm.split(/\s+/).filter((w) => w.length >= 2);
  const meaningful = words.filter((w) => !STOPWORDS.has(w));
  const pool = meaningful.length ? meaningful : words;
  // Prefer longest word (most distinctive)
  let best = pool[0] || "";
  for (const w of pool) if (w.length > best.length) best = w;
  // Trim very long answers to first 12 chars
  return best.slice(0, 12);
}
