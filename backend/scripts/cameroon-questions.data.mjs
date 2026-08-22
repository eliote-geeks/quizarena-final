// Nouvelles questions Cameroun — chaque fait vérifié individuellement
// par recherche web réelle le 19/08/2026 (sources : footballhistory.org,
// Britannica, ESPN, olympics.com, Wikipedia FR/EN, EHNE, camerounweb.com,
// worldmusiccentral.org — pas de fait "de mémoire" du modèle seul).
// active=true directement (contrairement au lot IA générique) : source="manual",
// même rigueur que le premier lot Cameroun du 15/08.
export const QUESTIONS = [
  // ── football-cm ──────────────────────────────────────────────────
  { categoryId: "football-cm", text: "En quelle année le Cameroun a-t-il remporté sa toute première Coupe d'Afrique des Nations ?", options: ["1980", "1984", "1988", "2000"], answerIndex: 1 },
  { categoryId: "football-cm", text: "Quelle est la seule équipe plus titrée que le Cameroun à la CAN ?", options: ["Ghana", "Égypte", "Nigeria", "Côte d'Ivoire"], answerIndex: 1 },
  { categoryId: "football-cm", text: "Combien de sélections Samuel Eto'o compte-t-il avec le Cameroun ?", options: ["98", "108", "118", "128"], answerIndex: 2 },
  { categoryId: "football-cm", text: "Combien de buts Samuel Eto'o a-t-il marqués en équipe nationale — un record camerounais ?", options: ["46", "51", "56", "61"], answerIndex: 2 },
  { categoryId: "football-cm", text: "À quel âge Roger Milla est-il devenu, lors du Mondial 1994 face à la Russie, le plus vieux buteur de l'histoire de la Coupe du Monde ?", options: ["38 ans", "40 ans", "42 ans", "44 ans"], answerIndex: 2 },
  { categoryId: "football-cm", text: "Comment se nomme l'équipe nationale féminine de football du Cameroun ?", options: ["Les Lionnes", "Les Indomptables", "Les Lionnes Indomptables", "Les Panthères"], answerIndex: 2 },
  { categoryId: "football-cm", text: "Quel est le plus grand stade du Cameroun par sa capacité (60 000 places), inauguré à Yaoundé en 2021 ?", options: ["Stade Ahmadou Ahidjo", "Stade de Japoma", "Stade Omnisport Olembé", "Stade de la Réunification"], answerIndex: 2 },
  { categoryId: "football-cm", text: "Quelle est la capacité du stade de Japoma, à Douala, inauguré en 2020 ?", options: ["30 000", "40 000", "50 000", "60 000"], answerIndex: 2 },
  { categoryId: "football-cm", text: "Le Stade Ahmadou Ahidjo de Yaoundé, domicile historique des Lions Indomptables, a été inauguré en quelle année ?", options: ["1962", "1972", "1982", "1992"], answerIndex: 1 },
  { categoryId: "football-cm", text: "Pour se qualifier au Mondial 2022, le Cameroun a éliminé quel pays en barrage ?", options: ["Algérie", "Nigeria", "Égypte", "Tunisie"], answerIndex: 0 },
  { categoryId: "football-cm", text: "Qui était le capitaine du Cameroun lors du sacre à la CAN 1984, sa toute première victoire continentale ?", options: ["Roger Milla", "Théophile Abega", "Thomas N'Kono", "Emmanuel Kundé"], answerIndex: 1 },
  { categoryId: "football-cm", text: "Quel gardien de but camerounais légendaire défendait les buts des Lions Indomptables au Mondial 1990 ?", options: ["Thomas N'Kono", "Joseph-Antoine Bell", "Carlos Kameni", "André Onana"], answerIndex: 0 },

  // ── musique-cm ───────────────────────────────────────────────────
  { categoryId: "musique-cm", text: "Charlotte Dipanda, chanteuse camerounaise à la voix acoustique saluée, est devenue juge de quelle émission télévisée en 2016 ?", options: ["Nouvelle Star", "The Voice Afrique Francophone", "Cameroon's Got Talent", "Miss Cameroun"], answerIndex: 1 },
  { categoryId: "musique-cm", text: "Quel est le titre du single qui a lancé la carrière solo du chanteur R&B camerounais Locko en 2015 ?", options: ["Margo", "Bella", "On va bien", "Coco"], answerIndex: 0 },
  { categoryId: "musique-cm", text: "Le groupe camerounais X-Maleya, fondé en 1998, joue principalement quel style musical ?", options: ["Makossa", "Bikutsi", "Afro pop", "Rap"], answerIndex: 2 },
  { categoryId: "musique-cm", text: "Quelle chanteuse camerounaise est surnommée « la mère du bikutsi » ?", options: ["Charlotte Dipanda", "K-Tino", "Lady Ponce", "Coco Argentée"], answerIndex: 1 },
  { categoryId: "musique-cm", text: "Quelle chanteuse camerounaise, active dès les années 1960-70, est considérée comme l'une des toutes premières grandes voix féminines du pays ?", options: ["Anne-Marie Nzié", "K-Tino", "Lady Ponce", "Charlotte Dipanda"], answerIndex: 0 },
  { categoryId: "musique-cm", text: "La popularisation du bikutsi au-delà de son peuple d'origine est surtout liée à la migration vers quelle ville camerounaise ?", options: ["Douala", "Yaoundé", "Bafoussam", "Garoua"], answerIndex: 1 },
  { categoryId: "musique-cm", text: "Dans quel pays voisin les musiciens camerounais ont-ils côtoyé, dans les années 1960, les rythmes latino-américains à l'origine du makossa ?", options: ["Nigeria", "Gabon", "Guinée équatoriale", "Tchad"], answerIndex: 2 },
  { categoryId: "musique-cm", text: "Le makossa reste, à ce jour, le rythme camerounais ayant connu le plus grand succès international, mélange de jazz, soul, rumba et musique traditionnelle. Quel autre genre camerounais partage ses racines en partie ?", options: ["Bikutsi", "Assiko", "Bend-skin", "Mangambeu"], answerIndex: 1 },

  // ── histoire-cm ──────────────────────────────────────────────────
  { categoryId: "histoire-cm", text: "Qui a été élu Premier ministre du Cameroun le 5 mai 1960, aux côtés du président Ahmadou Ahidjo ?", options: ["Charles Assalé", "John Ngu Foncha", "Paul Biya", "Simon Achidi Achu"], answerIndex: 0 },
  { categoryId: "histoire-cm", text: "Qui est devenu vice-président de la République fédérale du Cameroun lors de la réunification de 1961 ?", options: ["John Ngu Foncha", "Charles Assalé", "Solomon Tandeng Muna", "Paul Biya"], answerIndex: 0 },
  { categoryId: "histoire-cm", text: "En 1922, le protectorat allemand du Cameroun est officiellement placé sous mandat de quelle organisation internationale ?", options: ["L'ONU", "La Société des Nations", "L'Union africaine", "Le Commonwealth"], answerIndex: 1 },
  { categoryId: "histoire-cm", text: "Lors du référendum de réunification de 1961, quelle partie du Cameroun britannique a voté pour rejoindre le Nigeria plutôt que le Cameroun ?", options: ["Le Cameroun méridional", "Le Cameroun septentrional", "Le Cameroun occidental", "Le Cameroun oriental"], answerIndex: 1 },

  // ── societe-cm ───────────────────────────────────────────────────
  { categoryId: "societe-cm", text: "Combien de groupes ethniques compte environ le Cameroun, souvent qualifié de « puzzle ethnique » d'Afrique ?", options: ["Une centaine", "Environ 150", "Environ 240", "Plus de 400"], answerIndex: 2 },
  { categoryId: "societe-cm", text: "Quelle proportion approximative de la population camerounaise parle français comme langue officielle, contre 30% pour l'anglais ?", options: ["50%", "60%", "70%", "80%"], answerIndex: 2 },
  { categoryId: "societe-cm", text: "Quelle était approximativement la population du Cameroun en 2023 ?", options: ["Environ 18 millions", "Environ 23 millions", "Environ 28 millions", "Environ 34 millions"], answerIndex: 2 },
  { categoryId: "societe-cm", text: "Les langues nationales camerounaises appartiennent à combien de grandes familles linguistiques africaines ?", options: ["2", "3", "4", "5"], answerIndex: 2 },
  { categoryId: "societe-cm", text: "Quel groupe ethnique musulman, aussi appelé Foulbé, domine politiquement les chefferies traditionnelles du nord du Cameroun ?", options: ["Bamiléké", "Peul", "Douala", "Bassa"], answerIndex: 1 },

  // ── gastronomie-cm ───────────────────────────────────────────────
  { categoryId: "gastronomie-cm", text: "Le kondrè, plat à base de banane plantain verte et de viande de chèvre, est originaire de quelle région du Cameroun ?", options: ["Région du Centre", "Région de l'Ouest", "Région du Littoral", "Région du Nord"], answerIndex: 1 },
  { categoryId: "gastronomie-cm", text: "Le Poulet DG était à l'origine un plat conçu pour impressionner qui, avant de se démocratiser ?", options: ["Les touristes étrangers", "Les hauts dirigeants et cadres", "Les jeunes mariés", "Les chefs traditionnels"], answerIndex: 1 },
];
