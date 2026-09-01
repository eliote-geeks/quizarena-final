let _ctx = null;

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

function tone(freq, dur, type = "sine", vol = 0.22) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + dur + 0.01);
  } catch (_) {}
}

export const SFX = {
  correct() {
    tone(523, 0.07);
    setTimeout(() => tone(659, 0.07), 65);
    setTimeout(() => tone(784, 0.16), 130);
  },
  wrong() {
    tone(220, 0.1, "sawtooth", 0.18);
    setTimeout(() => tone(165, 0.14, "sawtooth", 0.14), 90);
  },
  tick() { tone(880, 0.035, "square", 0.07); },
  streak() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.07), i * 50));
  },
  onFire() {
    [392, 523, 659, 784, 1047, 1318].forEach((f, i) =>
      setTimeout(() => tone(f, 0.065, "triangle"), i * 42)
    );
  },
  opponentLocked() { tone(440, 0.04, "square", 0.05); },

  // ── Retours sonores des confirmations (29/08) ──────────────────────
  // Même principe que les SFX de jeu au-dessus : ils informent, ils ne
  // décorent pas. Sur une appli d'argent réel, chaque action engageante
  // (miser, s'inscrire, lancer un tournoi, retirer) doit être audible —
  // l'utilisateur sait que le geste est passé sans relire l'écran.

  /** Un modal engageant vient de s'ouvrir : deux notes montantes discrètes. */
  modalOpen() {
    tone(587, 0.05, "sine", 0.10);
    setTimeout(() => tone(784, 0.07, "sine", 0.10), 55);
  },
  /** Action confirmée et acceptée par le serveur (inscription, mise, prêt). */
  confirm() {
    tone(523, 0.06, "sine", 0.20);
    setTimeout(() => tone(698, 0.06, "sine", 0.20), 60);
    setTimeout(() => tone(880, 0.13, "sine", 0.18), 120);
  },
  /** Action annulée ou abandonnée : deux notes descendantes, jamais alarmantes. */
  cancel() {
    tone(494, 0.06, "sine", 0.14);
    setTimeout(() => tone(370, 0.10, "sine", 0.12), 65);
  },
  /** Le serveur a refusé (solde insuffisant, tournoi complet, etc.). */
  error() {
    tone(311, 0.09, "sawtooth", 0.15);
    setTimeout(() => tone(233, 0.13, "sawtooth", 0.13), 85);
  },
  /** Lien copié dans le presse-papier : un seul clic net. */
  copy() { tone(1047, 0.045, "sine", 0.13); },
  /** Le créateur lance le tournoi — fanfare courte, plus solennelle. */
  tournamentStart() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.11, "triangle", 0.19), i * 90)
    );
  },
  /** Un joueur a confirmé sa présence pendant le check. */
  ready() {
    tone(784, 0.05, "sine", 0.16);
    setTimeout(() => tone(1047, 0.09, "sine", 0.16), 55);
  },
  cashOut() {
    tone(392, 0.07);
    setTimeout(() => tone(523, 0.07), 75);
    setTimeout(() => tone(659, 0.14), 150);
  },
  victory() {
    [523, 659, 784, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 0.1), i * 75)
    );
  },
  defeat() {
    [440, 349, 294, 247].forEach((f, i) =>
      setTimeout(() => tone(f, 0.13, "triangle", 0.16), i * 85)
    );
  },
};

// La musique d'ambiance « zen pentatonique » qui vivait ici a été retirée
// (12 août 2026) : un pad calmant façon méditation ne correspond à aucune
// direction éditoriale assumée pour une appli de duel en argent réel — ni
// à l'ancien thème « zen nature », ni à la nouvelle DA « affiche de combat »
// de quizarena-v2. Les SFX ci-dessus restent : ils informent (bonne/mauvaise
// réponse, urgence du chrono), ils ne décorent pas. Voir DESIGN.md de
// quizarena-v2 §7 pour le principe, même s'il a été écrit pour le visuel.
// Si une identité sonore de marque est voulue plus tard, elle doit être
// une décision tranchée comme le reste de la DA — pas un remplissage
// « ambiance douce » par défaut.
