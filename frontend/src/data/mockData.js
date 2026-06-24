import {
  Landmark,
  Globe2,
  FlaskConical,
  Film,
  Trophy,
  Music4,
} from "lucide-react";
import { QUESTIONS_BANK } from "./questions";

// Unified palette: amber (#E5A800) is the single accent across all categories.
// Categories are differentiated by ICON, SCENE (PixelScene), and SUBTITLE only.
const AMBER = "#E5A800";

export const CATEGORIES = [
  {
    id: "histoire",
    name: { fr: "Histoire", en: "History" },
    icon: Landmark,
    style: { fr: "Chevalier & Forteresse", en: "Knight & Castle" },
    accent: AMBER,
    questions: QUESTIONS_BANK.histoire.length,
    description: { fr: "Civilisations, batailles, dates clés", en: "Civilizations, battles, key dates" },
  },
  {
    id: "geographie",
    name: { fr: "Géographie", en: "Geography" },
    icon: Globe2,
    style: { fr: "Globe & Radar", en: "Globe & Radar" },
    accent: AMBER,
    questions: QUESTIONS_BANK.geographie.length,
    description: { fr: "Capitales, drapeaux, reliefs", en: "Capitals, flags, terrain" },
  },
  {
    id: "sciences",
    name: { fr: "Sciences", en: "Science" },
    icon: FlaskConical,
    style: { fr: "Atome & Laboratoire", en: "Atom & Lab" },
    accent: AMBER,
    questions: QUESTIONS_BANK.sciences.length,
    description: { fr: "Bio, chimie, physique, espace", en: "Biology, chemistry, physics, space" },
  },
  {
    id: "cinema",
    name: { fr: "Cinéma", en: "Cinema" },
    icon: Film,
    style: { fr: "Bobine & Projecteur", en: "Reel & Spotlight" },
    accent: AMBER,
    questions: QUESTIONS_BANK.cinema.length,
    description: { fr: "Réalisateurs, acteurs, classiques", en: "Directors, actors, classics" },
  },
  {
    id: "sport",
    name: { fr: "Sport", en: "Sport" },
    icon: Trophy,
    style: { fr: "Boxeur & Ring", en: "Boxer & Ring" },
    accent: AMBER,
    questions: QUESTIONS_BANK.sport.length,
    description: { fr: "Football, JO, tennis, NBA", en: "Football, Olympics, tennis, NBA" },
  },
  {
    id: "musique",
    name: { fr: "Musique", en: "Music" },
    icon: Music4,
    style: { fr: "Vinyle & Équaliseur", en: "Vinyl & Equalizer" },
    accent: AMBER,
    questions: QUESTIONS_BANK.musique.length,
    description: { fr: "Rock, classique, pop, hip-hop", en: "Rock, classical, pop, hip-hop" },
  },
];

// Re-export the full questions bank (50+ per category)
export const QUESTIONS = QUESTIONS_BANK;

