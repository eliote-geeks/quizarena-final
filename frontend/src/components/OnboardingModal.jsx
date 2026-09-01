import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ArrowRight, BrainCircuit, Play, Swords, Crown, Wallet } from "lucide-react";

const STEPS = [
  {
    icon: Play,
    title: "Entre dans l'arène",
    text: "Réponds juste, réponds vite, gagne en FCFA.",
  },
  {
    icon: Swords,
    title: "Trois façons de jouer",
    text: "Solo, Duel 1v1 ou Tournois. Choisis ta mise et lance la partie.",
  },
  {
    icon: Crown,
    title: "VIP se mérite",
    text: "30 victoires de Duel sur le mois débloquent les outils VIP.",
  },
  {
    icon: Wallet,
    title: "Wallet et paiements",
    text: "Recharge, joue, retire tes gains en FCFA.",
  },
];

// Page d'accueil plein écran, pas une modale par-dessus le tableau de bord
// (retour Paul du 30/08 : reprendre exactement ce modèle — logo + "Passer"
// en en-tête, icône dans un carré adouci au centre, titre/texte, pastilles
// de progression, gros bouton plein largeur en bas).
export default function OnboardingModal() {
  const navigate = useNavigate();
  const { onboardingSeen, markOnboardingSeen, user, sessionLoading } = useApp();
  const [step, setStep] = useState(0);

  if (onboardingSeen || user || sessionLoading) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  const close = () => markOnboardingSeen();
  const next = () => (isLast ? finish() : setStep((value) => value + 1));
  const finish = () => {
    markOnboardingSeen();
    navigate("/register");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: "var(--bg)" }}
      >
        {/* Colonne largeur téléphone même sur grand écran : en plein
            large, le bouton "Suivant" s'étirait sur toute la largeur du
            viewport et devenait démesuré (retour Paul du 31/08). */}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* En-tête : logo + nom, "Passer" */}
        <div className="flex items-center justify-between px-5 pt-6 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div
              className="grid h-8 w-8 place-items-center rounded-lg"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              <BrainCircuit className="h-4 w-4" />
            </div>
            <span className="font-display text-base font-semibold" style={{ color: "var(--text)" }}>
              QuizArena
            </span>
          </div>
          <button
            onClick={close}
            className="text-sm font-semibold transition hover:opacity-70"
            style={{ color: "var(--text-faint)" }}
          >
            Passer
          </button>
        </div>

        {/* Contenu centré */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex flex-1 flex-col items-center justify-center px-8 text-center"
          >
            <div
              className="mb-8 grid h-28 w-28 place-items-center rounded-3xl"
              style={{ background: "var(--accent-soft)" }}
            >
              <Icon className="h-12 w-12" style={{ color: "var(--accent)" }} strokeWidth={1.8} />
            </div>
            <h2 className="font-display text-3xl font-bold" style={{ color: "var(--text)" }}>
              {s.title}
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed" style={{ color: "var(--text-sub)" }}>
              {s.text}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Pastilles de progression */}
        <div className="mb-8 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 22 : 8,
                background: i === step ? "var(--accent)" : "var(--border-md)",
              }}
            />
          ))}
        </div>

        {/* Bouton plein largeur */}
        <div className="px-5 pb-8 sm:px-8">
          <button
            onClick={next}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <ArrowRight className="h-4 w-4" />
            {isLast ? "Créer mon compte" : "Suivant"}
          </button>
        </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
