import { AnimatePresence, motion } from "framer-motion";
import { BellOff, Lock, Menu, Share, X } from "lucide-react";
import { describeBrowser } from "../lib/browserInfo";

/**
 * Guide de réactivation — retour Paul du 31/08 : "les utilisateurs ne
 * pourront pas activer ça eux-mêmes". Une fois que le navigateur a mémorisé
 * un refus, aucun site ne peut redéclencher la fenêtre native — restriction
 * du navigateur, pas quelque chose de contournable en JS ici. Le seul geste
 * possible côté produit est de remplacer le simple toast par des étapes
 * concrètes, adaptées au navigateur détecté, au lieu d'un renvoi vague
 * "va dans les réglages" que la plupart des joueurs ne savent pas suivre.
 */
export default function NotificationBlockedModal({ open, onClose }) {
  const { browser, os } = describeBrowser();
  const steps = getSteps(browser, os);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0" style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }} onClick={onClose} />
          <motion.div
            className="relative w-full max-w-sm rounded-3xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border-md)" }}
            initial={{ y: 48, opacity: 0, scale: .96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 48, opacity: 0, scale: .96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full transition" style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}>
              <X className="h-4 w-4" />
            </button>
            <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: "rgba(255,107,107,.12)", color: "#FF6B6B" }}>
              <BellOff className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display text-xl font-extrabold">Notifications bloquées</h3>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--text-sub)" }}>
              Ton {browser}{os ? ` sur ${os}` : ""} a déjà refusé les notifications pour QuizArena. Seul toi peux les réautoriser, en 2 étapes :
            </p>
            <ol className="mt-4 space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{i + 1}</span>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>{step}</p>
                </li>
              ))}
            </ol>
            <button onClick={onClose} className="btn-primary mt-6 w-full rounded-2xl py-3 text-sm font-bold">J'ai compris</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getSteps(browser, os) {
  if (os === "iOS") {
    return [
      <span key="1">Safari sur iPhone/iPad n'active les notifications que pour un site ajouté à l'écran d'accueil : appuie sur <Share className="inline h-3.5 w-3.5 align-text-bottom" /> (Partager) puis « Sur l'écran d'accueil ».</span>,
      "Rouvre QuizArena depuis cette icône (pas depuis Safari), puis réessaye d'activer les notifications — la demande apparaîtra normalement.",
    ];
  }
  if (os === "Android" && (browser === "Chrome" || browser === "Edge" || browser === "Opera")) {
    return [
      <span key="1">Appuie sur le <Lock className="inline h-3.5 w-3.5 align-text-bottom" /> (ou <Menu className="inline h-3.5 w-3.5 align-text-bottom" />) à gauche de l'adresse quizarenaworld.com.</span>,
      "Ouvre « Autorisations » (ou « Infos sur le site ») → Notifications → Autoriser, puis recharge la page.",
    ];
  }
  if (browser === "Firefox") {
    return [
      "Clique sur le cadenas à gauche de l'adresse quizarenaworld.com.",
      "Ouvre « Autorisations », repère « Envoyer des notifications » et choisis Autoriser, puis recharge la page.",
    ];
  }
  // Desktop Chrome/Edge/Opera par défaut.
  return [
    "Clique sur le cadenas (ou l'icône « i ») à gauche de l'adresse quizarenaworld.com.",
    "Ouvre « Paramètres du site » → Notifications → Autoriser, puis recharge la page.",
  ];
}
