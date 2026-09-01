// Validation des numéros mobiles camerounais pour les opérations Mobile
// Money — retour Paul du 31/08 : "ça ne valide même pas tous les champs
// ni ne vérifie pas si tout est okay". Un numéro mal formé ou associé au
// mauvais opérateur envoie une vraie demande de paiement dans le vide.
//
// Préfixe → opérateur donné à titre indicatif (les blocs évoluent avec le
// temps) : sert à avertir avant l'envoi, jamais à bloquer un format par
// ailleurs valide sans donner à l'utilisateur un moyen clair de corriger.
const MTN_PREFIXES = ["67", "650", "651", "652", "653", "654", "680", "681", "682", "683", "684"];
const ORANGE_PREFIXES = ["69", "655", "656", "657", "658", "659", "685", "686", "687", "688", "689"];

export function normalizeCmPhone(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length > 9) return digits.slice(digits.length - 9);
  return digits;
}

export function validateCmPhone(raw) {
  const digits = normalizeCmPhone(raw);
  if (!digits) return { valid: false, error: "Le numéro de téléphone est requis." };
  if (digits.length !== 9 || !digits.startsWith("6")) {
    return { valid: false, error: "Numéro invalide — 9 chiffres commençant par 6 (ex. 690 12 34 56)." };
  }
  return { valid: true, digits };
}

function matchesPrefixList(digits, prefixes) {
  return prefixes.some((p) => digits.startsWith(p));
}

/** MTN_MOMO_CM, ORANGE_MONEY_CM, ou null si le préfixe n'est reconnu pour aucun des deux. */
export function detectCmOperator(digits) {
  if (matchesPrefixList(digits, MTN_PREFIXES)) return "MTN_MOMO_CM";
  if (matchesPrefixList(digits, ORANGE_PREFIXES)) return "ORANGE_MONEY_CM";
  return null;
}