// Legacy short sample kept for reference (unused)
const _LEGACY_QUESTIONS = {
  histoire: [
    { q: { fr: "En quelle année est tombé le mur de Berlin ?", en: "In what year did the Berlin Wall fall?" }, options: ["1987", "1989", "1991", "1993"], answer: 1 },
    { q: { fr: "Qui était empereur des Français en 1804 ?", en: "Who became Emperor of the French in 1804?" }, options: ["Louis XVI", "Charles X", "Napoléon Bonaparte", "Louis-Philippe"], answer: 2 },
    { q: { fr: "La Magna Carta a été signée en…", en: "When was the Magna Carta signed?" }, options: ["1066", "1215", "1453", "1492"], answer: 1 },
    { q: { fr: "Quelle civilisation a construit Machu Picchu ?", en: "Which civilization built Machu Picchu?" }, options: ["Aztèque", "Maya", "Inca", "Olmèque"], answer: 2 },
    { q: { fr: "La Première Guerre mondiale s'est terminée en…", en: "WWI ended in…" }, options: ["1916", "1917", "1918", "1919"], answer: 2 },
  ],
  geographie: [
    { q: { fr: "Capitale de l'Australie ?", en: "Capital of Australia?" }, options: ["Sydney", "Melbourne", "Canberra", "Perth"], answer: 2 },
    { q: { fr: "Le plus long fleuve du monde ?", en: "Longest river in the world?" }, options: ["Amazone", "Nil", "Yangtsé", "Mississippi"], answer: 1 },
    { q: { fr: "Combien de pays composent l'UE en 2024 ?", en: "How many countries are in the EU in 2024?" }, options: ["25", "27", "28", "30"], answer: 1 },
    { q: { fr: "Le mont Everest se trouve dans…", en: "Mount Everest is in…" }, options: ["Alpes", "Andes", "Himalaya", "Rocheuses"], answer: 2 },
    { q: { fr: "Quel océan borde la Californie ?", en: "Which ocean borders California?" }, options: ["Atlantique", "Pacifique", "Indien", "Arctique"], answer: 1 },
  ],
  sciences: [
    { q: { fr: "Symbole chimique de l'or ?", en: "Chemical symbol for gold?" }, options: ["Ag", "Au", "Go", "Gd"], answer: 1 },
    { q: { fr: "Vitesse de la lumière (approx.) ?", en: "Speed of light (approx.)?" }, options: ["3×10⁵ m/s", "3×10⁶ m/s", "3×10⁸ m/s", "3×10¹⁰ m/s"], answer: 2 },
    { q: { fr: "L'ADN contient combien de bases ?", en: "How many bases does DNA have?" }, options: ["2", "3", "4", "5"], answer: 2 },
    { q: { fr: "Plus grande planète du système solaire ?", en: "Largest planet in the solar system?" }, options: ["Mars", "Jupiter", "Saturne", "Neptune"], answer: 1 },
    { q: { fr: "Théorie d'Einstein ?", en: "Einstein's theory?" }, options: ["Évolution", "Gravitation", "Relativité", "Quantique"], answer: 2 },
  ],
  cinema: [
    { q: { fr: "Qui a réalisé Pulp Fiction ?", en: "Who directed Pulp Fiction?" }, options: ["Scorsese", "Tarantino", "Coppola", "Nolan"], answer: 1 },
    { q: { fr: "Film Palme d'Or à Cannes 2019 ?", en: "Palme d'Or 2019?" }, options: ["Parasite", "Joker", "1917", "Roma"], answer: 0 },
    { q: { fr: "Quel acteur joue Iron Man ?", en: "Who plays Iron Man?" }, options: ["Chris Evans", "Robert Downey Jr.", "Tom Holland", "Mark Ruffalo"], answer: 1 },
    { q: { fr: "Studio derrière 'Le Voyage de Chihiro' ?", en: "Studio behind 'Spirited Away'?" }, options: ["Pixar", "Ghibli", "Disney", "DreamWorks"], answer: 1 },
    { q: { fr: "Année de sortie du premier Star Wars ?", en: "Release year of the first Star Wars?" }, options: ["1975", "1977", "1980", "1983"], answer: 1 },
  ],
  sport: [
    { q: { fr: "Combien de joueurs dans une équipe de foot ?", en: "How many players in a football team?" }, options: ["10", "11", "12", "9"], answer: 1 },
    { q: { fr: "Pays organisateur des JO 2024 ?", en: "Host country of the 2024 Olympics?" }, options: ["Japon", "France", "USA", "Australie"], answer: 1 },
    { q: { fr: "Sport pratiqué à Wimbledon ?", en: "Sport at Wimbledon?" }, options: ["Golf", "Tennis", "Cricket", "Rugby"], answer: 1 },
    { q: { fr: "Combien de Ballons d'Or pour Messi ?", en: "How many Ballons d'Or for Messi?" }, options: ["6", "7", "8", "9"], answer: 2 },
    { q: { fr: "Nom de la course cycliste mythique en France ?", en: "Mythic French cycling race?" }, options: ["Vuelta", "Giro", "Tour de France", "Paris-Roubaix"], answer: 2 },
  ],
  musique: [
    { q: { fr: "Combien de membres dans les Beatles ?", en: "How many Beatles?" }, options: ["3", "4", "5", "6"], answer: 1 },
    { q: { fr: "Compositeur de la 9ème symphonie ?", en: "Composer of the 9th symphony?" }, options: ["Mozart", "Bach", "Beethoven", "Chopin"], answer: 2 },
    { q: { fr: "Genre musical né en Jamaïque ?", en: "Music genre born in Jamaica?" }, options: ["Reggae", "Salsa", "Samba", "Jazz"], answer: 0 },
    { q: { fr: "Instrument à 88 touches ?", en: "Instrument with 88 keys?" }, options: ["Orgue", "Piano", "Clavecin", "Synthé"], answer: 1 },
    { q: { fr: "Année du Woodstock original ?", en: "Original Woodstock year?" }, options: ["1967", "1969", "1971", "1973"], answer: 1 },
  ],
};

