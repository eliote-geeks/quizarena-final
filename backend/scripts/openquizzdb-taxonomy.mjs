/**
 * Taxonomie des archives OpenQuizzDB qui ne sont plus toutes présentes dans
 * le catalogue courant. Le classement se fait au niveau du quiz éditorial
 * (30 à 50 questions cohérentes), jamais à partir d'un mot isolé dans une
 * question. Les identifiants non listés restent volontairement en culture.
 */

const IDS = {
  gastronomie: [6,9,11,17,19,28,53,67,80,96,99,134,158,181,207,209,260],
  nature: [10,12,48,49,50,58,65,101,145,173,175,184,199,203,224,237,263],
  cinema: [2,3,4,5,13,15,16,18,21,31,34,36,41,43,46,47,51,52,55,57,59,63,81,88,89,90,92,147,163,189,214,241,243,250,256,257,267,273,439],
  geographie: [14,22,24,30,54,61,66,68,82,86,91,94,100,104,105,107,109,112,115,117,121,130,133,135,156,174,183,186,193,208,221,231,240,246,247,251,255],
  sport: [23,26,44,60,72,73,84,108,138,143,144,150,153,157,176,179,185,191,192,211,212,229,245,262,264,268,272,383,413],
  musique: [38,39,56,62,85,95,103,136,159,182,194,197,236,238,269],
  histoire: [8,70,98,120,127,133,142,160,180,183,188,294,405],
  sciences: [71,97,118,119,123,126,151,164,195,199,206,393,541],
  technologie: [20,32,35,37,45,123,125,132,151,157,196,204,223,232,234,239,261,365,403],
  litterature: [87,128,139,140,219,233,457,550,555],
  anime: [102,114,124,177,201],
  celebrites: [7,25,27,29,42,64,74,76,78,83,131,137,141,146,148,149,152,167,169,170,171,178,198,210,213,215,217,218,220,222,225,226,227,229,230,238,242,248,252,253,258,265,270,271,382,429,434,441,452,463,543],
};

export const OPENQUIZZDB_EXCLUDED_IDS = new Set([75, 106, 110, 162, 235]);

const CATEGORY_BY_ID = new Map();
for (const [category, ids] of Object.entries(IDS)) {
  for (const id of ids) {
    // Les catégories les plus spécifiques déclarées plus bas gagnent. Cela
    // permet par exemple à Pokémon d'être Anime plutôt que Cinéma.
    CATEGORY_BY_ID.set(id, category);
  }
}

export function legacyCategory(id, title = "") {
  if (OPENQUIZZDB_EXCLUDED_IDS.has(Number(id))) return "__skip";
  const mapped = CATEGORY_BY_ID.get(Number(id));
  if (mapped) return mapped;
  const folded = String(title).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (/AFRIQUE|CAMEROUN|CONGO|SENEGAL|NIGERIA|GHANA|KENYA|MAROC|ALGERIE|TUNISIE|MALI|IVOIRE/.test(folded)) return "afrique";
  return "culture";
}
