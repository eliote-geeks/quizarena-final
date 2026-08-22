// Musique de fond — de VRAIS morceaux (pas des accords synthétisés) :
// retour direct de Paul le 20/08, ce qu'on avait avant "ressemblait à
// un bruit de moteur, pas une mélodie". 4 titres instrumentaux
// libres de droits (Kevin MacLeod / incompetech.com, licence Creative
// Commons Attribution 3.0 — crédité dans le pied de la sidebar,
// §ui/Shell.jsx), compressés et coupés en fondu pour rester légers
// (~2-3,7 Mo chacun, jamais chargés avant le premier geste utilisateur
// ni avant que le morceau précédent ait fini — aucun job réseau
// pendant un duel réel).
//
// Le pouls "action" (question en cours) reste synthétisé : c'est un
// signal rythmique d'urgence, pas une "musique" à proprement parler,
// et rien dans le retour de Paul ne visait cette partie-là.
//
// Trois usages, jamais superposés (routes exclusives) :
//  - "relaxing" (calme) : pendant l'attente et le décompte d'entrée
//    d'un duel — un vrai morceau, tiré au sort (§Duel.jsx).
//  - "action" : pendant qu'une question défile (le chrono tourne) —
//    pouls rythmique synthétisé, sans être agressif (§DESIGN.md §7).
//  - "ambient" : fond sonore pendant qu'on navigue dans le reste de
//    l'appli (accueil, catégories, tournois…) — les 4 titres
//    s'enchaînent dans un ordre mélangé, chacun jusqu'à sa fin
//    naturelle (déjà en fondu de sortie), jamais deux fois de suite le
//    même. Monté une seule fois par §ui/AmbientMusic.jsx (dans Shell,
//    donc jamais actif pendant un vrai duel — Duel.jsx vit hors Shell).

const MUTE_KEY = "qa_music_muted";

// Pistes statiques de fallback (Kevin MacLeod, CC BY 3.0)
const FALLBACK_TRACKS = ["/audio/ambient-1.mp3", "/audio/ambient-2.mp3", "/audio/ambient-3.mp3", "/audio/ambient-4.mp3"];

// Pistes chargées depuis l'API admin — préchargées au premier geste
// utilisateur pour ne pas peser sur les performances initiales.
let _tracksCache = null; // null = pas encore chargé
let _tracksFetching = false;

async function fetchCustomTracks() {
  if (_tracksCache !== null || _tracksFetching) return;
  _tracksFetching = true;
  try {
    const r = await fetch("/api/public/music");
    if (!r.ok) throw new Error("http " + r.status);
    const d = await r.json();
    _tracksCache = { relaxing: [], action: [], ambient: [] };
    for (const t of d.tracks || []) {
      const type = t.type === "action" ? "action" : "relaxing";
      _tracksCache[type].push(t.url);
      if (type === "relaxing") _tracksCache.ambient.push(t.url); // ambient = relaxing
    }
  } catch {
    _tracksCache = {}; // vide → fallback
  } finally {
    _tracksFetching = false;
  }
}

/** Retourne la liste de pistes pour un type donné :
 * si des pistes custom existent, les utilise ; sinon fallback statique. */
function getTracks(kind) {
  const type = kind === "action" ? "action" : kind === "relaxing" ? "relaxing" : "ambient";
  const custom = _tracksCache?.[type];
  if (custom && custom.length > 0) return custom;
  return FALLBACK_TRACKS;
}

// Alias pour l'ancienne variable TRACKS (gardée pour startTrack interne)
const TRACKS = FALLBACK_TRACKS;

let ctx = null;
let master = null;
let current = null; // { kind: "relaxing" | "action" | "ambient", stop(fadeSec) }
let actionTimer = null;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null; // navigateur sans Web Audio : silence, pas d'erreur
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = isMuted() ? 0 : 0.16;
  master.connect(ctx.destination);
  return ctx;
}

export function isMuted() {
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted) {
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  if (master) {
    // Rampe courte plutôt qu'une coupure sèche (clic audible évité),
    // mais quasi-instantanée — le mute doit être perçu comme immédiat.
    master.gain.linearRampToValueAtTime(muted ? 0 : 0.16, (ctx?.currentTime ?? 0) + 0.05);
  }
}

/** Tirage sans répéter deux fois de suite le même titre. */
function pickNextTrackIndex(excludeIndex) {
  if (TRACKS.length <= 1) return 0;
  let i = Math.floor(Math.random() * TRACKS.length);
  while (i === excludeIndex) i = Math.floor(Math.random() * TRACKS.length);
  return i;
}

