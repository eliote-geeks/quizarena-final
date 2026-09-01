import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Layers3, ShieldCheck, Swords } from "lucide-react";
import * as duel from "../lib/duelSocket";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import { SFX } from "../lib/soundEngine";

function playChallengeAlert(contextRef) {
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    const context = contextRef.current || new AudioCtor();
    contextRef.current = context;
    void context.resume();
    const start = context.currentTime + .02;
    [0, .17, .34].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 1 ? "square" : "sine";
      oscillator.frequency.setValueAtTime(index === 1 ? 1320 : 1050, start + offset);
      oscillator.frequency.exponentialRampToValueAtTime(index === 1 ? 1540 : 1260, start + offset + .11);
      gain.gain.setValueAtTime(.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(.16, start + offset + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, start + offset + .14);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + .15);
    });
  } catch {
    // Le navigateur peut bloquer le son avant le premier geste.
  }
}

/** File globale de défis ciblés : une navigation interne ne masque jamais
 * une invitation qui n'a pas encore été traitée. */
export default function DuelChallengePrompt() {
  const { user, currency, refreshWallet } = useApp();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [acceptingCode, setAcceptingCode] = useState(null);
  const [error, setError] = useState("");
  const audioContextRef = useRef(null);
  const acceptingRef = useRef(null);
  const challenge = challenges[0] || null;

  useEffect(() => {
    if (!user) return undefined;
    const unlockAudio = () => {
      try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (AudioCtor && !audioContextRef.current) audioContextRef.current = new AudioCtor();
        void audioContextRef.current?.resume();
      } catch {}
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    duel.connect();

    const offChallenge = duel.on("duel_challenge", (message) => {
      setChallenges((current) => current.some((item) => item.code === message.code) ? current : [...current, message]);
      playChallengeAlert(audioContextRef);
      if (typeof document !== "undefined" && document.hidden && "Notification" in window && Notification.permission === "granted") {
        new Notification("Défi QuizArena", {
          body: `${message.username} te défie pour ${message.stakeCoins.toLocaleString("fr-FR")} FCFA.`,
          icon: "/favicon.svg",
          tag: `duel-${message.code}`,
          requireInteraction: true,
        });
      }
    });
    const removeCode = (message) => setChallenges((current) => current.filter((item) => item.code !== message.code));
    const offCancelled = duel.on("duel_challenge_cancelled", removeCode);
    const offExpired = duel.on("duel_challenge_expired", removeCode);
    const offDeclined = duel.on("duel_challenge_declined", removeCode);
    const offAccepted = duel.on("duel_challenge_accepted", () => {
      setChallenges([]);
      setError("");
    });
    const offMatched = duel.on("matched", () => {
      if (!acceptingRef.current) return;
      setChallenges([]);
      acceptingRef.current = null;
      setAcceptingCode(null);
      SFX.confirm();
      refreshWallet().catch(() => {});
      navigate("/duel/play");
    });
    const offError = duel.on("error", (message) => {
      if (!acceptingRef.current) return;
      acceptingRef.current = null;
      setAcceptingCode(null);
      SFX.error();
      setError(message.message || "Ce défi ne peut pas être accepté pour l'instant.");
    });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      offChallenge(); offCancelled(); offExpired(); offDeclined(); offAccepted(); offMatched(); offError();
    };
  }, [navigate, refreshWallet, user]);

  const accept = () => {
    if (!challenge || acceptingCode) return;
    setError("");
    acceptingRef.current = challenge.code;
    setAcceptingCode(challenge.code);
    duel.joinInvite(challenge.code);
  };
  const decline = () => {
    if (!challenge || acceptingCode) return;
    SFX.cancel();
    duel.declineInvite(challenge.code);
    setChallenges((current) => current.filter((item) => item.code !== challenge.code));
    setError("");
  };
  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
  };

  return <AnimatePresence>{challenge && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid place-items-center p-4" style={{ background: "rgba(5,5,10,.94)" }}>
    <motion.section initial={{ opacity: 0, y: 26, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={{ type: "spring", stiffness: 340, damping: 28 }} className="w-full max-w-md overflow-hidden rounded-3xl border p-6" style={{ background: "var(--surface)", borderColor: "rgba(229,168,0,.42)" }} role="alertdialog" aria-modal="true" aria-label="Défi privé reçu">
      <div className="flex items-start justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: "var(--accent)", color: "#09090F" }}><Swords className="h-6 w-6" /></span><div className="text-right"><span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Défi privé reçu</span>{challenges.length > 1 && <p className="mt-2 inline-flex items-center gap-1 text-xs" style={{ color: "var(--text-sub)" }}><Layers3 className="h-3.5 w-3.5" />{challenges.length} demandes en attente</p>}</div></div>
      <h2 className="mt-6 font-display text-3xl font-extrabold">{challenge.username} veut t'affronter.</h2>
      <div className="mt-5 flex items-center justify-between rounded-2xl p-4" style={{ background: "var(--surface-2)" }}><span className="text-sm" style={{ color: "var(--text-sub)" }}>Mise par joueur</span><strong className="text-xl" style={{ color: "var(--accent)" }}>{formatMoney(challenge.stakeCoins, currency)}</strong></div>
      <p className="mt-4 text-sm leading-6" style={{ color: "var(--text-sub)" }}>Cette demande reste à l'écran jusqu'à ta décision. En l'acceptant, les autres défis sont automatiquement refusés.</p>
      {error && <p className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(244,63,94,.1)", color: "var(--danger)" }}>{error}</p>}
      {typeof Notification !== "undefined" && Notification.permission === "default" && <button onClick={enableNotifications} className="mt-4 inline-flex items-center gap-2 text-xs font-bold" style={{ color: "var(--accent)" }}><BellRing className="h-4 w-4" /> Activer les alertes sur cet appareil</button>}
      <div className="mt-6 grid grid-cols-2 gap-3"><button disabled={Boolean(acceptingCode)} onClick={decline} className="btn-secondary rounded-2xl py-3 disabled:opacity-50">Refuser</button><button disabled={Boolean(acceptingCode)} onClick={accept} className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl py-3 disabled:opacity-60">{acceptingCode ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />Vérification…</> : <><ShieldCheck className="h-4 w-4" />Accepter</>}</button></div>
    </motion.section>
  </motion.div>}</AnimatePresence>;
}