export const TOP_PLAYERS = [
  { id: 1, name: "NeoQuiz", avatar: "NQ", level: 47, xp: 23400, wins: 312, games: 410, winRate: 76, earnings: 184500, country: "FR", streak: 14 },
  { id: 2, name: "PixelMind", avatar: "PM", level: 44, xp: 21000, wins: 289, games: 398, winRate: 73, earnings: 162300, country: "JP", streak: 9 },
  { id: 3, name: "CipherQueen", avatar: "CQ", level: 42, xp: 19800, wins: 271, games: 380, winRate: 71, earnings: 154200, country: "US", streak: 11 },
  { id: 4, name: "QuantumKid", avatar: "QK", level: 40, xp: 18200, wins: 254, games: 372, winRate: 68, earnings: 142800, country: "DE", streak: 7 },
  { id: 5, name: "ArcadeKing", avatar: "AK", level: 38, xp: 16900, wins: 238, games: 364, winRate: 65, earnings: 131400, country: "BR", streak: 6 },
  { id: 6, name: "NovaSpark", avatar: "NS", level: 36, xp: 15700, wins: 221, games: 350, winRate: 63, earnings: 122100, country: "ES", streak: 5 },
  { id: 7, name: "ByteGhost", avatar: "BG", level: 34, xp: 14500, wins: 205, games: 340, winRate: 60, earnings: 113000, country: "GB", streak: 4 },
  { id: 8, name: "OrbitFox", avatar: "OF", level: 33, xp: 13800, wins: 192, games: 330, winRate: 58, earnings: 105600, country: "CA", streak: 3 },
  { id: 9, name: "ZenithRay", avatar: "ZR", level: 31, xp: 12400, wins: 178, games: 320, winRate: 56, earnings: 97800, country: "KR", streak: 4 },
  { id: 10, name: "EchoVoid", avatar: "EV", level: 29, xp: 11200, wins: 162, games: 308, winRate: 53, earnings: 89500, country: "IT", streak: 2 },
];

export const LIVE_MATCHES = [
  { id: "lm1", category: "geographie", players: ["NeoQuiz", "PixelMind"], pool: 4800, round: 7, total: 10 },
  { id: "lm2", category: "cinema", players: ["CipherQueen", "QuantumKid"], pool: 3200, round: 4, total: 10 },
  { id: "lm3", category: "sciences", players: ["ArcadeKing", "NovaSpark"], pool: 6500, round: 8, total: 10 },
  { id: "lm4", category: "sport", players: ["ByteGhost", "OrbitFox"], pool: 2100, round: 2, total: 10 },
];

export const ACTIVE_DUELS = [
  { id: "d1", category: "histoire", host: "QuantumKid", stake: 500, startsIn: "00:42" },
  { id: "d2", category: "musique", host: "EchoVoid", stake: 1200, startsIn: "01:18" },
  { id: "d3", category: "geographie", host: "ZenithRay", stake: 250, startsIn: "00:25" },
  { id: "d4", category: "cinema", host: "ArcadeKing", stake: 2500, startsIn: "02:05" },
];