/** Joue un vrai morceau (fondu d'entrée), enchaîne automatiquement sur
 * un autre à sa fin naturelle — les fichiers ont déjà leur propre fondu
 * de sortie (§scripts hors-projet, ffmpeg), pas besoin d'en rajouter un
 * ici. `kind` distingue juste "relaxing" (duel) d'"ambient" (navigation)
 * pour les gardes no-op de playRelaxing()/playAmbient(). */
function startTrack(kind, index) {
  const c = ensureContext();
  if (!c) return { kind, stop() {} };

  // Lancer le fetch des pistes custom si pas encore fait (sans attendre)
  fetchCustomTracks();

  const tracks = getTracks(kind);
  const audio = new Audio(tracks[index % tracks.length]);
  audio.preload = "auto";
  const node = c.createMediaElementSource(audio);
  const gain = c.createGain();
  gain.gain.value = 0;
  node.connect(gain).connect(master);
  gain.gain.linearRampToValueAtTime(1, c.currentTime + 1.5);
  audio.play().catch(() => {
    /* autoplay refusé (pas de geste récent) — silencieux, pas d'erreur visible */
  });

  const onEnded = () => {
    // Recalculer getTracks au moment de l'enchaînement — les custom
    // tracks auront peut-être chargé depuis que la piste a démarré.
    const nextTracks = getTracks(kind);
    const nextIdx = pickNextTrackIndex(index % nextTracks.length);
    current = startTrack(kind, nextIdx);
  };
  audio.addEventListener("ended", onEnded);

  return {
    kind,
    stop(fadeSec = 1.2) {
      audio.removeEventListener("ended", onEnded);
      const t = c.currentTime;
      gain.gain.linearRampToValueAtTime(0, t + fadeSec);
      setTimeout(() => {
        audio.pause();
        audio.src = ""; // libère le tampon réseau/mémoire du morceau arrêté
      }, (fadeSec + 0.2) * 1000);
    },
  };
}

function startActionPulse() {
  const c = ensureContext();
  if (!c) return { kind: "action", stop() {} };
  const scale = [196.0, 233.08, 261.63, 293.66, 349.23]; // pentatonique, énergique sans dissoner
  const bpm = 128;
  const stepSec = 60 / bpm / 2; // croches
  let stepIndex = 0;
  let alive = true;

  function pluck(time, freq, gainPeak) {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gainPeak, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(g).connect(master);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  function scheduleAhead() {
    if (!alive) return;
    const lookaheadSec = 0.6;
    const now = c.currentTime;
    while (nextStepTime < now + lookaheadSec) {
      // pouls grave sur chaque temps, mélodie légère sur les croches
      const onBeat = stepIndex % 2 === 0;
      if (onBeat) pluck(nextStepTime, 98, 0.16); // pouls sourd (G2)
      pluck(nextStepTime, scale[stepIndex % scale.length], onBeat ? 0.09 : 0.06);
      nextStepTime += stepSec;
      stepIndex++;
    }
    actionTimer = setTimeout(scheduleAhead, 150);
  }

  let nextStepTime = c.currentTime + 0.05;
  scheduleAhead();

  return {
    kind: "action",
    stop() {
      alive = false;
      if (actionTimer) clearTimeout(actionTimer);
    },
  };
}

/** Passe à un vrai morceau calme (attente, décompte) — no-op si déjà actif. */
export function playRelaxing() {
  fetchCustomTracks(); // déclencher si pas encore fait
  if (current?.kind === "relaxing") return;
  current?.stop(0.8);
  const tracks = getTracks("relaxing");
  current = startTrack("relaxing", Math.floor(Math.random() * tracks.length));
}

/** Fond sonore de navigation — vrais morceaux qui s'enchaînent, jamais
 * deux fois de suite le même — no-op si déjà en cours (§ui/AmbientMusic.jsx). */
export function playAmbient() {
  fetchCustomTracks(); // déclencher si pas encore fait
  if (current?.kind === "ambient") return;
  current?.stop(0.8);
  const tracks = getTracks("ambient");
  current = startTrack("ambient", Math.floor(Math.random() * tracks.length));
}

/** Passe à l'ambiance "action" (question en cours, chrono qui tourne). */
export function playAction() {
  if (current?.kind === "action") return;
  current?.stop(0.5);
  current = startActionPulse();
}

/** Coupe toute musique (fin de duel, sortie de l'écran). */
export function stopMusic(fadeSec = 0.6) {
  current?.stop(fadeSec);
  current = null;
}
