// Questions illustrées.
//
// Le principe qui manquait au lot précédent : ici l'image EST la question.
// Le sujet est identifiable sans ambiguïté et les quatre distracteurs
// appartiennent à la même classe (un monument contre des monuments, un
// drapeau contre des drapeaux) — un joueur qui reconnaît l'image répond,
// un joueur qui ne la reconnaît pas doit deviner entre quatre candidats
// crédibles. Jamais l'inverse.
//
// Images auto-hébergées par scripts/questionbank/fetch-images.mjs ; les
// licences et auteurs sont dans image-credits.json.

const img = (slug) => `/questions/${slug}.webp`;
const W = (page) => `https://fr.wikipedia.org/wiki/${page}`;

export default [
  // ── Monuments ──────────────────────────────────────────────────────
  { categoryId: "geographie", subcategory: "monuments", textFr: "Quel monument est représenté sur cette image ?", options: ["La tour Eiffel", "La tour de Pise", "Big Ben", "L'Atomium"], answerIndex: 0, mediaUrl: img("tour-eiffel"), mediaAlt: "Tour métallique à quatre piliers incurvés", sourceUrl: W("Tour_Eiffel") },
  { categoryId: "histoire", subcategory: "monuments", textFr: "Quel amphithéâtre antique est visible sur cette photographie ?", options: ["Le Colisée", "Le théâtre d'Épidaure", "Les arènes de Nîmes", "Le cirque Maxime"], answerIndex: 0, mediaUrl: img("colisee"), mediaAlt: "Amphithéâtre romain elliptique en ruine", sourceUrl: W("Colis%C3%A9e") },
  { categoryId: "geographie", subcategory: "monuments", textFr: "Dans quel pays se trouve le monument photographié ici ?", options: ["En Inde", "En Iran", "En Turquie", "Au Maroc"], answerIndex: 0, mediaUrl: img("taj-mahal"), mediaAlt: "Mausolée de marbre blanc à dôme central et quatre minarets", sourceUrl: W("Taj_Mahal") },
  { categoryId: "histoire", subcategory: "monuments", textFr: "Quel ensemble funéraire égyptien est montré sur cette image ?", options: ["Les pyramides de Gizeh", "Les temples d'Abou Simbel", "La vallée des Rois", "Le temple de Karnak"], answerIndex: 0, mediaUrl: img("pyramides-gizeh"), mediaAlt: "Grande pyramide de pierre dans le désert", sourceUrl: W("Pyramides_de_Gizeh") },
  { categoryId: "geographie", subcategory: "monuments", textFr: "Dans quelle ville se dresse la statue photographiée ici ?", options: ["À New York", "À Chicago", "À Boston", "À Philadelphie"], answerIndex: 0, mediaUrl: img("statue-liberte"), mediaAlt: "Statue de cuivre vert tenant une torche levée", sourceUrl: W("Statue_de_la_Libert%C3%A9") },
  { categoryId: "geographie", subcategory: "monuments", textFr: "Quelle cité inca est représentée sur cette photographie ?", options: ["Le Machu Picchu", "Chichén Itzá", "Tikal", "Teotihuacan"], answerIndex: 0, mediaUrl: img("machu-picchu"), mediaAlt: "Ruines de pierre en terrasses sur une crête montagneuse", sourceUrl: W("Machu_Picchu") },
  { categoryId: "culture", subcategory: "architecture", textFr: "Quel édifice aux voiles de béton blanc est montré ici ?", options: ["L'opéra de Sydney", "Le Guggenheim de Bilbao", "La Cité des arts de Valence", "Le Kennedy Center"], answerIndex: 0, mediaUrl: img("opera-sydney"), mediaAlt: "Bâtiment aux coques blanches superposées au bord de l'eau", sourceUrl: W("Op%C3%A9ra_de_Sydney") },
  { categoryId: "geographie", subcategory: "monuments", textFr: "Quelle statue monumentale domine la ville visible sur cette image ?", options: ["Le Christ Rédempteur", "Le Christ-Roi de Świebodzin", "La statue de Cristo de la Concordia", "Le Christ de Vũng Tàu"], answerIndex: 0, mediaUrl: img("christ-redempteur"), mediaAlt: "Statue du Christ bras écartés au sommet d'une montagne", sourceUrl: W("Christ_R%C3%A9dempteur_(Rio_de_Janeiro)") },

  // ── Nature et animaux ──────────────────────────────────────────────
  { categoryId: "geographie", subcategory: "reliefs", textFr: "Quel sommet africain est photographié ici ?", options: ["Le Kilimandjaro", "Le mont Kenya", "Le mont Cameroun", "Le Toubkal"], answerIndex: 0, mediaUrl: img("kilimandjaro"), mediaAlt: "Montagne au sommet plat enneigé dominant la savane", sourceUrl: W("Kilimandjaro") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Quel animal est représenté sur cette photographie ?", options: ["Une girafe", "Un okapi", "Un guanaco", "Un gérénuk"], answerIndex: 0, mediaUrl: img("girafe"), mediaAlt: "Mammifère au très long cou et au pelage tacheté", sourceUrl: W("Girafe") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Quel félin est montré sur cette image ?", options: ["Un guépard", "Un léopard", "Un jaguar", "Un serval"], answerIndex: 0, mediaUrl: img("guepard"), mediaAlt: "Félin élancé au pelage tacheté et aux larmes noires", sourceUrl: W("Gu%C3%A9pard") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Quelle espèce est photographiée ici ?", options: ["Un éléphant d'Afrique", "Un éléphant d'Asie", "Un mammouth reconstitué", "Un rhinocéros blanc"], answerIndex: 0, mediaUrl: img("elephant-afrique"), mediaAlt: "Grand pachyderme aux vastes oreilles dans la savane", sourceUrl: W("%C3%89l%C3%A9phant_de_savane_d%27Afrique") },
  { categoryId: "nature", subcategory: "plantes", textFr: "Quel arbre au tronc massif est représenté sur cette image ?", options: ["Un baobab", "Un séquoia", "Un banian", "Un ceiba"], answerIndex: 0, mediaUrl: img("baobab"), mediaAlt: "Arbre au tronc très épais et aux branches nues", sourceUrl: W("Baobab") },

  // ── Drapeaux ───────────────────────────────────────────────────────
  { categoryId: "afrique", subcategory: "drapeaux", textFr: "De quel pays ce drapeau est-il l'emblème ?", options: ["Le Cameroun", "Le Sénégal", "Le Mali", "La Guinée"], answerIndex: 0, mediaUrl: img("drapeau-cameroun"), mediaAlt: "Drapeau tricolore vertical vert, rouge et jaune avec une étoile centrale", sourceUrl: W("Drapeau_du_Cameroun") },
  { categoryId: "geographie", subcategory: "drapeaux", textFr: "Quel pays arbore ce drapeau ?", options: ["Le Brésil", "Le Portugal", "L'Argentine", "La Colombie"], answerIndex: 0, mediaUrl: img("drapeau-bresil"), mediaAlt: "Drapeau vert au losange jaune et globe bleu étoilé", sourceUrl: W("Drapeau_du_Br%C3%A9sil") },
  { categoryId: "geographie", subcategory: "drapeaux", textFr: "À quel pays appartient ce drapeau ?", options: ["Le Japon", "Le Bangladesh", "La Corée du Sud", "Les Palaos"], answerIndex: 0, mediaUrl: img("drapeau-japon"), mediaAlt: "Drapeau blanc au disque rouge centré", sourceUrl: W("Drapeau_du_Japon") },

  // ── Œuvres d'art ───────────────────────────────────────────────────
  { categoryId: "culture", subcategory: "art", textFr: "Quelle œuvre célèbre est reproduite sur cette image ?", options: ["La Joconde", "La Jeune Fille à la perle", "La Naissance de Vénus", "Les Ménines"], answerIndex: 0, mediaUrl: img("joconde"), mediaAlt: "Portrait de femme au sourire énigmatique sur fond de paysage", sourceUrl: W("La_Joconde") },
  { categoryId: "culture", subcategory: "art", textFr: "Quel tableau de Vincent van Gogh est représenté ici ?", options: ["La Nuit étoilée", "Les Tournesols", "La Chambre à Arles", "Le Café de nuit"], answerIndex: 0, mediaUrl: img("nuit-etoilee"), mediaAlt: "Ciel nocturne tourbillonnant au-dessus d'un village", sourceUrl: W("La_Nuit_%C3%A9toil%C3%A9e") },
];