export const TOURNAMENTS = [
  {
    id: "t1",
    name: { fr: "Coupe des Cerveaux", en: "Brain Cup" },
    category: "histoire",
    entryFee: 500,
    slots: 16,
    registered: 12,
    prizePool: 8000,
    startsIn: "00:14:32",
  },
  {
    id: "t2",
    name: { fr: "Néon Showdown", en: "Neon Showdown" },
    category: "sciences",
    entryFee: 1000,
    slots: 32,
    registered: 28,
    prizePool: 32000,
    startsIn: "01:42:08",
  },
  {
    id: "t3",
    name: { fr: "Master Cinéphile", en: "Cinephile Master" },
    category: "cinema",
    entryFee: 250,
    slots: 16,
    registered: 9,
    prizePool: 4000,
    startsIn: "03:08:55",
  },
];

export const BRACKET = {
  rounds: [
    {
      label: "round1",
      matches: [
        { a: "NeoQuiz", b: "PixelMind", aScore: 8, bScore: 6, winner: "a" },
        { a: "CipherQueen", b: "QuantumKid", aScore: 7, bScore: 9, winner: "b" },
        { a: "ArcadeKing", b: "NovaSpark", aScore: 9, bScore: 5, winner: "a" },
        { a: "ByteGhost", b: "OrbitFox", aScore: 6, bScore: 8, winner: "b" },
        { a: "ZenithRay", b: "EchoVoid", aScore: 8, bScore: 7, winner: "a" },
        { a: "GlitchOwl", b: "VortexNyx", aScore: 5, bScore: 9, winner: "b" },
        { a: "AtomBlitz", b: "RogueAxis", aScore: 9, bScore: 8, winner: "a" },
        { a: "ShadowHex", b: "LumaCore", aScore: 7, bScore: 8, winner: "b" },
      ],
    },
    {
      label: "round2",
      matches: [
        { a: "NeoQuiz", b: "QuantumKid", aScore: 9, bScore: 7, winner: "a" },
        { a: "ArcadeKing", b: "OrbitFox", aScore: 8, bScore: 9, winner: "b" },
        { a: "ZenithRay", b: "VortexNyx", aScore: 7, bScore: 8, winner: "b" },
        { a: "AtomBlitz", b: "LumaCore", aScore: 9, bScore: 6, winner: "a" },
      ],
    },
    {
      label: "round3",
      matches: [
        { a: "NeoQuiz", b: "OrbitFox", aScore: 8, bScore: 7, winner: "a" },
        { a: "VortexNyx", b: "AtomBlitz", aScore: 6, bScore: 9, winner: "b" },
      ],
    },
    {
      label: "round4",
      matches: [
        { a: "NeoQuiz", b: "AtomBlitz", aScore: null, bScore: null, winner: null },
      ],
    },
  ],
};

export const TRANSACTIONS = [
  { id: "tx1", type: "win", amount: 1200, date: "2026-02-12 21:42", status: "ok", meta: "Duel — Cinéma" },
  { id: "tx2", type: "loss", amount: -500, date: "2026-02-12 20:18", status: "ok", meta: "Duel — Histoire" },
  { id: "tx3", type: "win", amount: 3200, date: "2026-02-11 23:05", status: "ok", meta: "Tournoi — Néon Showdown" },
  { id: "tx4", type: "entry", amount: -1000, date: "2026-02-11 22:00", status: "ok", meta: "Entrée Tournoi" },
  { id: "tx5", type: "win", amount: 740, date: "2026-02-10 19:35", status: "ok", meta: "Solo — Sciences" },
  { id: "tx6", type: "deposit", amount: 5000, date: "2026-02-09 12:10", status: "ok", meta: "Dépôt initial" },
  { id: "tx7", type: "loss", amount: -250, date: "2026-02-08 21:20", status: "ok", meta: "Duel — Sport" },
  { id: "tx8", type: "win", amount: 980, date: "2026-02-07 18:45", status: "ok", meta: "Solo — Musique" },
];

