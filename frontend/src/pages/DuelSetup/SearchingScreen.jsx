import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Swords, UserRound } from "lucide-react";
import { formatMoney } from "../../lib/currency";
import InterstitialCard from "../../components/InterstitialCard";
import { pickInterstitial } from "../../lib/interstitials";
import Shell from "./Shell";

export default function SearchingScreen({ navigate, cancel, stake, currency }) {
  return (
    <Shell back={() => navigate("/")} eyebrow="Matchmaking sécurisé" title="Recherche d’un adversaire">
      <MatchmakingScene />
      <p className="mt-7 text-center text-sm" style={{ color: "var(--text-sub)" }}>Mise {formatMoney(stake, currency)} · aucun débit définitif sans match valide</p>
      <div className="mx-auto mt-6 w-full max-w-lg"><RotatingFact /></div>
      <button onClick={cancel} className="btn-secondary mt-8 w-full rounded-2xl py-3">Annuler la recherche</button>
    </Shell>
  );
}

/** Carte qui change toutes les 10s pendant l'attente d'un adversaire —
 * même but que les tips de l'écran de chargement : une recherche qui peut
 * prendre du temps se sent plus courte quand il y a quelque chose à lire,
 * plutôt qu'une animation qui tourne en boucle sans rien de nouveau. */
function RotatingFact() {
  const [card, setCard] = useState(() => pickInterstitial(null));
  useEffect(() => {
    const id = setInterval(() => setCard((prev) => pickInterstitial(prev?.title ?? null)), 10_000);
    return () => clearInterval(id);
  }, []);
  return <AnimatePresence mode="wait"><InterstitialCard key={card?.title} card={card} compact /></AnimatePresence>;
}

function MatchmakingScene() {
  return (
    <div className="relative mx-auto mt-10 h-40 max-w-md overflow-hidden rounded-3xl border" style={{ background: "var(--surface)", borderColor: "var(--border-md)" }}>
      <motion.div className="absolute left-0 right-0 top-1/2 h-px" style={{ background: "var(--accent)" }} animate={{ opacity: [.25, .8, .25] }} transition={{ duration: 1.2, repeat: Infinity }} />
      {[0, 1, 2, 3].map((index) => (
        <motion.span
          key={index}
          className="absolute top-1/2 h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--accent)" }}
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: [0, 360], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.2, delay: index * .5, repeat: Infinity, ease: "linear" }}
        />
      ))}
      <motion.div
        className="absolute left-8 top-1/2 grid h-16 w-16 -translate-y-1/2 place-items-center rounded-2xl border"
        style={{ background: "var(--surface-2)", borderColor: "var(--accent)", color: "var(--accent)" }}
        animate={{ y: [-32, -39, -32] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      >
        <UserRound className="h-8 w-8" />
      </motion.div>
      <motion.div
        className="absolute right-8 top-1/2 grid h-16 w-16 -translate-y-1/2 place-items-center rounded-2xl border"
        style={{ background: "var(--surface-2)", borderColor: "var(--border-md)", color: "var(--text-sub)" }}
        animate={{ y: [-32, -25, -32] }}
        transition={{ duration: 1.1, delay: .25, repeat: Infinity, ease: "easeInOut" }}
      >
        <Bot className="h-8 w-8" />
      </motion.div>
      <motion.div
        className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
        style={{ background: "var(--accent)", color: "#09090F" }}
        animate={{ rotate: [0, 180, 360], scale: [.9, 1.08, .9] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Swords className="h-5 w-5" />
      </motion.div>
    </div>
  );
}
