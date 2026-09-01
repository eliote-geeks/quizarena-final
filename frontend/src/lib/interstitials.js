// Cartes affichées ENTRE deux questions.
//
// Avant, un tip tenait sur une ligne de texte doré pâle collée sous le
// résultat : illisible en pratique, et sans intérêt. Le temps mort entre
// deux questions est pourtant le seul moment où le joueur ne fait rien —
// c'est là qu'on peut donner quelque chose plutôt que de le faire attendre.
//
// Trois familles, toutes vraies et vérifiables :
//  • fait      — un fait réel, sourcé, souvent illustré par une des images
//                déjà contrôlées visuellement pour la banque de questions
//  • plateforme— un vrai fonctionnement du jeu (règles, gains, sécurité)
//  • conseil   — une aide de jeu concrète
//
// Rien d'inventé ici : aucune promesse commerciale, aucun chiffre décoratif.
// Les cartes publicitaires du lobby avaient dérivé exactement là-dessus
// (un tournoi fictif « ce soir 20h », un abondement de dépôt inexistant),
// et sur une appli d'argent réel ça n'est pas une licence acceptable.

const img = (slug) => `/questions/${slug}.webp`;

export const INTERSTITIALS = [
  // ── Faits réels illustrés ──────────────────────────────────────────
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "Le baobab peut stocker 100 000 litres d'eau",
    body: "Son tronc massif est une réserve : il gonfle à la saison des pluies et se vide pendant la sécheresse. Certains sujets dépassent les 2 000 ans.",
    image: img("baobab"),
    source: "Adansonia — Wikipédia",
  },
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "Le guépard atteint sa vitesse maximale en trois foulées",
    body: "Il passe de 0 à 100 km/h en moins de trois secondes, mais ne tient cette allure qu'une trentaine de secondes : au-delà, sa température corporelle devient dangereuse.",
    image: img("guepard"),
    source: "Acinonyx jubatus — Wikipédia",
  },
  {
    kind: "fait",
    label: "Découverte",
    title: "La structure de l'ADN a été révélée par des clichés aux rayons X",
    body: "En 1952, la photographie 51 prise dans le laboratoire de Rosalind Franklin montre la double hélice. Elle est publiée en 1953 aux côtés du modèle de Watson et Crick.",
    image: img("adn-double-helice"),
    source: "Photo 51 — Wikipédia",
  },
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "Les anneaux de Saturne ne font que quelques dizaines de mètres d'épaisseur",
    body: "Ils s'étendent sur près de 280 000 kilomètres de large mais restent extrêmement fins — un rapport comparable à une feuille de papier large comme un terrain de football.",
    image: img("saturne"),
    source: "Anneaux de Saturne — Wikipédia",
  },
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "La Grande Muraille n'est pas visible à l'œil nu depuis l'espace",
    body: "L'idée circule depuis le XIXe siècle, mais elle est fausse : la muraille est longue, pas large, et se confond avec le relief. Les astronautes l'ont confirmé.",
    image: img("grande-muraille"),
    source: "Grande Muraille — Wikipédia",
  },
  {
    kind: "fait",
    label: "Découverte",
    title: "Le mont Cameroun est le volcan le plus actif d'Afrique de l'Ouest",
    body: "Il culmine à 4 040 mètres et est entré en éruption sept fois au XXe siècle. Ses pentes comptent parmi les endroits les plus arrosés de la planète.",
    image: img("kilimandjaro"),
    imageAlt: "Volcan africain dominant le paysage",
    source: "Mont Cameroun — Wikipédia",
  },
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "Une girafe a le même nombre de vertèbres cervicales qu'un humain",
    body: "Sept, comme presque tous les mammifères. Chacune mesure simplement jusqu'à 25 centimètres de long.",
    image: img("girafe"),
    source: "Girafe — Wikipédia",
  },
  {
    kind: "fait",
    label: "Découverte",
    title: "Le Grand Zimbabwe a été bâti sans mortier",
    body: "Ses murs de granit atteignent 11 mètres de haut, assemblés bloc par bloc entre les XIe et XVe siècles. Le pays a pris le nom du site à son indépendance.",
    image: img("grand-zimbabwe"),
    source: "Grand Zimbabwe — Wikipédia",
  },
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "La mosquée de Djenné est le plus grand édifice en terre crue du monde",
    body: "Chaque année, les habitants la recrépissent collectivement lors d'une fête. Les poutres qui hérissent ses murs servent d'échafaudage permanent.",
    image: img("mosquee-djenne"),
    source: "Grande mosquée de Djenné — Wikipédia",
  },
  {
    kind: "fait",
    label: "Découverte",
    title: "Les églises de Lalibela sont taillées dans la roche, de haut en bas",
    body: "Onze édifices creusés d'un seul bloc au XIIIe siècle en Éthiopie, en descendant depuis la surface au lieu de monter des murs.",
    image: img("lalibela"),
    source: "Églises de Lalibela — Wikipédia",
  },
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "Le cacaoyer donne ses fruits directement sur son tronc",
    body: "On appelle ça la cauliflorie. La Côte d'Ivoire et le Ghana produisent à eux deux plus de la moitié du cacao mondial ; le Cameroun figure dans les premiers rangs.",
    image: img("cacaoyer"),
    source: "Cacaoyer — Wikipédia",
  },
  {
    kind: "fait",
    label: "Découverte",
    title: "La Joconde a été volée au Louvre en 1911",
    body: "Elle est restée introuvable deux ans. C'est ce vol, et la couverture médiatique qui a suivi, qui l'ont rendue mondialement célèbre.",
    image: img("joconde"),
    source: "Vol de La Joconde — Wikipédia",
  },
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "Van Gogh a peint La Nuit étoilée depuis sa chambre d'asile",
    body: "Saint-Rémy-de-Provence, juin 1889, de mémoire et de jour. Il n'en était pas satisfait.",
    image: img("nuit-etoilee"),
    source: "La Nuit étoilée — Wikipédia",
  },
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "L'éléphant d'Afrique communique par vibrations du sol",
    body: "Ses barrissements descendent sous le seuil de l'audition humaine et se propagent sur plusieurs kilomètres. Les troupeaux les perçoivent par les pattes.",
    image: img("elephant-afrique"),
    source: "Éléphant de savane d'Afrique — Wikipédia",
  },
  {
    kind: "fait",
    label: "Découverte",
    title: "Les chutes Victoria produisent un brouillard visible à 30 km",
    body: "Son nom local, Mosi-oa-Tunya, signifie « la fumée qui gronde ». Jusqu'à 500 millions de litres d'eau par minute y basculent à la saison humide.",
    image: img("chutes-victoria"),
    source: "Chutes Victoria — Wikipédia",
  },
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "Le manchot empereur couve son œuf sur ses pattes",
    body: "Le mâle jeûne environ deux mois dans un froid pouvant descendre sous −40 °C, l'œuf posé sur ses pieds sous un repli de peau.",
    image: img("manchot-empereur"),
    source: "Manchot empereur — Wikipédia",
  },
  {
    kind: "fait",
    label: "Découverte",
    title: "Pétra était alimentée par un réseau hydraulique sophistiqué",
    body: "Les Nabatéens ont capté et stocké l'eau de pluie dans un désert par barrages, citernes et canalisations, permettant à des milliers de personnes d'y vivre.",
    image: img("petra"),
    source: "Pétra — Wikipédia",
  },
  {
    kind: "fait",
    label: "Le saviez-vous",
    title: "La kora possède 21 cordes et se joue avec quatre doigts",
    body: "Harpe-luth ouest-africaine à caisse de calebasse, transmise dans les familles de griots depuis des siècles.",
    image: img("kora"),
    source: "Kora — Wikipédia",
  },

  // ── Fonctionnement réel de la plateforme ───────────────────────────
  {
    kind: "plateforme",
    label: "Comment ça marche",
    title: "90 % du pot d'un tournoi revient aux joueurs",
    body: "Sur 8 joueurs à 500 F, le pot fait 4 000 F : 2 160 F au premier, 900 F au finaliste, 270 F à chaque demi-finaliste. La plateforme retient 10 %.",
  },
  {
    kind: "plateforme",
    label: "Comment ça marche",
    title: "À score égal, personne ne perd sa mise",
    body: "Un duel qui se termine sur une égalité est un match nul : les deux mises sont rendues intégralement.",
  },
  {
    kind: "plateforme",
    label: "Sécurité",
    title: "Le score est recalculé par le serveur, jamais par ton téléphone",
    body: "Les bonnes réponses ne sont jamais envoyées à l'appareil avant que tu aies répondu. Aucune manipulation locale ne peut modifier un résultat.",
  },
  {
    kind: "plateforme",
    label: "Sécurité",
    title: "Un gain suspect est mis en quarantaine, pas annulé",
    body: "L'analyse anti-triche peut retenir un gain le temps d'une vérification humaine. Un administrateur le débloque ensuite s'il est légitime.",
  },
  {
    kind: "plateforme",
    label: "Comment ça marche",
    title: "500 F sont offerts à l'ouverture du compte",
    body: "C'est un bonus d'inscription, versé une seule fois. Les crédits bonus servent à jouer ; seul le solde réel est retirable.",
  },
  {
    kind: "plateforme",
    label: "Comment ça marche",
    title: "Le créateur lance le tournoi, puis chacun confirme sa présence",
    body: "Le tirage du bracket n'a lieu qu'une fois tous les inscrits prêts. Tant qu'il manque quelqu'un, aucun match ne démarre et personne ne perd par forfait.",
  },
  {
    kind: "plateforme",
    label: "Comment ça marche",
    title: "Une question déjà vue ne revient jamais",
    body: "Ton historique de questions est conservé : le tirage écarte systématiquement celles que tu as déjà rencontrées, même dans une partie abandonnée.",
  },
  {
    kind: "plateforme",
    label: "Comment ça marche",
    title: "Chaque question de la banque cite sa source",
    body: "Toutes les questions sont rattachées à une référence vérifiable. C'est ce qui permet de trancher une contestation au lieu d'en débattre.",
  },

  // ── Conseils de jeu ────────────────────────────────────────────────
  {
    kind: "conseil",
    label: "Conseil",
    title: "Réponds vite, mais réponds juste",
    body: "La rapidité rapporte un bonus, jamais la totalité des points. Une mauvaise réponse instantanée vaut toujours moins qu'une bonne réponse réfléchie.",
  },
  {
    kind: "conseil",
    label: "Conseil",
    title: "Tu peux changer ton choix tant que le temps tourne",
    body: "Ta sélection n'est verrouillée qu'à la fin du compte à rebours. Si un doute te vient, tu as encore la main.",
  },
  {
    kind: "conseil",
    label: "Conseil",
    title: "Entraîne-toi en solo libre avant de miser",
    body: "Le mode libre n'engage aucun argent. C'est le bon endroit pour découvrir une catégorie que tu connais mal.",
  },
  {
    kind: "conseil",
    label: "Conseil",
    title: "Les catégories courtes s'épuisent plus vite",
    body: "Si tu enchaînes les parties dans une même catégorie, tu finiras par avoir vu ses questions. Alterne pour garder de la fraîcheur.",
  },
];

/**
 * Tire une carte au hasard, sans jamais répéter la précédente.
 * @param {string|null} excludeTitle titre de la carte déjà affichée
 */
export function pickInterstitial(excludeTitle) {
  const pool = INTERSTITIALS.filter((c) => c.title !== excludeTitle);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Variante limitée aux cartes illustrées, pour les écrans qui ont la place. */
export function pickIllustrated(excludeTitle) {
  const pool = INTERSTITIALS.filter((c) => c.image && c.title !== excludeTitle);
  return pool[Math.floor(Math.random() * pool.length)];
}