export const USER_PROFILE = {
  name: "ArenaCadet",
  avatar: "AC",
  level: 18,
  xp: 6420,
  xpNext: 8000,
  wins: 84,
  games: 142,
  winRate: 59,
  bestStreak: 7,
  joined: "2025-11-04",
  badges: [
    { id: "b1", name: { fr: "Premier sang", en: "First Blood" }, icon: "swords" },
    { id: "b2", name: { fr: "Cerveau d'acier", en: "Steel Brain" }, icon: "brain" },
    { id: "b3", name: { fr: "Vitesse lumière", en: "Light Speed" }, icon: "zap" },
    { id: "b4", name: { fr: "Sans faute", en: "Flawless" }, icon: "star" },
    { id: "b5", name: { fr: "Champion", en: "Champion" }, icon: "crown" },
    { id: "b6", name: { fr: "Stratège", en: "Strategist" }, icon: "target" },
  ],
  categoryPerf: [
    { id: "histoire", rate: 72 },
    { id: "geographie", rate: 65 },
    { id: "sciences", rate: 48 },
    { id: "cinema", rate: 81 },
    { id: "sport", rate: 53 },
    { id: "musique", rate: 67 },
  ],
  recent: [
    { mode: "Duel", category: "cinema", result: "win", delta: 1200 },
    { mode: "Solo", category: "sciences", result: "win", delta: 540 },
    { mode: "Duel", category: "histoire", result: "loss", delta: -500 },
    { mode: "Tournoi", category: "geographie", result: "win", delta: 3200 },
    { mode: "Solo", category: "musique", result: "win", delta: 380 },
  ],
};

export const TOP_WINNERS_MARQUEE = [
  { name: "NeoQuiz", amount: 4800, category: "geographie" },
  { name: "PixelMind", amount: 3200, category: "cinema" },
  { name: "CipherQueen", amount: 6500, category: "sciences" },
  { name: "QuantumKid", amount: 2100, category: "sport" },
  { name: "ArcadeKing", amount: 1800, category: "histoire" },
  { name: "EchoVoid", amount: 980, category: "musique" },
  { name: "VortexNyx", amount: 5400, category: "geographie" },
  { name: "AtomBlitz", amount: 3700, category: "sciences" },
];

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);

export const CATEGORY_COLORS = {
  histoire:   "#FF6B6B",
  geographie: "#26de81",
  sciences:   "#45aaf2",
  cinema:     "#fd9644",
  sport:      "#a55eea",
  musique:    "#2bcbba",
};

export const ONLINE_PLAYERS = [
  { name: "NeoQuiz",    elo: 1580, status: "lobby",  avatar: "NQ", room: "histoire"   },
  { name: "AtomBlitz",  elo: 1820, status: "lobby",  avatar: "AB", room: "sciences"   },
  { name: "CipherQueen",elo: 1420, status: "ingame", avatar: "CQ", room: "cinema"     },
  { name: "VortexNyx",  elo: 1480, status: "lobby",  avatar: "VN", room: "geographie" },
  { name: "ZenithRay",  elo: 1650, status: "lobby",  avatar: "ZR", room: "histoire"   },
  { name: "EchoVoid",   elo: 1230, status: "ingame", avatar: "EV", room: "musique"    },
  { name: "NovaSpark",  elo: 980,  status: "lobby",  avatar: "NS", room: "sciences"   },
  { name: "QuantumKid", elo: 1120, status: "lobby",  avatar: "QK", room: "sport"      },
  { name: "GlitchOwl",  elo: 890,  status: "ingame", avatar: "GO", room: "sport"      },
  { name: "LumaCore",   elo: 1150, status: "away",   avatar: "LC", room: "geographie" },
  { name: "PixelMind",  elo: 1340, status: "lobby",  avatar: "PM", room: "cinema"     },
  { name: "OrbitFox",   elo: 1060, status: "lobby",  avatar: "OF", room: "histoire"   },
];

