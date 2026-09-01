// Actualité 2025-2026 — TOUJOURS datée dans l'énoncé.
//
// C'est la règle qui rend ce lot permanent au lieu de périssable : « En 2026,
// qui a remporté X ? » reste vrai pour toujours, là où « Qui détient
// actuellement X ? » devient faux au prochain vainqueur. `expiresAt` n'est
// donc renseigné que pour le résiduel réellement instable.
//
// Deux règles éditoriales appliquées ici, apprises en recherchant :
//  1. Aucun fait CONTESTÉ. La CAN 2025 (Sénégal vainqueur sur le terrain,
//     Maroc sur tapis vert le 17/03/2026, TAS saisi, aucun vainqueur déclaré
//     par la CAF) est écartée : il n'existe pas de réponse défendable.
//  2. Aucune question politique à réponse disputée — sur un jeu d'argent réel
//     au Cameroun, ça n'a aucune valeur ludique et beaucoup de risque.

export default [
  // ── Sport ──────────────────────────────────────────────────────────
  {
    categoryId: "sport",
    textFr: "Quel club a remporté la finale de la Ligue des champions 2025-2026 ?",
    options: ["Paris Saint-Germain", "Atlético de Madrid", "Borussia Dortmund", "Manchester City"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "football",
    sourceUrl: "https://fr.wikipedia.org/wiki/Finale_de_la_Ligue_des_champions_de_l'UEFA_2025-2026",
  },
  {
    categoryId: "sport",
    textFr: "Dans quelle ville s'est jouée la finale de la Ligue des champions 2026 ?",
    options: ["Budapest", "Manchester", "Istanbul", "Lisbonne"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "football",
    sourceUrl: "https://fr.wikipedia.org/wiki/Finale_de_la_Ligue_des_champions_de_l'UEFA_2025-2026",
  },
  {
    categoryId: "sport",
    textFr: "Quel joueur a remporté le Ballon d'Or 2025 ?",
    options: ["Ousmane Dembélé", "Robert Lewandowski", "Erling Haaland", "Kylian Mbappé"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "football",
    sourceUrl: "https://fr.allafrica.com/stories/202509230434.html",
  },
  {
    categoryId: "sport",
    textFr: "De quel club Ousmane Dembélé était-il le joueur lors de son Ballon d'Or 2025 ?",
    options: ["Paris Saint-Germain", "Borussia Dortmund", "Atlético de Madrid", "FC Barcelone"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "football",
    sourceUrl: "https://fr.allafrica.com/stories/202509230434.html",
  },
  {
    categoryId: "sport",
    textFr: "Quel pays a accueilli la Coupe d'Afrique des Nations disputée fin 2025 et début 2026 ?",
    options: ["Le Maroc", "La Côte d'Ivoire", "Le Cameroun", "L'Égypte"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "football",
    sourceUrl: "https://fr.wikipedia.org/wiki/Coupe_d'Afrique_des_nations_de_football_2025",
  },

  // ── Cinéma ─────────────────────────────────────────────────────────
  {
    categoryId: "cinema",
    textFr: "Quel film a remporté l'Oscar du meilleur film en 2026 ?",
    options: ["Une bataille après l'autre", "Everything Everywhere All at Once", "Dune : Deuxième partie", "Oppenheimer"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "récompenses",
    sourceUrl: "https://fr.wikipedia.org/wiki/98e_c%C3%A9r%C3%A9monie_des_Oscars",
  },
  {
    categoryId: "cinema",
    textFr: "Qui a reçu l'Oscar de la meilleure réalisation en 2026 pour « Une bataille après l'autre » ?",
    options: ["Paul Thomas Anderson", "Alejandro González Iñárritu", "Christopher Nolan", "Denis Villeneuve"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "récompenses",
    sourceUrl: "https://fr.wikipedia.org/wiki/98e_c%C3%A9r%C3%A9monie_des_Oscars",
  },
  {
    categoryId: "cinema",
    textFr: "Combien d'Oscars « Une bataille après l'autre » a-t-il remportés lors de la cérémonie 2026 ?",
    options: ["Six", "Trois", "Neuf", "Un seul"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "récompenses",
    sourceUrl: "https://leclaireur.fnac.com/article/cp70324-palmares-des-oscars-2026-qui-sont-les-grands-vainqueurs/",
  },
  {
    categoryId: "cinema",
    textFr: "Quel numéro portait la cérémonie des Oscars organisée en mars 2026 ?",
    options: ["La 98e", "La 90e", "La 100e", "La 85e"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "récompenses",
    sourceUrl: "https://fr.wikipedia.org/wiki/98e_c%C3%A9r%C3%A9monie_des_Oscars",
  },

  // ── Anime & Manga ──────────────────────────────────────────────────
  {
    categoryId: "anime",
    textFr: "Quelle série a été sacrée anime de l'année aux Crunchyroll Anime Awards 2026 ?",
    options: ["My Hero Academia", "L'Attaque des Titans", "Jujutsu Kaisen", "Chainsaw Man"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "récompenses",
    sourceUrl: "https://www.tvguide.com/news/the-2026-crunchyroll-anime-awards-complete-winners-list-my-hero-academia-final-season-wins-anime-of-the-year/",
  },
  {
    categoryId: "anime",
    textFr: "Quel film a été élu meilleur film aux Crunchyroll Anime Awards 2026 ?",
    options: [
      "Demon Slayer : Le Château de l'Infini",
      "Suzume",
      "Le Garçon et le Héron",
      "Jujutsu Kaisen 0",
    ],
    answerIndex: 0,
    isActualite: true,
    subcategory: "récompenses",
    sourceUrl: "https://www.hollywoodreporter.com/movies/movie-news/crunchyroll-anime-awards-2026-full-winners-list-1236605415/",
  },
  {
    categoryId: "anime",
    textFr: "Quelle série a remporté le prix de la meilleure nouvelle série aux Anime Awards 2026 ?",
    options: ["Gachiakuta", "Sakamoto Days", "Solo Leveling", "Dandadan"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "récompenses",
    sourceUrl: "https://www.hollywoodreporter.com/movies/movie-news/crunchyroll-anime-awards-2026-full-winners-list-1236605415/",
  },
  {
    categoryId: "anime",
    textFr: "Quelle héroïne a reçu le prix du meilleur personnage principal aux Anime Awards 2026 ?",
    options: ["Maomao", "Anya Forger", "Nezuko Kamado", "Frieren"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "personnages",
    sourceUrl: "https://www.hollywoodreporter.com/movies/movie-news/crunchyroll-anime-awards-2026-full-winners-list-1236605415/",
  },
  {
    categoryId: "anime",
    textFr: "Dans quelle série Maomao, primée en 2026, enquête-t-elle au palais impérial ?",
    options: [
      "Les Carnets de l'apothicaire",
      "Vinland Saga",
      "L'Attaque des Titans",
      "Mushoku Tensei",
    ],
    answerIndex: 0,
    isActualite: true,
    subcategory: "personnages",
    sourceUrl: "https://www.hollywoodreporter.com/movies/movie-news/crunchyroll-anime-awards-2026-full-winners-list-1236605415/",
  },
  {
    categoryId: "anime",
    textFr: "Quelle série a raflé les prix de la meilleure action et de la meilleure animation en 2026 ?",
    options: ["Solo Leveling", "One Punch Man", "Fire Force", "Bleach"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "récompenses",
    sourceUrl: "https://www.hollywoodreporter.com/movies/movie-news/crunchyroll-anime-awards-2026-full-winners-list-1236605415/",
  },

  // ── Sciences ───────────────────────────────────────────────────────
  {
    categoryId: "sciences",
    textFr: "Le prix Nobel de chimie 2025 a récompensé le développement de quel type de matériaux ?",
    options: [
      "Les réseaux métallo-organiques",
      "Les supraconducteurs à haute température",
      "Les nanotubes de carbone",
      "Les cristaux liquides",
    ],
    answerIndex: 0,
    isActualite: true,
    subcategory: "nobel",
    sourceUrl: "https://www.nobelprize.org/all-nobel-prizes-2025/",
  },
  {
    categoryId: "sciences",
    textFr: "Quel phénomène quantique a valu le prix Nobel de physique 2025 à ses découvreurs ?",
    options: [
      "L'effet tunnel quantique macroscopique",
      "L'intrication de particules distantes",
      "La supraconductivité à température ambiante",
      "Le rayonnement de Hawking",
    ],
    answerIndex: 0,
    isActualite: true,
    subcategory: "nobel",
    sourceUrl: "https://www.nobelprize.org/all-nobel-prizes-2025/",
  },
  {
    categoryId: "sciences",
    textFr: "Le prix Nobel de médecine 2025 portait sur quel mécanisme du système immunitaire ?",
    options: [
      "La tolérance immunitaire périphérique",
      "La mémoire des lymphocytes B",
      "L'apoptose cellulaire programmée",
      "La réparation de l'ADN",
    ],
    answerIndex: 0,
    isActualite: true,
    subcategory: "nobel",
    sourceUrl: "https://www.nobelprize.org/all-nobel-prizes-2025/",
  },

  // ── Littérature ────────────────────────────────────────────────────
  {
    categoryId: "litterature",
    textFr: "Quel écrivain hongrois a reçu le prix Nobel de littérature en 2025 ?",
    options: ["László Krasznahorkai", "Krisztina Tóth-Bereményi", "Péter Nádas", "Imre Kertész"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "nobel",
    sourceUrl: "https://www.nobelprize.org/all-nobel-prizes-2025/",
  },

  // ── Société ────────────────────────────────────────────────────────
  {
    categoryId: "culture",
    textFr: "Quelle opposante vénézuélienne a reçu le prix Nobel de la paix en 2025 ?",
    options: ["María Corina Machado", "Leymah Gbowee-Roberts", "Malala Yousafzai", "Nadia Murad"],
    answerIndex: 0,
    isActualite: true,
    subcategory: "nobel",
    sourceUrl: "https://www.nobelprize.org/all-nobel-prizes-2025/",
  },
];
