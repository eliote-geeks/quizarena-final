// Approfondissement des catégories les plus minces : littérature, musique,
// célébrités, gastronomie, culture, Afrique, technologie.

const W = (page) => `https://fr.wikipedia.org/wiki/${page}`;

export default [
  // ── Littérature ────────────────────────────────────────────────────
  { categoryId: "litterature", subcategory: "classiques", textFr: "Quel romancier russe a écrit « Guerre et Paix » ?", options: ["Léon Tolstoï", "Fiodor Dostoïevski", "Anton Tchekhov", "Ivan Tourgueniev"], answerIndex: 0, sourceUrl: W("Guerre_et_Paix") },
  { categoryId: "litterature", subcategory: "classiques", textFr: "Quel écrivain britannique a créé le détective Sherlock Holmes ?", options: ["Arthur Conan Doyle", "Agatha Christie", "Wilkie Collins", "G. K. Chesterton"], answerIndex: 0, sourceUrl: W("Arthur_Conan_Doyle") },
  { categoryId: "litterature", subcategory: "classiques", textFr: "Quelle romancière britannique a écrit « Orgueil et Préjugés » ?", options: ["Jane Austen", "Emily Brontë", "George Eliot", "Virginia Woolf"], answerIndex: 0, sourceUrl: W("Orgueil_et_Pr%C3%A9jug%C3%A9s") },
  { categoryId: "litterature", subcategory: "classiques", textFr: "Quel auteur français a imaginé le capitaine Nemo et le Nautilus ?", options: ["Jules Verne", "Alexandre Dumas", "Victor Hugo", "Guy de Maupassant"], answerIndex: 0, sourceUrl: W("Vingt_mille_lieues_sous_les_mers") },
  { categoryId: "litterature", subcategory: "classiques", textFr: "Quel roman de George Orwell décrit une société sous surveillance de Big Brother ?", options: ["1984", "La Ferme des animaux", "Le Meilleur des mondes", "Fahrenheit 451"], answerIndex: 0, sourceUrl: W("1984_(roman)") },
  { categoryId: "litterature", subcategory: "classiques", textFr: "Quel écrivain colombien a écrit « Cent ans de solitude » ?", options: ["Gabriel García Márquez", "Mario Vargas Llosa", "Jorge Luis Borges", "Julio Cortázar"], answerIndex: 0, sourceUrl: W("Cent_ans_de_solitude") },
  { categoryId: "litterature", subcategory: "afrique", textFr: "Quelle romancière nigériane a publié « Americanah » ?", options: ["Chimamanda Ngozi Adichie", "Buchi Emecheta", "Tsitsi Dangarembga", "Ama Ata Aidoo"], answerIndex: 0, sourceUrl: W("Chimamanda_Ngozi_Adichie") },
  { categoryId: "litterature", subcategory: "afrique", textFr: "Quel écrivain camerounais a écrit « Une vie de boy » ?", options: ["Ferdinand Oyono", "Mongo Beti", "Francis Bebey", "Patrice Nganang"], answerIndex: 0, sourceUrl: W("Ferdinand_Oyono") },
  { categoryId: "litterature", subcategory: "afrique", textFr: "Quel mouvement littéraire a été porté par Senghor, Césaire et Damas ?", options: ["La négritude", "Le surréalisme", "L'existentialisme", "Le naturalisme"], answerIndex: 0, sourceUrl: W("N%C3%A9gritude") },
  { categoryId: "litterature", subcategory: "afrique", textFr: "Quelle romancière sénégalaise a écrit « Une si longue lettre » ?", options: ["Mariama Bâ", "Aminata Sow Fall", "Ken Bugul", "Fatou Diome"], answerIndex: 0, sourceUrl: W("Mariama_B%C3%A2") },
  { categoryId: "litterature", subcategory: "contemporain", textFr: "Quelle romancière britannique a créé le personnage de Harry Potter ?", options: ["J. K. Rowling", "Philip Pullman", "Enid Blyton", "Roald Dahl"], answerIndex: 0, sourceUrl: W("J._K._Rowling") },
  { categoryId: "litterature", subcategory: "contemporain", textFr: "Quel auteur britannique a écrit « Le Seigneur des anneaux » ?", options: ["J. R. R. Tolkien", "C. S. Lewis", "Terry Pratchett", "George R. R. Martin"], answerIndex: 0, sourceUrl: W("Le_Seigneur_des_anneaux") },

  // ── Musique ────────────────────────────────────────────────────────
  { categoryId: "musique", subcategory: "groupes", textFr: "De quelle ville britannique le groupe des Beatles est-il originaire ?", options: ["Liverpool", "Manchester", "Londres", "Birmingham"], answerIndex: 0, sourceUrl: W("The_Beatles") },
  { categoryId: "musique", subcategory: "groupes", textFr: "Quel chanteur était la voix du groupe Queen ?", options: ["Freddie Mercury", "Brian May", "Roger Taylor", "John Deacon"], answerIndex: 0, sourceUrl: W("Freddie_Mercury") },
  { categoryId: "musique", subcategory: "afrique", textFr: "Quel chanteur sénégalais a popularisé le mbalax dans le monde ?", options: ["Youssou N'Dour", "Ismaël Lô", "Baaba Maal", "Thione Seck"], answerIndex: 0, sourceUrl: W("Youssou_N%27Dour") },
  { categoryId: "musique", subcategory: "afrique", textFr: "Quelle chanteuse béninoise a remporté plusieurs Grammy Awards ?", options: ["Angélique Kidjo", "Oumou Sangaré", "Rokia Traoré", "Fatoumata Diawara"], answerIndex: 0, sourceUrl: W("Ang%C3%A9lique_Kidjo") },
  { categoryId: "musique", subcategory: "afrique", textFr: "Quel bassiste camerounais s'est imposé sur la scène jazz internationale ?", options: ["Richard Bona", "Manu Dibango", "Francis Bebey", "André-Marie Tala"], answerIndex: 0, sourceUrl: W("Richard_Bona") },
  { categoryId: "musique", subcategory: "afrique", textFr: "Quel genre musical nigérian domine les charts africains depuis les années 2010 ?", options: ["L'afrobeats", "Le highlife", "Le juju", "Le fuji"], answerIndex: 0, sourceUrl: W("Afrobeats") },
  { categoryId: "musique", subcategory: "afrique", textFr: "De quelle république le soukous est-il originaire ?", options: ["La République démocratique du Congo", "Le Nigeria", "Le Kenya", "La Côte d'Ivoire"], answerIndex: 0, sourceUrl: W("Soukous") },
  { categoryId: "musique", subcategory: "théorie", textFr: "Combien de notes compte la gamme diatonique occidentale ?", options: ["Sept", "Cinq", "Huit", "Douze"], answerIndex: 0, sourceUrl: W("Gamme_diatonique") },
  { categoryId: "musique", subcategory: "théorie", textFr: "Quel terme italien indique un tempo très lent en musique ?", options: ["Adagio", "Allegro", "Presto", "Vivace"], answerIndex: 0, sourceUrl: W("Tempo") },

  // ── Célébrités ─────────────────────────────────────────────────────
  { categoryId: "celebrites", subcategory: "sciences", textFr: "Quelle physicienne fut la première personne à recevoir deux prix Nobel ?", options: ["Marie Curie", "Rosalind Franklin", "Lise Meitner", "Irène Joliot-Curie"], answerIndex: 0, sourceUrl: W("Marie_Curie") },
  { categoryId: "celebrites", subcategory: "sciences", textFr: "Quel astrophysicien britannique a écrit « Une brève histoire du temps » ?", options: ["Stephen Hawking", "Roger Penrose", "Brian Cox", "Martin Rees"], answerIndex: 0, sourceUrl: W("Stephen_Hawking") },
  { categoryId: "celebrites", subcategory: "politique", textFr: "Quelle femme a été Premier ministre du Royaume-Uni de 1979 à 1990 ?", options: ["Margaret Thatcher", "Theresa May", "Liz Truss", "Harriet Harman"], answerIndex: 0, sourceUrl: W("Margaret_Thatcher") },
  { categoryId: "celebrites", subcategory: "politique", textFr: "Qui fut le premier président des États-Unis ?", options: ["George Washington", "Thomas Jefferson", "John Adams", "Benjamin Franklin"], answerIndex: 0, sourceUrl: W("George_Washington") },
  { categoryId: "celebrites", subcategory: "humanitaire", textFr: "Quelle militante pakistanaise est la plus jeune lauréate du prix Nobel de la paix ?", options: ["Malala Yousafzai", "Greta Thunberg", "Nadia Murad", "Tawakkol Karman"], answerIndex: 0, sourceUrl: W("Malala_Yousafzai") },
  { categoryId: "celebrites", subcategory: "cinéma", textFr: "Quel acteur britannique a incarné James Bond de 2006 à 2021 ?", options: ["Daniel Craig", "Pierce Brosnan", "Sean Connery", "Roger Moore"], answerIndex: 0, sourceUrl: W("Daniel_Craig") },
  { categoryId: "celebrites", subcategory: "sport", textFr: "Quel footballeur portugais a remporté cinq Ballons d'or entre 2008 et 2017 ?", options: ["Cristiano Ronaldo", "Luís Figo", "Eusébio", "Rui Costa"], answerIndex: 0, sourceUrl: W("Cristiano_Ronaldo") },
  { categoryId: "celebrites", subcategory: "sport", textFr: "Quel nageur américain détient le record du nombre de médailles olympiques ?", options: ["Michael Phelps", "Mark Spitz", "Ryan Lochte", "Caeleb Dressel"], answerIndex: 0, sourceUrl: W("Michael_Phelps") },

  // ── Gastronomie ────────────────────────────────────────────────────
  { categoryId: "gastronomie", subcategory: "afrique", textFr: "Quel beignet de haricots est très consommé au petit-déjeuner au Cameroun ?", options: ["Le beignet haricot", "Le samoussa", "Le nem", "Le falafel"], answerIndex: 0, sourceUrl: W("Cuisine_camerounaise") },
  { categoryId: "gastronomie", subcategory: "afrique", textFr: "Quel gâteau de haricots cuit à la vapeur est une spécialité camerounaise ?", options: ["Le koki", "Le ndolé", "Le bobolo", "Le poulet DG"], answerIndex: 0, sourceUrl: W("Cuisine_camerounaise") },
  { categoryId: "gastronomie", subcategory: "afrique", textFr: "Quelle boisson chaude est originaire des hauts plateaux éthiopiens ?", options: ["Le café", "Le thé vert", "Le cacao", "Le maté"], answerIndex: 0, sourceUrl: W("Caf%C3%A9") },
  { categoryId: "gastronomie", subcategory: "monde", textFr: "De quel pays le couscous est-il une spécialité traditionnelle ?", options: ["Le Maroc", "La Grèce", "Le Liban", "La Turquie"], answerIndex: 0, sourceUrl: W("Couscous") },
  { categoryId: "gastronomie", subcategory: "monde", textFr: "Quel fromage italien est traditionnellement râpé sur les pâtes ?", options: ["Le parmesan", "Le camembert", "Le cheddar", "Le gouda"], answerIndex: 0, sourceUrl: W("Parmigiano_Reggiano") },
  { categoryId: "gastronomie", subcategory: "monde", textFr: "Quelle céréale sert de base à la préparation du pain classique ?", options: ["Le blé", "Le riz", "Le maïs", "L'orge"], answerIndex: 0, sourceUrl: W("Pain") },
  { categoryId: "gastronomie", subcategory: "monde", textFr: "Quel fruit est à l'origine de l'huile d'olive ?", options: ["L'olive", "L'avocat", "La noix de coco", "L'arachide"], answerIndex: 0, sourceUrl: W("Huile_d%27olive") },
  { categoryId: "gastronomie", subcategory: "monde", textFr: "Quel plat espagnol associe riz, safran et fruits de mer ?", options: ["La paella", "Le risotto", "Le jambalaya", "Le pilaf"], answerIndex: 0, sourceUrl: W("Paella") },

  // ── Culture générale ───────────────────────────────────────────────
  { categoryId: "culture", subcategory: "société", textFr: "Combien de continents compte la Terre selon le découpage le plus courant ?", options: ["Cinq", "Trois", "Sept", "Neuf"], answerIndex: 2, sourceUrl: W("Continent") },
  { categoryId: "culture", subcategory: "société", textFr: "Quelle institution siège à La Haye et juge les crimes de guerre ?", options: ["La Cour pénale internationale", "Le Conseil de sécurité", "L'Assemblée générale", "La Banque mondiale"], answerIndex: 0, sourceUrl: W("Cour_p%C3%A9nale_internationale") },
  { categoryId: "culture", subcategory: "société", textFr: "Quelle agence des Nations unies s'occupe de la santé mondiale ?", options: ["L'OMS", "L'UNICEF", "Le PNUD", "La FAO"], answerIndex: 0, sourceUrl: W("Organisation_mondiale_de_la_sant%C3%A9") },
  { categoryId: "culture", subcategory: "art", textFr: "Quel sculpteur français a réalisé « Le Penseur » ?", options: ["Auguste Rodin", "Camille Claudel", "Aristide Maillol", "Antoine Bourdelle"], answerIndex: 0, sourceUrl: W("Le_Penseur") },
  { categoryId: "culture", subcategory: "art", textFr: "Quel mouvement artistique est associé à Claude Monet ?", options: ["L'impressionnisme", "Le cubisme", "Le surréalisme", "Le fauvisme"], answerIndex: 0, sourceUrl: W("Impressionnisme") },
  { categoryId: "culture", subcategory: "art", textFr: "Quel peintre espagnol a cofondé le cubisme avec Georges Braque ?", options: ["Pablo Picasso", "Salvador Dalí", "Joan Miró", "Francisco de Goya"], answerIndex: 0, sourceUrl: W("Pablo_Picasso") },
  { categoryId: "culture", subcategory: "langues", textFr: "Quelle langue est la plus parlée officiellement en Amérique latine ?", options: ["L'espagnol", "Le portugais", "Le français", "L'anglais"], answerIndex: 0, sourceUrl: W("Am%C3%A9rique_latine") },
  { categoryId: "culture", subcategory: "religions", textFr: "Quel livre est le texte sacré de l'islam ?", options: ["Le Coran", "La Torah", "Les Védas", "Le Tripitaka"], answerIndex: 0, sourceUrl: W("Coran") },

  // ── Afrique ────────────────────────────────────────────────────────
  { categoryId: "afrique", subcategory: "économie", textFr: "Quelle ressource représente une part majeure des exportations du Nigeria ?", options: ["Le pétrole", "Le cuivre", "Le diamant", "Le thé"], answerIndex: 0, sourceUrl: W("%C3%89conomie_du_Nigeria") },
  { categoryId: "afrique", subcategory: "économie", textFr: "Quelle culture d'exportation majeure est produite dans le sud du Cameroun ?", options: ["Le cacao", "Le blé", "La betterave", "Le colza"], answerIndex: 0, sourceUrl: W("%C3%89conomie_du_Cameroun") },
  { categoryId: "afrique", subcategory: "géographie", textFr: "Quel pays africain est traversé par le fleuve Sanaga ?", options: ["Le Cameroun", "Le Gabon", "Le Tchad", "Le Congo"], answerIndex: 0, sourceUrl: W("Sanaga") },
  { categoryId: "afrique", subcategory: "géographie", textFr: "Quelle mégapole égyptienne est la plus peuplée d'Afrique ?", options: ["Le Caire", "Lagos", "Kinshasa", "Johannesburg"], answerIndex: 0, sourceUrl: W("Le_Caire") },
  { categoryId: "afrique", subcategory: "culture", textFr: "Quel peuple d'Afrique de l'Est est connu pour ses parures rouges et son élevage bovin ?", options: ["Les Maasaï", "Les Dogons", "Les Peuls", "Les Zoulous"], answerIndex: 0, sourceUrl: W("Maasa%C3%AF") },
  { categoryId: "afrique", subcategory: "culture", textFr: "Quelle langue véhiculaire est largement parlée en Afrique de l'Est ?", options: ["Le swahili", "Le haoussa", "Le wolof", "L'amharique"], answerIndex: 0, sourceUrl: W("Swahili") },

  // ── Technologie ────────────────────────────────────────────────────
  { categoryId: "technologie", subcategory: "informatique", textFr: "Que signifie le sigle « USB » ?", options: ["Universal Serial Bus", "United System Backup", "Universal Storage Block", "Unified Signal Base"], answerIndex: 0, sourceUrl: W("USB") },
  { categoryId: "technologie", subcategory: "informatique", textFr: "Quel composant est considéré comme le cerveau d'un ordinateur ?", options: ["Le processeur", "Le disque dur", "La carte mère", "L'alimentation"], answerIndex: 0, sourceUrl: W("Processeur") },
  { categoryId: "technologie", subcategory: "informatique", textFr: "Quelle mémoire d'un ordinateur perd son contenu à l'extinction ?", options: ["La mémoire vive", "Le disque dur", "La mémoire flash", "Le SSD"], answerIndex: 0, sourceUrl: W("M%C3%A9moire_vive") },
  { categoryId: "technologie", subcategory: "sécurité", textFr: "Quel type de logiciel malveillant chiffre les fichiers contre rançon ?", options: ["Un rançongiciel", "Un pare-feu", "Un antivirus", "Un pilote"], answerIndex: 0, sourceUrl: W("Ran%C3%A7ongiciel") },
  { categoryId: "technologie", subcategory: "sécurité", textFr: "Quelle méthode ajoute une seconde preuve d'identité à un mot de passe ?", options: ["L'authentification à deux facteurs", "Le chiffrement symétrique", "La compression de données", "La sauvegarde incrémentale"], answerIndex: 0, sourceUrl: W("Authentification_%C3%A0_double_facteur") },
];