export const ALL_REPLAYS = [
  {
    id: "rp1", tournament: "Néon Showdown", round: "Quarts de finale",
    date: "2026-06-21", playerA: "NeoQuiz", eloA: 1580, scoreA: 9,
    playerB: "QuantumKid", eloB: 1120, scoreB: 7, category: "sciences", duration: "4m32s",
    results: [
      { a: true,  b: false, timeA: 6.2,  timeB: null  },
      { a: true,  b: true,  timeA: 4.1,  timeB: 11.3  },
      { a: false, b: true,  timeA: null, timeB: 7.8   },
      { a: true,  b: false, timeA: 3.4,  timeB: null  },
      { a: true,  b: true,  timeA: 8.9,  timeB: 9.1   },
      { a: true,  b: false, timeA: 2.8,  timeB: null  },
      { a: false, b: true,  timeA: null, timeB: 5.5   },
      { a: true,  b: true,  timeA: 7.2,  timeB: 12.4  },
      { a: true,  b: true,  timeA: 4.8,  timeB: 8.9   },
      { a: true,  b: true,  timeA: 11.1, timeB: 9.7   },
    ],
  },
  {
    id: "rp2", tournament: "Coupe des Cerveaux", round: "Demis-finale",
    date: "2026-06-20", playerA: "AtomBlitz", eloA: 1820, scoreA: 8,
    playerB: "NovaSpark", eloB: 980, scoreB: 5, category: "histoire", duration: "5m11s",
    results: [
      { a: true,  b: true,  timeA: 5.1,  timeB: 13.2  },
      { a: true,  b: false, timeA: 3.9,  timeB: null  },
      { a: false, b: false, timeA: null, timeB: null  },
      { a: true,  b: true,  timeA: 8.4,  timeB: 10.1  },
      { a: true,  b: false, timeA: 6.3,  timeB: null  },
      { a: false, b: true,  timeA: null, timeB: 7.9   },
      { a: true,  b: false, timeA: 4.7,  timeB: null  },
      { a: true,  b: true,  timeA: 9.2,  timeB: 11.8  },
      { a: true,  b: false, timeA: 2.1,  timeB: null  },
      { a: false, b: true,  timeA: null, timeB: 6.4   },
    ],
  },
  {
    id: "rp3", tournament: "Master Cinéphile", round: "1/8 de finale",
    date: "2026-06-19", playerA: "CipherQueen", eloA: 1420, scoreA: 6,
    playerB: "OrbitFox", eloB: 1060, scoreB: 8, category: "cinema", duration: "6m05s",
    results: [
      { a: false, b: true,  timeA: null, timeB: 5.3   },
      { a: true,  b: true,  timeA: 7.8,  timeB: 9.2   },
      { a: true,  b: true,  timeA: 4.2,  timeB: 11.0  },
      { a: false, b: false, timeA: null, timeB: null  },
      { a: true,  b: true,  timeA: 6.9,  timeB: 8.4   },
      { a: false, b: true,  timeA: null, timeB: 6.7   },
      { a: true,  b: false, timeA: 3.5,  timeB: null  },
      { a: true,  b: true,  timeA: 8.1,  timeB: 7.6   },
      { a: false, b: true,  timeA: null, timeB: 4.8   },
      { a: true,  b: false, timeA: 12.3, timeB: null  },
    ],
  },
  {
    id: "rp4", tournament: "Globe Masters", round: "Finale",
    date: "2026-06-18", playerA: "ZenithRay", eloA: 1650, scoreA: 10,
    playerB: "VortexNyx", eloB: 1480, scoreB: 8, category: "geographie", duration: "3m58s",
    results: [
      { a: true,  b: true,  timeA: 3.1,  timeB: 9.4   },
      { a: true,  b: false, timeA: 5.7,  timeB: null  },
      { a: true,  b: true,  timeA: 4.2,  timeB: 7.1   },
      { a: true,  b: false, timeA: 2.9,  timeB: null  },
      { a: false, b: true,  timeA: null, timeB: 6.3   },
      { a: true,  b: true,  timeA: 6.8,  timeB: 11.2  },
      { a: true,  b: false, timeA: 3.4,  timeB: null  },
      { a: true,  b: true,  timeA: 5.5,  timeB: 8.8   },
      { a: true,  b: false, timeA: 7.2,  timeB: null  },
      { a: true,  b: true,  timeA: 4.1,  timeB: 9.7   },
    ],
  },
  {
    id: "rp5", tournament: "Arena Sport", round: "Quarts",
    date: "2026-06-17", playerA: "ByteGhost", eloA: 1180, scoreA: 7,
    playerB: "LumaCore", eloB: 1150, scoreB: 9, category: "sport", duration: "5m44s",
    results: [
      { a: false, b: true,  timeA: null, timeB: 4.8   },
      { a: true,  b: true,  timeA: 8.3,  timeB: 6.2   },
      { a: true,  b: true,  timeA: 5.1,  timeB: 9.9   },
      { a: false, b: false, timeA: null, timeB: null  },
      { a: true,  b: true,  timeA: 7.6,  timeB: 5.5   },
      { a: true,  b: true,  timeA: 3.9,  timeB: 8.1   },
      { a: true,  b: false, timeA: 6.4,  timeB: null  },
      { a: false, b: true,  timeA: null, timeB: 7.3   },
      { a: true,  b: true,  timeA: 9.2,  timeB: 11.0  },
      { a: false, b: true,  timeA: null, timeB: 6.8   },
    ],
  },
  {
    id: "rp6", tournament: "Duel Libre", round: "Match simple",
    date: "2026-06-16", playerA: "EchoVoid", eloA: 1230, scoreA: 8,
    playerB: "GlitchOwl", eloB: 890, scoreB: 5, category: "musique", duration: "4m19s",
    results: [
      { a: true,  b: false, timeA: 4.5,  timeB: null  },
      { a: true,  b: true,  timeA: 7.2,  timeB: 13.1  },
      { a: false, b: false, timeA: null, timeB: null  },
      { a: true,  b: true,  timeA: 5.8,  timeB: 9.4   },
      { a: true,  b: false, timeA: 3.2,  timeB: null  },
      { a: false, b: true,  timeA: null, timeB: 8.7   },
      { a: true,  b: false, timeA: 6.1,  timeB: null  },
      { a: true,  b: false, timeA: 4.9,  timeB: null  },
      { a: true,  b: true,  timeA: 7.8,  timeB: 10.6  },
      { a: false, b: false, timeA: null, timeB: null  },
    ],
  },
];

