// Sciences et technologie.
//
// L'actualité tech est le domaine le plus piégeux de toute la banque : les
// versions de modèles, les valorisations et les « records » changent tous les
// mois, et beaucoup de sites d'agrégation racontent n'importe quoi. Règle
// appliquée ici : on ne retient que le largement attesté et on le date dans
// l'énoncé. Les détails de nommage de versions trouvés sur des sites
// secondaires ont été volontairement écartés.

const W = (page) => `https://fr.wikipedia.org/wiki/${page}`;

export default [
  // ── Sciences — intemporel ──────────────────────────────────────────
  { categoryId: "sciences", subcategory: "physique", textFr: "Quelle est la vitesse de la lumière dans le vide, en chiffres ronds ?", options: ["300 000 km/s", "150 000 km/s", "30 000 km/s", "3 000 km/s"], answerIndex: 0, sourceUrl: W("Vitesse_de_la_lumi%C3%A8re") },
  { categoryId: "sciences", subcategory: "physique", textFr: "Quel savant a formulé la théorie de la relativité générale ?", options: ["Albert Einstein", "Isaac Newton", "Niels Bohr", "Max Planck"], answerIndex: 0, sourceUrl: W("Albert_Einstein") },
  { categoryId: "sciences", subcategory: "physique", textFr: "Quelle unité mesure la puissance électrique ?", options: ["Le watt", "Le volt", "L'ampère", "L'ohm"], answerIndex: 0, sourceUrl: W("Watt") },
  { categoryId: "sciences", subcategory: "physique", textFr: "Quelle force maintient les planètes en orbite autour du Soleil ?", options: ["La gravitation", "Le magnétisme", "La force nucléaire forte", "L'électrostatique"], answerIndex: 0, sourceUrl: W("Gravitation") },
  { categoryId: "sciences", subcategory: "chimie", textFr: "Quel est le symbole chimique de l'or ?", options: ["Au", "Ag", "Fe", "Or"], answerIndex: 0, sourceUrl: W("Or") },
  { categoryId: "sciences", subcategory: "chimie", textFr: "Combien d'atomes d'hydrogène compte une molécule d'eau ?", options: ["Deux", "Un seul", "Trois", "Quatre"], answerIndex: 0, sourceUrl: W("Eau") },
  { categoryId: "sciences", subcategory: "chimie", textFr: "Quel gaz représente environ 78 % de l'air que nous respirons ?", options: ["L'azote", "L'oxygène", "Le dioxyde de carbone", "L'hydrogène"], answerIndex: 0, sourceUrl: W("Atmosph%C3%A8re_terrestre") },
  { categoryId: "sciences", subcategory: "chimie", textFr: "Quel savant russe a établi la classification périodique des éléments ?", options: ["Dmitri Mendeleïev", "Antoine Lavoisier", "Marie Curie", "Linus Pauling"], answerIndex: 0, sourceUrl: W("Dmitri_Mendele%C3%AFev") },
  { categoryId: "sciences", subcategory: "biologie", textFr: "Quelle molécule porte l'information génétique de la plupart des êtres vivants ?", options: ["L'ADN", "Le glucose", "L'hémoglobine", "Le collagène"], answerIndex: 0, sourceUrl: W("Acide_d%C3%A9soxyribonucl%C3%A9ique") },
  { categoryId: "sciences", subcategory: "biologie", textFr: "Quel organe humain filtre le sang et produit l'urine ?", options: ["Le rein", "Le foie", "La rate", "Le pancréas"], answerIndex: 0, sourceUrl: W("Rein") },
  { categoryId: "sciences", subcategory: "biologie", textFr: "Combien de chromosomes compte une cellule humaine normale ?", options: ["Quarante-six", "Vingt-trois", "Quarante-huit", "Soixante-quatre"], answerIndex: 0, sourceUrl: W("Chromosome") },
  { categoryId: "sciences", subcategory: "biologie", textFr: "Quel naturaliste a proposé la théorie de l'évolution par sélection naturelle ?", options: ["Charles Darwin", "Jean-Baptiste Lamarck", "Gregor Mendel", "Louis Pasteur"], answerIndex: 0, sourceUrl: W("Charles_Darwin") },
  { categoryId: "sciences", subcategory: "biologie", textFr: "Quel savant français a mis au point le vaccin contre la rage ?", options: ["Louis Pasteur", "Claude Bernard", "Alexander Fleming", "Robert Koch"], answerIndex: 0, sourceUrl: W("Louis_Pasteur") },
  { categoryId: "sciences", subcategory: "astronomie", textFr: "Quelle planète du système solaire est la plus proche du Soleil ?", options: ["Mercure", "Vénus", "Mars", "La Terre"], answerIndex: 0, sourceUrl: W("Mercure_(plan%C3%A8te)") },
  { categoryId: "sciences", subcategory: "astronomie", textFr: "Quelle planète du système solaire possède la masse la plus élevée ?", options: ["Jupiter", "Saturne", "Neptune", "Uranus"], answerIndex: 0, sourceUrl: W("Jupiter_(plan%C3%A8te)") },
  { categoryId: "sciences", subcategory: "astronomie", textFr: "Quel astronaute a marché le premier sur la Lune en juillet 1969 ?", options: ["Neil Armstrong", "Buzz Aldrin", "Michael Collins", "Youri Gagarine"], answerIndex: 0, sourceUrl: W("Neil_Armstrong") },
  { categoryId: "sciences", subcategory: "astronomie", textFr: "Quel cosmonaute soviétique fut le premier être humain dans l'espace, en 1961 ?", options: ["Youri Gagarine", "Alexeï Leonov", "Guerman Titov", "Valentina Terechkova"], answerIndex: 0, sourceUrl: W("Youri_Gagarine") },
  { categoryId: "sciences", subcategory: "astronomie", textFr: "Quelle galaxie abrite notre système solaire ?", options: ["La Voie lactée", "Andromède", "Le Triangle", "Le Grand Nuage de Magellan"], answerIndex: 0, sourceUrl: W("Voie_lact%C3%A9e") },
  { categoryId: "sciences", subcategory: "astronomie", textFr: "Quelle est la planète surnommée « la planète rouge » ?", options: ["Mars", "Vénus", "Jupiter", "Mercure"], answerIndex: 0, sourceUrl: W("Mars_(plan%C3%A8te)") },
  { categoryId: "sciences", subcategory: "mathématiques", textFr: "Quel théorème relie les côtés d'un triangle rectangle ?", options: ["Le théorème de Pythagore", "Le théorème de Thalès", "Le théorème d'Euclide", "Le théorème de Fermat"], answerIndex: 0, sourceUrl: W("Th%C3%A9or%C3%A8me_de_Pythagore") },
  { categoryId: "sciences", subcategory: "mathématiques", textFr: "Quelle constante mathématique vaut environ 3,14159 ?", options: ["Pi", "Le nombre d'or", "Le nombre e", "La constante d'Euler"], answerIndex: 0, sourceUrl: W("Pi") },

  // ── Sciences — actualité datée ─────────────────────────────────────
  { categoryId: "sciences", subcategory: "nobel", textFr: "Quels matériaux poreux ont valu le prix Nobel de chimie 2025 à leurs concepteurs ?", options: ["Les réseaux métallo-organiques", "Les nanotubes de carbone multiparois", "Les supraconducteurs à haute température", "Les cristaux liquides nématiques"], answerIndex: 0, isActualite: true, sourceUrl: "https://www.nobelprize.org/all-nobel-prizes-2025/" },
  { categoryId: "sciences", subcategory: "nobel", textFr: "En quelle année le Nobel de physique a-t-il récompensé l'effet tunnel quantique dans un circuit électrique ?", options: ["En 2025", "En 2015", "En 2020", "En 2010"], answerIndex: 0, isActualite: true, sourceUrl: "https://www.nobelprize.org/all-nobel-prizes-2025/" },

  // ── Technologie — intemporel ───────────────────────────────────────
  { categoryId: "technologie", subcategory: "informatique", textFr: "Que signifie le sigle « HTML » en développement web ?", options: ["HyperText Markup Language", "High Transfer Machine Language", "Home Tool Markup Logic", "Hybrid Text Media Layer"], answerIndex: 0, sourceUrl: W("Hypertext_Markup_Language") },
  { categoryId: "technologie", subcategory: "informatique", textFr: "Quelle unité correspond à mille kilo-octets, en chiffres ronds ?", options: ["Le mégaoctet", "Le gigaoctet", "Le téraoctet", "Le pétaoctet"], answerIndex: 0, sourceUrl: W("Octet") },
  { categoryId: "technologie", subcategory: "informatique", textFr: "Quel système d'exploitation mobile est développé par Google ?", options: ["Android", "iOS", "Windows Phone", "BlackBerry OS"], answerIndex: 0, sourceUrl: W("Android") },
  { categoryId: "technologie", subcategory: "informatique", textFr: "Quel langage de programmation a été créé par Guido van Rossum ?", options: ["Python", "Java", "Ruby", "PHP"], answerIndex: 0, sourceUrl: W("Python_(langage)") },
  { categoryId: "technologie", subcategory: "informatique", textFr: "Que désigne l'adresse IP dans un réseau informatique ?", options: ["L'identifiant d'une machine", "La vitesse de connexion", "Le nom du fournisseur", "La quantité de mémoire"], answerIndex: 0, sourceUrl: W("Adresse_IP") },
  { categoryId: "technologie", subcategory: "informatique", textFr: "Quel noyau libre a été créé par Linus Torvalds en 1991 ?", options: ["Linux", "Unix", "MS-DOS", "Solaris"], answerIndex: 0, sourceUrl: W("Noyau_Linux") },
  { categoryId: "technologie", subcategory: "internet", textFr: "Qui a inventé le World Wide Web au CERN en 1989 ?", options: ["Tim Berners-Lee", "Vinton Cerf", "Bill Gates", "Steve Wozniak"], answerIndex: 0, sourceUrl: W("Tim_Berners-Lee") },
  { categoryId: "technologie", subcategory: "internet", textFr: "Que protège le protocole HTTPS par rapport au HTTP simple ?", options: ["La confidentialité des échanges", "La vitesse d'affichage", "Le référencement du site", "La taille des images"], answerIndex: 0, sourceUrl: W("HTTPS") },
  { categoryId: "technologie", subcategory: "mobile", textFr: "Quelle technologie sans fil de courte portée relie une oreillette à un téléphone ?", options: ["Le Bluetooth", "Le Wi-Fi", "La 5G", "Le NFC"], answerIndex: 0, sourceUrl: W("Bluetooth") },
  { categoryId: "technologie", subcategory: "mobile", textFr: "Quel service de paiement mobile est opéré par MTN en Afrique ?", options: ["MTN MoMo", "Orange Money", "Wave", "M-Pesa"], answerIndex: 0, sourceUrl: W("Mobile_Money") },
  { categoryId: "technologie", subcategory: "mobile", textFr: "Quel opérateur propose le service Orange Money au Cameroun ?", options: ["Orange", "MTN", "Camtel", "Nexttel"], answerIndex: 0, sourceUrl: W("Orange_Money") },
  { categoryId: "technologie", subcategory: "mobile", textFr: "Quel service kényan a popularisé le paiement mobile en Afrique dès 2007 ?", options: ["M-Pesa", "MTN MoMo", "Orange Money", "Airtel Money"], answerIndex: 0, sourceUrl: W("M-Pesa") },
  { categoryId: "technologie", subcategory: "entreprises", textFr: "Qui a cofondé Apple avec Steve Wozniak en 1976 ?", options: ["Steve Jobs", "Bill Gates", "Larry Page", "Jeff Bezos"], answerIndex: 0, sourceUrl: W("Steve_Jobs") },
  { categoryId: "technologie", subcategory: "entreprises", textFr: "Quelle entreprise a créé le moteur de recherche Google ?", options: ["Alphabet", "Microsoft", "Meta", "Amazon"], answerIndex: 0, sourceUrl: W("Alphabet_(entreprise)") },
  { categoryId: "technologie", subcategory: "entreprises", textFr: "Quel réseau social a été fondé par Mark Zuckerberg en 2004 ?", options: ["Facebook", "Twitter", "Instagram", "LinkedIn"], answerIndex: 0, sourceUrl: W("Facebook") },

  // ── Technologie — actualité datée ──────────────────────────────────
  { categoryId: "technologie", subcategory: "ia", textFr: "Quelle entreprise a lancé le modèle GPT-5 en août 2025 ?", options: ["OpenAI", "Google DeepMind", "Meta AI", "Mistral AI"], answerIndex: 0, isActualite: true, sourceUrl: "https://www.euronews.com/next/2026/01/01/from-ai-slop-to-world-models-bubbles-and-small-models-what-to-expect-from-ai-in-2026" },
  { categoryId: "technologie", subcategory: "ia", textFr: "Quelle famille de modèles Google a-t-elle opposée à OpenAI fin 2025 ?", options: ["Gemini", "Llama", "Mistral", "Falcon"], answerIndex: 0, isActualite: true, sourceUrl: "https://www.jedha.co/formation-ia/meilleures-ia-google" },
  { categoryId: "technologie", subcategory: "ia", textFr: "En 2026, quelle tendance de l'IA open source a marqué le secteur ?", options: ["Les modèles libres rivalisent avec les propriétaires", "L'abandon total du logiciel libre", "La disparition des modèles de langue", "Le retour aux systèmes experts"], answerIndex: 0, isActualite: true, sourceUrl: "https://digitiz.fr/ia-open-source/" },
];
