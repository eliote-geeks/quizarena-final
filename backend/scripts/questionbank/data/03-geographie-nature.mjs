// Géographie et nature — intemporel. Attention permanente aux superlatifs :
// « le plus grand » n'est acceptable que sur un fait stable (le Nil, l'Everest),
// jamais sur un classement qui bouge (population d'une ville, PIB).

const W = (page) => `https://fr.wikipedia.org/wiki/${page}`;

export default [
  // ── Géographie ─────────────────────────────────────────────────────
  { categoryId: "geographie", subcategory: "afrique", textFr: "Quel pays africain est entièrement entouré par le territoire de l'Afrique du Sud ?", options: ["Le Lesotho", "L'Eswatini", "Le Botswana", "Le Malawi"], answerIndex: 0, sourceUrl: W("Lesotho") },
  { categoryId: "geographie", subcategory: "afrique", textFr: "Quel est le point culminant du continent africain ?", options: ["Le Kilimandjaro", "Le mont Kenya", "Le mont Cameroun", "Le Ruwenzori"], answerIndex: 0, sourceUrl: W("Kilimandjaro") },
  { categoryId: "geographie", subcategory: "afrique", textFr: "Quelle est la capitale politique du Cameroun ?", options: ["Yaoundé", "Douala", "Bafoussam", "Garoua"], answerIndex: 0, sourceUrl: W("Yaound%C3%A9") },
  { categoryId: "geographie", subcategory: "afrique", textFr: "Quel volcan actif domine la côte camerounaise près de Buea ?", options: ["Le mont Cameroun", "Le Nyiragongo", "Le mont Elgon", "Le Karthala"], answerIndex: 0, sourceUrl: W("Mont_Cameroun") },
  { categoryId: "geographie", subcategory: "afrique", textFr: "Quel lac d'Afrique centrale a fortement rétréci depuis les années 1960 ?", options: ["Le lac Tchad", "Le lac Victoria", "Le lac Tanganyika", "Le lac Malawi"], answerIndex: 0, sourceUrl: W("Lac_Tchad") },
  { categoryId: "geographie", subcategory: "afrique", textFr: "Quel fleuve traverse Le Caire avant de se jeter en Méditerranée ?", options: ["Le Nil", "Le Congo", "Le Niger", "Le Zambèze"], answerIndex: 0, sourceUrl: W("Nil") },
  { categoryId: "geographie", subcategory: "afrique", textFr: "Quelles chutes du Zambèze sont appelées localement « la fumée qui gronde » ?", options: ["Les chutes Victoria", "Les chutes de la Lofoï", "Les chutes Murchison", "Les chutes de Tugela"], answerIndex: 0, sourceUrl: W("Chutes_Victoria") },
  { categoryId: "geographie", subcategory: "afrique", textFr: "Quel désert couvre la majeure partie de l'Afrique du Nord ?", options: ["Le Sahara", "Le Kalahari", "Le Namib", "Le désert du Danakil"], answerIndex: 0, sourceUrl: W("Sahara") },
  { categoryId: "geographie", subcategory: "afrique", textFr: "Quel est le port principal et la capitale économique du Cameroun ?", options: ["Douala", "Kribi", "Limbé", "Yaoundé"], answerIndex: 0, sourceUrl: W("Douala") },
  { categoryId: "geographie", subcategory: "afrique", textFr: "Combien de régions administratives compte le Cameroun ?", options: ["Dix", "Huit", "Douze", "Six"], answerIndex: 0, sourceUrl: W("R%C3%A9gions_du_Cameroun") },

  { categoryId: "geographie", subcategory: "monde", textFr: "Quel désert s'étend principalement au nord du Chili ?", options: ["L'Atacama", "Le Kalahari", "Le Namib", "Le Gobi"], answerIndex: 0, sourceUrl: W("D%C3%A9sert_d%27Atacama") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quelle chaîne de montagnes sépare l'Europe de l'Asie à l'est de la Russie ?", options: ["L'Oural", "Le Caucase", "Les Carpates", "L'Altaï"], answerIndex: 0, sourceUrl: W("Oural") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quel pays compte le plus grand nombre de fuseaux horaires officiels ?", options: ["La France", "La Russie", "Les États-Unis", "La Chine"], answerIndex: 0, sourceUrl: W("Heure_en_France") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quel détroit sépare l'Europe de l'Afrique à son point le plus étroit ?", options: ["Gibraltar", "Le Bosphore", "Bab el-Mandeb", "Le Pas de Calais"], answerIndex: 0, sourceUrl: W("D%C3%A9troit_de_Gibraltar") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quelle mer fermée est le point le plus bas émergé du globe ?", options: ["La mer Morte", "La mer Caspienne", "La mer d'Aral", "Le lac Baïkal"], answerIndex: 0, sourceUrl: W("Mer_Morte") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quel canal relie la Méditerranée à la mer Rouge ?", options: ["Le canal de Suez", "Le canal de Panama", "Le canal de Kiel", "Le canal de Corinthe"], answerIndex: 0, sourceUrl: W("Canal_de_Suez") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quelle est la capitale de l'Australie ?", options: ["Canberra", "Sydney", "Melbourne", "Brisbane"], answerIndex: 0, sourceUrl: W("Canberra") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quel lac d'eau douce est le plus profond du monde ?", options: ["Le lac Baïkal", "Le lac Supérieur", "Le lac Tanganyika", "Le lac Titicaca"], answerIndex: 0, sourceUrl: W("Lac_Ba%C3%AFkal") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quelle cordillère longe toute la côte ouest de l'Amérique du Sud ?", options: ["Les Andes", "Les Rocheuses", "L'Himalaya", "Les Appalaches"], answerIndex: 0, sourceUrl: W("Cordill%C3%A8re_des_Andes") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quel pays possède la plus longue façade côtière du monde ?", options: ["Le Canada", "La Russie", "L'Indonésie", "L'Australie"], answerIndex: 0, sourceUrl: W("Canada") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quelle île est la plus grande du monde, hors continents ?", options: ["Le Groenland", "La Nouvelle-Guinée", "Bornéo", "Madagascar"], answerIndex: 0, sourceUrl: W("Groenland") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quel fleuve traverse Paris ?", options: ["La Seine", "La Loire", "Le Rhône", "La Garonne"], answerIndex: 0, sourceUrl: W("Seine") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quelle est la capitale du Japon ?", options: ["Tokyo", "Osaka", "Kyoto", "Nagoya"], answerIndex: 0, sourceUrl: W("Tokyo") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quel pays d'Amérique du Sud a le portugais pour langue officielle ?", options: ["Le Brésil", "L'Argentine", "La Colombie", "Le Pérou"], answerIndex: 0, sourceUrl: W("Br%C3%A9sil") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quel sommet culmine à 8 849 mètres, point le plus haut du globe ?", options: ["L'Everest", "Le K2", "Le Kangchenjunga", "L'Annapurna"], answerIndex: 0, sourceUrl: W("Everest") },
  { categoryId: "geographie", subcategory: "monde", textFr: "Quelle ville européenne est traversée par le Danube et surnommée « la perle du Danube » ?", options: ["Budapest", "Vienne", "Belgrade", "Bratislava"], answerIndex: 0, sourceUrl: W("Budapest") },

  // ── Nature ─────────────────────────────────────────────────────────
  { categoryId: "nature", subcategory: "animaux", textFr: "Quel est le plus grand animal vivant sur Terre ?", options: ["La baleine bleue", "L'éléphant de savane", "Le cachalot", "La girafe réticulée"], answerIndex: 0, sourceUrl: W("Rorqual_bleu") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Quel oiseau est le plus rapide du monde en piqué ?", options: ["Le faucon pèlerin", "L'aigle royal", "Le martinet noir", "L'albatros hurleur"], answerIndex: 0, sourceUrl: W("Faucon_p%C3%A8lerin") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Quel mammifère terrestre atteint la plus grande vitesse de pointe ?", options: ["Le guépard", "Le lion", "L'antilope springbok", "Le cheval arabe"], answerIndex: 0, sourceUrl: W("Gu%C3%A9pard") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Combien de cœurs possède une pieuvre ?", options: ["Trois", "Un seul", "Deux", "Cinq"], answerIndex: 0, sourceUrl: W("Pieuvre") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Quel grand singe est le plus proche génétiquement de l'être humain ?", options: ["Le bonobo", "Le gorille des montagnes", "L'orang-outan", "Le gibbon"], answerIndex: 0, sourceUrl: W("Bonobo") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Quel animal est le symbole des Lions indomptables du Cameroun ?", options: ["Le lion", "L'éléphant", "La panthère", "L'aigle"], answerIndex: 0, sourceUrl: W("%C3%89quipe_du_Cameroun_de_football") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Quel insecte produit le miel consommé par l'être humain ?", options: ["L'abeille", "Le bourdon", "La guêpe", "La fourmi"], answerIndex: 0, sourceUrl: W("Abeille") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Quel reptile marin revient pondre sur la plage qui l'a vu naître ?", options: ["La tortue marine", "Le crocodile marin", "L'iguane marin", "Le serpent de mer"], answerIndex: 0, sourceUrl: W("Tortue_marine") },
  { categoryId: "nature", subcategory: "animaux", textFr: "Quel oiseau incapable de voler est le plus grand du monde ?", options: ["L'autruche", "Le manchot empereur", "L'émeu", "Le casoar"], answerIndex: 0, sourceUrl: W("Autruche") },

  { categoryId: "nature", subcategory: "plantes", textFr: "Quel processus permet aux plantes de convertir la lumière en énergie chimique ?", options: ["La photosynthèse", "La respiration cellulaire", "La transpiration", "La germination"], answerIndex: 0, sourceUrl: W("Photosynth%C3%A8se") },
  { categoryId: "nature", subcategory: "plantes", textFr: "Quel arbre emblématique du Sahel stocke l'eau dans son tronc massif ?", options: ["Le baobab", "L'acacia", "Le palmier dattier", "Le manguier"], answerIndex: 0, sourceUrl: W("Baobab") },
  { categoryId: "nature", subcategory: "plantes", textFr: "Quelle forêt tropicale est la plus vaste du monde ?", options: ["L'Amazonie", "Le bassin du Congo", "La forêt de Bornéo", "La forêt de Sumatra"], answerIndex: 0, sourceUrl: W("For%C3%AAt_amazonienne") },
  { categoryId: "nature", subcategory: "plantes", textFr: "Quel massif forestier constitue le deuxième poumon vert de la planète, en Afrique centrale ?", options: ["Le bassin du Congo", "Le Serengeti", "Le Sahel arboré", "Le Fouta-Djalon"], answerIndex: 0, sourceUrl: W("For%C3%AAt_du_bassin_du_Congo") },

  { categoryId: "nature", subcategory: "climat", textFr: "Quel gaz est le principal responsable de l'effet de serre lié aux activités humaines ?", options: ["Le dioxyde de carbone", "L'oxygène", "L'azote", "L'argon"], answerIndex: 0, sourceUrl: W("Dioxyde_de_carbone") },
  { categoryId: "nature", subcategory: "climat", textFr: "Quelle couche de l'atmosphère nous protège du rayonnement ultraviolet ?", options: ["La couche d'ozone", "La troposphère", "La ionosphère", "L'exosphère"], answerIndex: 0, sourceUrl: W("Couche_d%27ozone") },
  { categoryId: "nature", subcategory: "climat", textFr: "Comment appelle-t-on un cyclone tropical dans l'océan Pacifique nord-ouest ?", options: ["Un typhon", "Un ouragan", "Une tornade", "Une tempête tropicale"], answerIndex: 0, sourceUrl: W("Cyclone_tropical") },
  { categoryId: "nature", subcategory: "climat", textFr: "Quel phénomène périodique réchauffe les eaux du Pacifique équatorial ?", options: ["El Niño", "La mousson", "Le Gulf Stream", "L'alizé"], answerIndex: 0, sourceUrl: W("El_Ni%C3%B1o") },
  { categoryId: "nature", subcategory: "géologie", textFr: "Quelle échelle mesure la magnitude des séismes ?", options: ["L'échelle de Richter", "L'échelle de Beaufort", "L'échelle de Mohs", "L'échelle de Celsius"], answerIndex: 0, sourceUrl: W("%C3%89chelle_de_Richter") },
  { categoryId: "nature", subcategory: "géologie", textFr: "Quel minéral occupe le rang le plus élevé de dureté sur l'échelle de Mohs ?", options: ["Le diamant", "Le quartz", "Le corindon", "La topaze"], answerIndex: 0, sourceUrl: W("%C3%89chelle_de_Mohs") },
];