export const REPLAYS = [
  {
    id: "rp1", tournament: "Néon Showdown", round: "Quarts de finale",
    date: "2026-06-21", playerA: "NeoQuiz", eloA: 1580, scoreA: 9,
    playerB: "QuantumKid", eloB: 1120, scoreB: 7, category: "sciences", duration: "4m32s",
    results: [
      { a: true,  b: false, timeA: 6.2,  timeB: null  },
      { a: true,  b: true,  timeA: 4.1,  timeB: 11.3  },
      { a: false, b: true,  timeA: null, timeB: 7.8   },
      { a: true,  b: false, timeA: 3.4,  timeB: null  },
      { a: true,  b: true,  timeA: 8.9,  timeB: 9.1   },
      { a: true,  b: false, timeA: 2.8,  timeB: null  },
      { a: false, b: true,  timeA: null, timeB: 5.5   },
      { a: true,  b: true,  timeA: 7.2,  timeB: 12.4  },
      { a: true,  b: true,  timeA: 4.8,  timeB: 8.9   },
      { a: true,  b: true,  timeA: 11.1, timeB: 9.7   },
    ],
  },
  {
    id: "rp2", tournament: "Coupe des Cerveaux", round: "Demis-finale",
    date: "2026-06-20", playerA: "AtomBlitz", eloA: 1820, scoreA: 8,
    playerB: "NovaSpark", eloB: 980, scoreB: 5, category: "histoire", duration: "5m11s",
    results: [
      { a: true,  b: true,  timeA: 5.1,  timeB: 13.2  },
      { a: true,  b: false, timeA: 3.9,  timeB: null  },
      { a: false, b: false, timeA: null, timeB: null  },
      { a: true,  b: true,  timeA: 8.4,  timeB: 10.1  },
      { a: true,  b: false, timeA: 6.3,  timeB: null  },
      { a: false, b: true,  timeA: null, timeB: 7.9   },
      { a: true,  b: false, timeA: 4.7,  timeB: null  },
      { a: true,  b: true,  timeA: 9.2,  timeB: 11.8  },
      { a: true,  b: false, timeA: 2.1,  timeB: null  },
      { a: false, b: true,  timeA: null, timeB: 6.4   },
    ],
  },
  {
    id: "rp3", tournament: "Master Cinéphile", round: "1/8 de finale",
    date: "2026-06-19", playerA: "CipherQueen", eloA: 1420, scoreA: 6,
    playerB: "OrbitFox", eloB: 1060, scoreB: 8, category: "cinema", duration: "6m05s",
    results: [
      { a: false, b: true,  timeA: null, timeB: 5.3   },
      { a: true,  b: true,  timeA: 7.8,  timeB: 9.2   },
      { a: true,  b: true,  timeA: 4.2,  timeB: 11.0  },
      { a: false, b: false, timeA: null, timeB: null  },
      { a: true,  b: true,  timeA: 6.9,  timeB: 8.4   },
      { a: false, b: true,  timeA: null, timeB: 6.7   },
      { a: true,  b: false, timeA: 3.5,  timeB: null  },
      { a: true,  b: true,  timeA: 8.1,  timeB: 7.6   },
      { a: false, b: true,  timeA: null, timeB: 4.8   },
      { a: true,  b: false, timeA: 12.3, timeB: null  },
    ],
  },
];

