import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords } from "lucide-react";
import { pickInterstitial } from "../lib/interstitials";

/**
 * Écran de transition entre deux pages — même principe qu'un écran de
 * chargement de jeu vidéo entre deux niveaux : une icône animée, une
 * barre indéterminée, et un tip qui défile lentement pendant l'attente.
 *
 * Deux déclencheurs, un seul composant :
 *  1. Fallback de <Suspense> autour des routes (§App.js) : s'affiche
 *     pendant le vrai téléchargement du code d'une page pas encore visitée
 *     — un vrai chargement, pas une mise en scène.
 *  2. Le minuteur de RouteTransitionGate (§App.js) : garantit qu'on voit
 *     toujours au moins un tip, même quand le code est déjà en cache et
 *     que la navigation serait sinon instantanée — c'est le comportement
 *     "beat de transition" des jeux, où l'écran s'affiche par cohérence
 *     de rythme, pas uniquement par nécessité technique. Fenêtre courte
 *     et bornée (voir TRANSITION_MS dans App.js) : jamais un vrai temps
 *     mort sur une appli d'argent réel où la vitesse perçue compte.
 *
 * Si l'attente se prolonge (chunk lent), les tips s'enchaînent toutes les
 * 2,8 s au lieu de rester figés sur un seul.
 */
export default function PageLoadingScreen() {
  const [card, setCard] = useState(() => pickInterstitial(null));

  useEffect(() => {
    const t = setInterval(() => {
      setCard((prev) => pickInterstitial(prev?.title ?? null));
    }, 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
      role="status"
      aria-live="polite"
      aria-label="Chargement de la page"
    >
      {/* Icône — anneau tournant façon écran de chargement, même langage
          visuel que le chronomètre circulaire des questions. */}
      <div className="relative grid h-20 w-20 place-items-center">
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: "3px solid var(--border-md)" }}
        />
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            border: "3px solid transparent",
            borderTopColor: "var(--accent)",
            borderRightColor: "var(--accent)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
        <Swords className="h-8 w-8" style={{ color: "var(--accent)" }} />
      </div>

      <p
        className="font-display mt-6 text-xs font-bold uppercase tracking-[.2em]"
        style={{ color: "var(--text-faint)" }}
      >
        Chargement
      </p>

      {/* Tip qui défile lentement — apparaît en glissant, reste le temps
          de se lire, repart avant le suivant. */}
      <div className="mt-5 w-full max-w-sm text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={card?.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[.14em]"
              style={{ color: "var(--accent)" }}
            >
              {card?.label}
            </p>
            <p
              className="font-display mt-2 text-base font-bold leading-snug"
              style={{ color: "var(--text)" }}
            >
              {card?.title}
            </p>
            <p
              className="mt-1.5 text-xs leading-relaxed"
              style={{ color: "var(--text-sub)" }}
            >
              {card?.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Barre indéterminée — la durée réelle du chargement est inconnue,
          donc pas de vraie progression : un balayage continu suffit. */}
      <div
        className="mt-7 h-1 w-40 overflow-hidden rounded-full"
        style={{ background: "var(--surface-2)" }}
      >
        <motion.div
          className="h-full w-1/3 rounded-full"
          style={{ background: "var(--accent)" }}
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
