// Notification "adversaire trouvé" — fanfare audio synthétisée (Web Audio)
// + voix Web Speech API + notification navigateur native quand l'onglet
// n'est pas au premier plan.

let ctx = null;
function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/**
 * Fanfare 5 notes — montante et claire, impossible à confondre avec la
 * musique d'ambiance. Gain volontairement plus fort que le chime précédent
 * (0.28 vs 0.22) pour être audible même son baissé.
 */
function _playChimeNotes(c) {
  // Sol4 → La4 → Si4 → Ré5 → Sol5 — fanfare classique montante
  const notes = [392, 440, 494, 587.33, 783.99];
  notes.forEach((freq, i) => {
    const t = c.currentTime + i * 0.13;
    const osc = c.createOscillator();
    osc.type = "triangle"; // plus chaud que sine, moins agressif que square
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

export function playMatchChime() {
  const c = ensureContext();
  if (!c) return;
  // Sur mobile le navigateur suspend l'AudioContext dès que l'app est en
  // arrière-plan. `resume()` ne fonctionne qu'après un geste utilisateur —
  // si on est ici depuis un événement WebSocket (pas un clic), ça peut
  // échouer silencieusement. On tente quand même ; le cas garanti est le
  // clic "Prêt !" dans Duel.jsx (§ReadyScreen) qui appelle playMatchChime
  // lui aussi depuis un vrai geste.
  if (c.state === "suspended") {
    c.resume().then(() => _playChimeNotes(c)).catch(() => {});
  } else {
    _playChimeNotes(c);
  }
}

/**
 * Voix synthétique via Web Speech API — dit "Duel trouvé, prépare-toi !"
 * (ou avec le nom de l'adversaire). Fonctionne hors ligne, aucun fichier.
 * Dégrade silencieusement si speechSynthesis n'est pas disponible.
 */
export function speakMatchFound(opponentName) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel(); // annule toute parole en cours
    const text = opponentName
      ? `Duel trouvé ! ${opponentName} a accepté. Prépare-toi !`
      : "Duel trouvé ! Prépare-toi, la partie commence !";
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "fr-FR";
    utt.rate = 1.05;
    utt.pitch = 1.1;
    utt.volume = 1;
    // Préfère une voix française si disponible, sinon laisse le navigateur choisir
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find((v) => v.lang.startsWith("fr"));
    if (frVoice) utt.voice = frVoice;
    window.speechSynthesis.speak(utt);
  } catch {
    /* silencieux si le navigateur bloque */
  }
}

/** À appeler une fois après connexion. */
export function requestNotifyPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

/** Notification navigateur native — seulement si l'onglet n'est PAS au
 *  premier plan (la fanfare + la voix + la navigation suffisent sinon). */
export function notifyMatchFound(opponentName) {
  if (document.visibilityState === "visible") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const n = new Notification("Duel trouvé !", {
      body: opponentName
        ? `${opponentName} a rejoint — la partie commence !`
        : "Un adversaire a rejoint — la partie commence !",
      tag: "quizarena-duel-matched",
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {
    /* certains navigateurs lèvent au lieu de refuser silencieusement */
  }
}
