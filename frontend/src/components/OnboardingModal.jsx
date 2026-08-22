import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  X, ChevronRight, ChevronLeft, Play, Swords, Trophy, Crown, Wallet, Sparkles,
} from "lucide-react";

const STEPS = [
  {
    icon: Play,
    title: "Entre dans l'arène",
    text: "Réponds juste, réponds vite, gagne en FCFA.",
    highlight: "La connaissance fait la différence.",
  },
  {
    icon: Swords,
    title: "Trois façons de jouer",
    text: "Solo, Duel 1v1 ou Tournois. Choisis ta mise et lance la partie.",
    highlight: "Chaque question a son chrono.",
  },
  {
    icon: Crown,
    title: "VIP se mérite",
    text: "30 victoires de Duel sur le mois débloquent les outils VIP.",
    highlight: "Tournois privés et parrainage.",
  },
  {
    icon: Wallet,
    title: "Wallet et paiements",
    text: "Recharge, joue, retire tes gains en FCFA.",
    highlight: "Prêt ? Lance ton premier quiz.",
  },
];

export default function OnboardingModal() {
  const navigate = useNavigate();
  const { onboardingSeen, markOnboardingSeen } = useApp();
  const [step, setStep] = useState(0);

  if (onboardingSeen) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  const close = () => markOnboardingSeen();
  const finish = () => {
    markOnboardingSeen();
    navigate("/play/random");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: "rgba(5,5,10,0.85)", backdropFilter: "blur(10px)" }}
        onClick={close}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
          className="card w-full overflow-hidden rounded-t-3xl sm:max-w-md sm:rounded-3xl"
        >
          {/* Header with progress */}
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--qa-gold)" }}>
                Étape {step + 1} / {STEPS.length}
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-lg transition hover:opacity-70"
                style={{ color: "var(--qa-text-faint)" }}
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{ background: "var(--qa-active)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-400"
                    style={{
                      width: i <= step ? "100%" : "0%",
                      background: i <= step ? "var(--qa-shine)" : "transparent",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="px-6 pb-6 pt-2"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--qa-gold)",
                  border: "1px solid var(--qa-border-md)",
                  boxShadow: "none",
                }}
              >
                <Icon className="w-8 h-8" strokeWidth={2.2} />
              </div>

              <h2 className="font-display font-bold text-2xl leading-tight mb-2" style={{ color: "var(--qa-text)" }}>
                {s.title}
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--qa-text-sub)" }}>
                {s.text}
              </p>

              <div
                className="rounded-xl p-3 flex items-start gap-2"
                style={{
                  background: "rgba(212,175,55,0.08)",
                  border: "1px solid rgba(212,175,55,0.25)",
                }}
              >
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--qa-gold)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--qa-gold-light)" }}>
                  {s.highlight}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Footer nav */}
          <div className="px-5 pb-5 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition hover:opacity-80"
                style={{ background: "var(--qa-active)", color: "var(--qa-text-sub)" }}
              >
                <ChevronLeft className="w-4 h-4" />
                Retour
              </button>
            ) : (
              <button
                onClick={close}
                className="text-sm font-semibold px-3 py-2 rounded-lg transition hover:opacity-80"
                style={{ color: "var(--qa-text-faint)" }}
              >
                Passer
              </button>
            )}

            {isLast ? (
              <button onClick={finish} className="btn-gold flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm">
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  Démarrer un quiz
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="btn-gold flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm"
              >
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