// Deterministic player profile generator — same name always gives same stats
export function getMockPlayerProfile(name) {
  let h = 0;
  for (const c of name) h = (((h * 31) >>> 0) + c.charCodeAt(0)) >>> 0;
  const elo = 700 + (h % 1200);
  const games = 60 + ((h >> 4) % 240);
  const winRate = 40 + ((h >> 8) % 40);
  const wins = Math.round(games * winRate / 100);
  const streak = (h >> 12) % 9;
  const categories = ["histoire", "geographie", "sciences", "cinema", "sport", "musique"];
  const favCat = categories[(h >> 16) % 6];
  const yr = 2025 + ((h >> 20) % 2);
  const mo = String(1 + ((h >> 22) % 12)).padStart(2, "0");
  const dy = String(1 + ((h >> 24) % 28)).padStart(2, "0");
  const joined = `${yr}-${mo}-${dy}`;
  const allBadges = [
    { id: "b1", name: { fr: "Premier sang", en: "First Blood" }, icon: "swords" },
    { id: "b2", name: { fr: "Cerveau d'acier", en: "Steel Brain" }, icon: "brain" },
    { id: "b3", name: { fr: "Vitesse lumière", en: "Light Speed" }, icon: "zap" },
    { id: "b4", name: { fr: "Champion", en: "Champion" }, icon: "crown" },
  ];
  const badges = allBadges.slice(0, 1 + (h % 4));
  const categoryPerf = categories.map((id, i) => ({ id, rate: 35 + ((h >> (i * 3)) % 55) }));
  const modes = ["Duel", "Solo", "Duel", "Tournoi", "Duel"];
  const recent = categories.slice(0, 5).map((cat, i) => ({
    mode: modes[i], category: cat,
    result: ((h >> (i * 5)) & 1) ? "win" : "loss",
    delta: ((h >> (i * 5)) & 1) ? (100 + ((h >> (i * 4)) % 1400)) : -(100 + ((h >> (i * 2)) % 600)),
  }));
  return { name, avatar: name.substring(0, 2).toUpperCase(), elo, games, wins, winRate, streak, joined, badges, categoryPerf, recent, favCat };
}
