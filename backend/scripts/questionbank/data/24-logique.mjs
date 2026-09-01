// Nouvelle catégorie "Logique" (01/09/2026, demande de Paul) — suites,
// probabilités, paradoxes et déduction. Chaque question a une réponse
// mathématiquement ou historiquement unique et vérifiable (pas d'énigme à
// interprétation multiple) ; sourceUrl pointe vers la notion Wikipedia qui
// justifie la réponse.
//
// Complément : top-up des catégories restées les plus fines après le lot
// 23 (gastronomie, musique, afrique, cinema, litterature).

const W = (page) => `https://fr.wikipedia.org/wiki/${page}`;

export default [
  // ── Logique : suites numériques ──────────────────────────────────────
  { categoryId: "logique", subcategory: "suites", textFr: "Quel nombre complète la suite : 2, 4, 6, 8, … ?", options: ["10", "9", "12", "16"], answerIndex: 0, sourceUrl: W("Suite_arithm%C3%A9tique") },
  { categoryId: "logique", subcategory: "suites", textFr: "Quel nombre complète la suite de Fibonacci : 1, 1, 2, 3, 5, 8, … ?", options: ["13", "11", "14", "10"], answerIndex: 0, sourceUrl: W("Suite_de_Fibonacci") },
  { categoryId: "logique", subcategory: "suites", textFr: "Quel nombre complète la suite des carrés : 1, 4, 9, 16, … ?", options: ["25", "20", "24", "36"], answerIndex: 0, sourceUrl: W("Carr%C3%A9_parfait") },
  { categoryId: "logique", subcategory: "suites", textFr: "Quel nombre complète la suite géométrique : 3, 6, 12, 24, … ?", options: ["48", "36", "42", "30"], answerIndex: 0, sourceUrl: W("Suite_g%C3%A9om%C3%A9trique") },
  { categoryId: "logique", subcategory: "suites", textFr: "Quel nombre complète la suite des nombres triangulaires : 1, 3, 6, 10, … ?", options: ["15", "12", "14", "16"], answerIndex: 0, sourceUrl: W("Nombre_triangulaire") },
  { categoryId: "logique", subcategory: "suites", textFr: "Quel nombre complète la suite des nombres premiers : 2, 3, 5, 7, … ?", options: ["11", "9", "10", "13"], answerIndex: 0, sourceUrl: W("Nombre_premier") },
  { categoryId: "logique", subcategory: "suites", textFr: "Quel nombre complète la suite des cubes : 1, 8, 27, 64, … ?", options: ["125", "100", "81", "216"], answerIndex: 0, sourceUrl: W("Cube_parfait") },
  { categoryId: "logique", subcategory: "suites", textFr: "Quel nombre complète la suite : 1, 2, 4, 8, 16, … ?", options: ["32", "24", "20", "64"], answerIndex: 0, sourceUrl: W("Puissance_de_deux") },

  // ── Logique : probabilités et combinatoire ──────────────────────────
  { categoryId: "logique", subcategory: "probabilités", textFr: "Quelle est la probabilité d'obtenir « pile » en lançant une pièce équilibrée ?", options: ["Une sur deux", "Une sur quatre", "Une sur trois", "Une sur six"], answerIndex: 0, sourceUrl: W("Pile_ou_face") },
  { categoryId: "logique", subcategory: "probabilités", textFr: "Quelle est la probabilité d'obtenir un 6 en lançant un dé à six faces équilibré ?", options: ["Une sur six", "Une sur deux", "Une sur quatre", "Une sur douze"], answerIndex: 0, sourceUrl: W("D%C3%A9_(jeu)") },
  { categoryId: "logique", subcategory: "probabilités", textFr: "Combien de résultats différents peut-on obtenir en lançant deux pièces de monnaie l'une après l'autre ?", options: ["Quatre", "Deux", "Trois", "Huit"], answerIndex: 0, sourceUrl: W("Combinatoire") },
  { categoryId: "logique", subcategory: "probabilités", textFr: "Combien de façons différentes existe-t-il de classer trois personnes sur un podium (1re, 2e, 3e) ?", options: ["Six", "Trois", "Neuf", "Douze"], answerIndex: 0, sourceUrl: W("Permutation_(math%C3%A9matiques)") },
  { categoryId: "logique", subcategory: "probabilités", textFr: "Dans le problème du Paradoxe des anniversaires, à partir de combien de personnes la probabilité que deux partagent le même anniversaire dépasse 50 % ?", options: ["Vingt-trois", "Cinquante", "Cent", "Douze"], answerIndex: 0, sourceUrl: W("Probl%C3%A8me_des_anniversaires") },

  // ── Logique : paradoxes et énigmes célèbres ─────────────────────────
  { categoryId: "logique", subcategory: "paradoxes", textFr: "Dans le problème de Monty Hall, faut-il changer de porte pour maximiser ses chances de gagner ?", options: ["Oui, changer double les chances", "Non, ça ne change rien", "Non, il vaut mieux garder son choix", "Cela dépend du présentateur"], answerIndex: 0, sourceUrl: W("Probl%C3%A8me_de_Monty_Hall") },
  { categoryId: "logique", subcategory: "paradoxes", textFr: "Que peut-on affirmer avec certitude si l'on range 13 objets dans 12 tiroirs, selon le principe des tiroirs ?", options: ["Au moins un tiroir contient deux objets", "Chaque tiroir contient un objet", "Un tiroir reste forcément vide", "Les objets se répartissent également"], answerIndex: 0, sourceUrl: W("Principe_des_tiroirs") },
  { categoryId: "logique", subcategory: "paradoxes", textFr: "À quelle difficulté logique le paradoxe « Achille et la tortue » est-il lié ?", options: ["La division infinie d'une distance", "La vitesse du son", "La gravité", "Les nombres premiers"], answerIndex: 0, sourceUrl: W("Achille_et_la_tortue_(paradoxe)") },
  { categoryId: "logique", subcategory: "paradoxes", textFr: "Sur quoi repose le paradoxe du menteur, en logique ?", options: ["Une phrase qui affirme sa propre fausseté", "Une phrase qui affirme sa propre vérité", "Une contradiction mathématique pure", "Une erreur de calcul"], answerIndex: 0, sourceUrl: W("Paradoxe_du_menteur") },

  // ── Logique : figures historiques ───────────────────────────────────
  { categoryId: "logique", subcategory: "histoire", textFr: "Quel mathématicien britannique a formalisé l'algèbre binaire qui porte son nom ?", options: ["George Boole", "Isaac Newton", "Alan Turing", "Charles Babbage"], answerIndex: 0, sourceUrl: W("George_Boole") },
  { categoryId: "logique", subcategory: "histoire", textFr: "Quel triangle de coefficients mathématiques doit son nom à un savant français du XVIIe siècle ?", options: ["Le triangle de Pascal", "Le triangle de Fermat", "Le triangle de Descartes", "Le triangle de Leibniz"], answerIndex: 0, sourceUrl: W("Triangle_de_Pascal") },
  { categoryId: "logique", subcategory: "histoire", textFr: "Quel logicien autrichien a démontré les théorèmes d'incomplétude ?", options: ["Kurt Gödel", "Bertrand Russell", "Gottlob Frege", "David Hilbert"], answerIndex: 0, sourceUrl: W("Th%C3%A9or%C3%A8mes_d%27incompl%C3%A9tude_de_G%C3%B6del") },
  { categoryId: "logique", subcategory: "histoire", textFr: "Quel philosophe grec est considéré comme le fondateur de la logique formelle et du syllogisme ?", options: ["Aristote", "Platon", "Socrate", "Pythagore"], answerIndex: 0, sourceUrl: W("Syllogisme") },

  // ── Logique : déduction ─────────────────────────────────────────────
  { categoryId: "logique", subcategory: "déduction", textFr: "« Tous les chats sont des mammifères. Tous les mammifères respirent de l'air. » Que peut-on en déduire logiquement ?", options: ["Tous les chats respirent de l'air", "Tous les mammifères sont des chats", "Aucun chat ne respire de l'air", "Rien ne peut être déduit"], answerIndex: 0, sourceUrl: W("Syllogisme") },
  { categoryId: "logique", subcategory: "déduction", textFr: "Si « il pleut » implique toujours « le sol est mouillé », et que le sol est mouillé, peut-on conclure avec certitude qu'il pleut ?", options: ["Non, le sol peut être mouillé pour une autre raison", "Oui, c'est une déduction valide", "Oui, mais seulement le matin", "Cela dépend du pays"], answerIndex: 0, sourceUrl: W("Affirmation_du_cons%C3%A9quent") },
  { categoryId: "logique", subcategory: "déduction", textFr: "En logique, quel est le nom du raisonnement fallacieux qui consiste à conclure « P » à partir de « si P alors Q » et « Q » ?", options: ["L'affirmation du conséquent", "Le modus ponens", "Le modus tollens", "La contraposée"], answerIndex: 0, sourceUrl: W("Affirmation_du_cons%C3%A9quent") },
  { categoryId: "logique", subcategory: "déduction", textFr: "Comment fonctionne le chiffre de César, l'une des méthodes de cryptage les plus anciennes ?", options: ["Il décale chaque lettre d'un même nombre de rangs", "Il inverse l'ordre des lettres", "Il remplace les voyelles par des chiffres", "Il double chaque lettre"], answerIndex: 0, sourceUrl: W("Chiffre_de_C%C3%A9sar") },
  { categoryId: "logique", subcategory: "déduction", textFr: "À quoi équivaut, en logique mathématique, la négation de « tous les X sont Y » ?", options: ["« Il existe au moins un X qui n'est pas Y »", "« Aucun X n'est Y »", "« Tous les X ne sont pas Y »", "« Y est toujours vrai »"], answerIndex: 0, sourceUrl: W("Quantification_(logique)") },
  { categoryId: "logique", subcategory: "déduction", textFr: "Quel nom porte le raisonnement logique valide : « si P alors Q », « P est vrai », donc « Q est vrai » ?", options: ["Le modus ponens", "Le modus tollens", "La disjonction", "La tautologie"], answerIndex: 0, sourceUrl: W("Modus_ponens") },
  { categoryId: "logique", subcategory: "déduction", textFr: "Quel nom porte le raisonnement logique valide : « si P alors Q », « Q est faux », donc « P est faux » ?", options: ["Le modus tollens", "Le modus ponens", "La contradiction", "L'induction"], answerIndex: 0, sourceUrl: W("Modus_tollens") },

  // ── Logique : jeux et casse-têtes ────────────────────────────────────
  { categoryId: "logique", subcategory: "jeux", textFr: "Aux échecs, combien de cases possède l'échiquier ?", options: ["Soixante-quatre", "Quarante-neuf", "Cent", "Trente-deux"], answerIndex: 0, sourceUrl: W("%C3%89chiquier") },
  { categoryId: "logique", subcategory: "jeux", textFr: "Dans le jeu de Nim classique, combien de tas d'allumettes utilise-t-on habituellement au minimum ?", options: ["Un seul suffit", "Deux", "Trois", "Quatre"], answerIndex: 0, sourceUrl: W("Nim_(jeu)") },
  { categoryId: "logique", subcategory: "jeux", textFr: "Le sudoku classique se joue sur une grille de quelle taille ?", options: ["Neuf cases sur neuf", "Six cases sur six", "Huit cases sur huit", "Dix cases sur dix"], answerIndex: 0, sourceUrl: W("Sudoku") },
  { categoryId: "logique", subcategory: "jeux", textFr: "Dans le jeu de dames international, combien de cases compte le damier ?", options: ["100", "64", "81", "144"], answerIndex: 0, sourceUrl: W("Jeu_de_dames") },

  // ── Complément — Gastronomie ─────────────────────────────────────────
  { categoryId: "gastronomie", subcategory: "monde", textFr: "Quelle épice, la plus chère au monde, provient des stigmates d'une fleur de crocus ?", options: ["Le safran", "La cardamome", "La cannelle", "La muscade"], answerIndex: 0, sourceUrl: W("Safran") },
  { categoryId: "gastronomie", subcategory: "monde", textFr: "Quel fromage italien à pâte filée sert traditionnellement à garnir la pizza ?", options: ["La mozzarella", "Le parmesan", "Le gorgonzola", "Le pecorino"], answerIndex: 0, sourceUrl: W("Mozzarella") },
  { categoryId: "gastronomie", subcategory: "monde", textFr: "Quelle boisson chaude est préparée par extraction sous pression de café moulu ?", options: ["L'espresso", "Le thé", "Le chocolat chaud", "Le chai"], answerIndex: 0, sourceUrl: W("Espresso") },
  { categoryId: "gastronomie", subcategory: "monde", textFr: "Quel plat japonais consiste en du riz vinaigré associé à du poisson cru ?", options: ["Les sushis", "Les nouilles ramen", "Le tempura", "Le teriyaki"], answerIndex: 0, sourceUrl: W("Sushi") },
  { categoryId: "gastronomie", subcategory: "monde", textFr: "Quelle sauce froide à base d'œuf et d'huile sert de base à de nombreuses préparations ?", options: ["La mayonnaise", "La vinaigrette", "La béchamel", "Le pesto"], answerIndex: 0, sourceUrl: W("Mayonnaise") },
  { categoryId: "gastronomie", subcategory: "monde", textFr: "Quelle céréale fermentée sert de base à la fabrication de la bière ?", options: ["L'orge", "Le riz", "Le maïs", "Le seigle"], answerIndex: 0, sourceUrl: W("Bi%C3%A8re") },

  // ── Complément — Musique ─────────────────────────────────────────────
  { categoryId: "musique", subcategory: "théorie", textFr: "Combien de temps compte une mesure à quatre temps (4/4) ?", options: ["Quatre", "Trois", "Deux", "Six"], answerIndex: 0, sourceUrl: W("Mesure_(musique)") },
  { categoryId: "musique", subcategory: "instruments", textFr: "Quel instrument à clavier produit le son en pinçant des cordes, ancêtre du piano ?", options: ["Le clavecin", "L'orgue", "Le célesta", "Le clavicorde"], answerIndex: 0, sourceUrl: W("Clavecin") },
  { categoryId: "musique", subcategory: "instruments", textFr: "Quel instrument à vent en bois possède une anche double caractéristique ?", options: ["Le hautbois", "La clarinette", "La flûte traversière", "Le saxophone"], answerIndex: 0, sourceUrl: W("Hautbois") },
  { categoryId: "musique", subcategory: "genres", textFr: "Quel genre musical jamaïcain, né dans les années 1960, a précédé le reggae ?", options: ["Le ska", "Le dub", "Le calypso", "Le mento"], answerIndex: 0, sourceUrl: W("Ska") },
  { categoryId: "musique", subcategory: "afrique", textFr: "Quel genre musical congolais, né dans les années 1930, a influencé toute l'Afrique centrale ?", options: ["La rumba congolaise", "Le mbalax", "L'afrobeat", "Le highlife"], answerIndex: 0, sourceUrl: W("Rumba_congolaise") },
  { categoryId: "musique", subcategory: "afrique", textFr: "Quel instrument à cordes pincées, taillé dans une calebasse, est emblématique de l'Afrique de l'Ouest ?", options: ["La kora", "Le djembé", "Le balafon", "Le talking drum"], answerIndex: 0, sourceUrl: W("Kora_(instrument)") },

  // ── Complément — Afrique ──────────────────────────────────────────────
  { categoryId: "afrique", subcategory: "géographie", textFr: "Quel est le plus grand désert chaud du monde, situé en Afrique du Nord ?", options: ["Le Sahara", "Le Kalahari", "Le désert du Namib", "Le désert de Libye"], answerIndex: 0, sourceUrl: W("Sahara") },
  { categoryId: "afrique", subcategory: "géographie", textFr: "Quel fleuve africain est le plus long du monde ?", options: ["Le Nil", "Le Congo", "Le Niger", "Le Zambèze"], answerIndex: 0, sourceUrl: W("Nil") },
  { categoryId: "afrique", subcategory: "société", textFr: "Combien de pays compte officiellement le continent africain ?", options: ["54", "40", "60", "48"], answerIndex: 0, sourceUrl: W("Liste_des_pays_d%27Afrique") },
  { categoryId: "afrique", subcategory: "culture", textFr: "Quel tissu imprimé aux motifs colorés est largement porté en Afrique de l'Ouest et centrale ?", options: ["Le wax", "Le tartan", "Le madras", "Le denim"], answerIndex: 0, sourceUrl: W("Wax_(tissu)") },
  { categoryId: "afrique", subcategory: "histoire", textFr: "Quel empire ouest-africain médiéval, dirigé par Mansa Moussa, était réputé pour sa richesse en or ?", options: ["L'Empire du Mali", "L'Empire songhaï", "L'Empire du Ghana", "Le royaume du Bénin"], answerIndex: 0, sourceUrl: W("Empire_du_Mali") },

  // ── Complément — Cinéma ────────────────────────────────────────────────
  { categoryId: "cinema", subcategory: "technique", textFr: "Comment appelle-t-on la personne chargée de la mise en scène d'un film ?", options: ["Le réalisateur", "Le producteur", "Le scénariste", "Le monteur"], answerIndex: 0, sourceUrl: W("R%C3%A9alisateur") },
  { categoryId: "cinema", subcategory: "récompenses", textFr: "Quelle cérémonie américaine récompense chaque année les meilleurs films par des statuettes dorées ?", options: ["Les Oscars", "Les Golden Globes", "Les Emmy Awards", "Les BAFTA"], answerIndex: 0, sourceUrl: W("Oscars_du_cin%C3%A9ma") },
  { categoryId: "cinema", subcategory: "récompenses", textFr: "Quel festival de cinéma français décerne la Palme d'or ?", options: ["Le Festival de Cannes", "Le Festival de Deauville", "Le Festival de Venise", "La Berlinale"], answerIndex: 0, sourceUrl: W("Festival_de_Cannes") },
  { categoryId: "cinema", subcategory: "industrie", textFr: "Comment surnomme-t-on l'industrie cinématographique nigériane, l'une des plus productives au monde ?", options: ["Nollywood", "Bollywood", "Ghallywood", "Riverwood"], answerIndex: 0, sourceUrl: W("Nollywood") },
  { categoryId: "cinema", subcategory: "technique", textFr: "Quel terme désigne la bande sonore originale composée pour un film ?", options: ["La bande originale (BO)", "Le doublage", "Le sous-titrage", "Le mixage"], answerIndex: 0, sourceUrl: W("Bande_originale") },

  // ── Complément — Littérature ─────────────────────────────────────────
  { categoryId: "litterature", subcategory: "classiques", textFr: "Quel écrivain français a créé le personnage de Jean Valjean dans « Les Misérables » ?", options: ["Victor Hugo", "Émile Zola", "Alexandre Dumas", "Gustave Flaubert"], answerIndex: 0, sourceUrl: W("Les_Mis%C3%A9rables") },
  { categoryId: "litterature", subcategory: "classiques", textFr: "Quel romancier russe a écrit « Crime et Châtiment » ?", options: ["Fiodor Dostoïevski", "Léon Tolstoï", "Anton Tchekhov", "Ivan Tourgueniev"], answerIndex: 0, sourceUrl: W("Crime_et_Ch%C3%A2timent") },
  { categoryId: "litterature", subcategory: "genres", textFr: "Quel genre littéraire bref met en scène des animaux pour délivrer une morale ?", options: ["La fable", "Le roman", "L'essai", "L'ode"], answerIndex: 0, sourceUrl: W("Fable") },
  { categoryId: "litterature", subcategory: "afrique", textFr: "Quel écrivain nigérian a écrit « Le Monde s'effondre », roman fondateur de la littérature africaine moderne ?", options: ["Chinua Achebe", "Wole Soyinka", "Ben Okri", "Chimamanda Ngozi Adichie"], answerIndex: 0, sourceUrl: W("Le_Monde_s%27effondre") },
  { categoryId: "litterature", subcategory: "prix", textFr: "Quel prix littéraire français prestigieux est décerné chaque année depuis 1903 ?", options: ["Le prix Goncourt", "Le prix Femina", "Le prix Renaudot", "Le prix Médicis"], answerIndex: 0, sourceUrl: W("Prix_Goncourt") },
];
