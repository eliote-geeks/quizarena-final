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

/* ── Zen ambient music ──
 * A minor pentatonic pad + slow bell arpeggios.
 * Genuinely calming, procedurally generated.
 */

// A minor pentatonic notes (Hz) — universally calming scale
const ZEN_PAD_FREQS = [
  110,    // A2 — root drone
  164.81, // E3 — fifth
  220,    // A3 — root octave
  329.63, // E4 — fifth octave
];

const ZEN_BELL_FREQS = [
  440,    // A4
  523.25, // C5
  659.25, // E5
  783.99, // G5
  880,    // A5
];

class ZenMusicPlayer {
  constructor() {
    this.playing = false;
    this.padOscs = [];
    this.padGains = [];
    this.masterGain = null;
    this.filter = null;
    this.bellInterval = null;
    this.lfo = null;
    this.lfoGain = null;
    this.volume = 0.35;
  }

  start() {
    if (this.playing) return;
    try {
      const c = getCtx();
      const now = c.currentTime;

      // Master gain — starts silent and fades in
      this.masterGain = c.createGain();
      this.masterGain.gain.setValueAtTime(0, now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 2.5);

      // Warm low-pass filter
      this.filter = c.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 1400;
      this.filter.Q.value = 0.7;

      this.filter.connect(this.masterGain);
      this.masterGain.connect(c.destination);

      // Slow LFO for gentle breathing motion
      this.lfo = c.createOscillator();
      this.lfo.frequency.value = 0.15;
      this.lfoGain = c.createGain();
      this.lfoGain.gain.value = 200;
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.filter.frequency);
      this.lfo.start(now);

      // Pad — 4 sine oscillators forming a warm A minor chord
      ZEN_PAD_FREQS.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        // Slight detune for chorus effect
        osc.detune.value = (i % 2 === 0 ? 3 : -3) + Math.random() * 2;

        // Each voice at low volume
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 3);

        osc.connect(gain);
        gain.connect(this.filter);
        osc.start(now);

        this.padOscs.push(osc);
        this.padGains.push(gain);
      });

      // Bell arpeggios — soft occasional notes
      this.bellInterval = setInterval(() => {
        if (!this.playing) return;
        const freq = ZEN_BELL_FREQS[Math.floor(Math.random() * ZEN_BELL_FREQS.length)];
        this.playBell(freq);
      }, 4200);

      this.playing = true;
    } catch (_) {}
  }

  playBell(freq) {
    try {
      const c = getCtx();
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      // Bell envelope: quick attack, long decay
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);

      osc.connect(gain);
      gain.connect(this.filter);
      osc.start(now);
      osc.stop(now + 3.6);
    } catch (_) {}
  }

  stop() {
    if (!this.playing) return;
    try {
      const c = getCtx();
      const now = c.currentTime;
      if (this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0, now + 1.2);
      }
      setTimeout(() => {
        this.padOscs.forEach(o => { try { o.stop(); } catch (_) {} });
        if (this.lfo) { try { this.lfo.stop(); } catch (_) {} }
        this.padOscs = [];
        this.padGains = [];
        this.masterGain = null;
        this.filter = null;
        this.lfo = null;
        this.lfoGain = null;
      }, 1400);
      if (this.bellInterval) {
        clearInterval(this.bellInterval);
        this.bellInterval = null;
      }
      this.playing = false;
    } catch (_) {}
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      try {
        const c = getCtx();
        const now = c.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.3);
      } catch (_) {}
    }
  }
}

export const ZenMusic = new ZenMusicPlayer();
