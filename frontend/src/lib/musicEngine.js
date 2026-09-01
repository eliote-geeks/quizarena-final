// Musique d'ambiance — de VRAIS morceaux, pas des accords synthétisés.
//
// Historique, pour ne pas refaire deux fois la même erreur :
//  • 12/08/2026 — un pad d'ambiance « zen » synthétisé avait été retiré de
//    soundEngine.js, à raison : c'était du remplissage sans direction.
//  • 20/08/2026 — sur l'autre édition, une seconde tentative synthétisée a
//    reçu ce retour sans ambiguïté : « ça ressemblait à un bruit de moteur,
//    pas une mélodie ». La conclusion tenait en une ligne : si on met de la
//    musique, ce sont de vrais morceaux joués par de vrais instruments.
//  • 30/08/2026 — demande explicite d'une musique relaxante pendant les
//    parties, avec plusieurs morceaux. On reprend donc les 4 titres
//    instrumentaux déjà utilisés et validés côté v2.
//
// Quatre titres de Kevin MacLeod (incompetech.com), licence Creative
// Commons Attribution 3.0. L'attribution est obligatoire : elle est
// affichée dans les mentions légales, §pages/legal.
//
// Trois règles qui comptent sur une appli d'argent réel :
//  1. Aucun octet audio n'est téléchargé avant un vrai geste utilisateur —
//     pas question de consommer le forfait data de quelqu'un sans qu'il ait
//     rien demandé, ni de lancer une requête réseau pendant un duel misé.
//  2. Le volume baisse automatiquement pendant qu'une question est à
//     l'écran : la musique ne doit jamais couvrir les sons de jeu qui, eux,
//     portent de l'information (bonne/mauvaise réponse, urgence du chrono).
//  3. Le choix de couper est mémorisé et respecté au rechargement.

const TRACKS = [
  { url: "/audio/ambient-1.mp3", title: "Ambiance 1" },
  { url: "/audio/ambient-2.mp3", title: "Ambiance 2" },
  { url: "/audio/ambient-3.mp3", title: "Ambiance 3" },
  { url: "/audio/ambient-4.mp3", title: "Ambiance 4" },
];

const MUTE_KEY = "qa_music_muted";
const BASE_VOLUME = 0.30;   // fond sonore, jamais au premier plan
const DUCKED_VOLUME = 0.10; // pendant une question : présent mais effacé

let audio = null;
let order = [];
let cursor = 0;
let started = false;
let ducked = false;
let fadeFrame = null; // identifiant RAF du fondu en cours, pour l'annuler
const listeners = new Set();

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false; // navigation privée, stockage bloqué : on ne casse rien
  }
}
let muted = readMuted();

function notify() {
  for (const fn of listeners) fn({ muted, playing: Boolean(audio && !audio.paused), title: currentTitle() });
}

/** Ordre mélangé, sans jamais rejouer le même titre deux fois de suite. */
function reshuffle() {
  const last = order[cursor];
  const next = [...TRACKS];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  if (next.length > 1 && last && next[0].url === last.url) {
    [next[0], next[1]] = [next[1], next[0]];
  }
  order = next;
  cursor = 0;
}

function currentTitle() {
  return order[cursor]?.title ?? null;
}

function targetVolume() {
  return ducked ? DUCKED_VOLUME : BASE_VOLUME;
}

/** Fondu court : un changement de volume brutal s'entend plus que la musique.
 *
 * Deux garde-fous ajoutés après un crash constaté en prod
 * (IndexSizeError: volume -0.001285 hors de [0,1]) :
 *  - un fondu en cours est annulé avant d'en démarrer un nouveau — sans ça,
 *    un duck(true) suivi de près par un duck(false) (le cas normal à
 *    chaque fin de question) lançait deux boucles RAF concurrentes qui
 *    écrivaient toutes les deux sur audio.volume à partir de "from" figés
 *    à des instants différents, et pouvaient se chevaucher hors bornes ;
 *  - la valeur assignée est de toute façon bornée [0,1] par sécurité,
 *    quelle qu'en soit la cause exacte. */
function fadeTo(target, ms = 600) {
  if (!audio) return;
  if (fadeFrame !== null) cancelAnimationFrame(fadeFrame);
  const from = audio.volume;
  const start = performance.now();
  const step = (now) => {
    if (!audio) { fadeFrame = null; return; }
    const t = Math.min(1, (now - start) / ms);
    const value = from + (target - from) * t;
    audio.volume = Math.min(1, Math.max(0, value));
    fadeFrame = t < 1 ? requestAnimationFrame(step) : null;
  };
  fadeFrame = requestAnimationFrame(step);
}

function playCurrent() {
  if (!audio || muted) return;
  const track = order[cursor];
  if (!track) return;
  audio.src = track.url;
  audio.volume = 0;
  const p = audio.play();
  if (p && typeof p.catch === "function") {
    // Lecture refusée (pas encore de geste utilisateur) : on n'insiste pas,
    // le prochain clic relancera.
    p.catch(() => {});
  }
  fadeTo(targetVolume(), 1200);
  notify();
}

function advance() {
  cursor += 1;
  if (cursor >= order.length) reshuffle();
  playCurrent();
}

/**
 * Démarre la musique. À n'appeler que depuis un vrai geste utilisateur :
 * c'est la condition posée par les navigateurs, et c'est aussi la seule
 * façon honnête de ne pas déclencher un téléchargement non sollicité.
 */
export function startMusic() {
  if (started || muted) return;
  started = true;
  reshuffle();
  audio = new Audio();
  audio.preload = "none";
  audio.addEventListener("ended", advance);
  // Un fichier illisible ne doit pas bloquer la file : on passe au suivant.
  audio.addEventListener("error", advance);
  playCurrent();
}

export function stopMusic() {
  if (!audio) return;
  audio.pause();
  audio.removeEventListener("ended", advance);
  audio.removeEventListener("error", advance);
  audio = null;
  started = false;
  notify();
}

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* stockage indisponible : le choix vaut pour la session en cours */
  }
  if (muted) stopMusic();
  else startMusic();
  notify();
  return muted;
}

export function isMuted() {
  return muted;
}

/** Baisse le volume pendant qu'une question est affichée (§règle 2). */
export function duck(on) {
  if (ducked === on) return;
  ducked = on;
  if (audio) fadeTo(targetVolume(), 400);
}

export function subscribe(fn) {
  listeners.add(fn);
  fn({ muted, playing: Boolean(audio && !audio.paused), title: currentTitle() });
  return () => listeners.delete(fn);
}

/** Passe au titre suivant à la demande. */
export function skipTrack() {
  if (!audio || muted) return;
  advance();
}

export const MUSIC_CREDIT =
  "Musique : Kevin MacLeod (incompetech.com) — Creative Commons Attribution 3.0";
