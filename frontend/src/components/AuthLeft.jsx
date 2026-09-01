import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import * as api from "../lib/api";
import { pickInterstitial } from "../lib/interstitials";
import { BrainCircuit, ShieldCheck, Swords, Trophy, UserRound, Users, Zap } from "lucide-react";

const AMBER = "#E5A800";

/**
 * Panneau gauche des pages d'auth — refonte du 31/08 (retour Paul : "oui
 * applique ça" après recherche 2026, cf. mémoire feedback_quizarena_anti_ai_design
 * — trancher une direction plutôt que moyenner des refs). Remplace la
 * photo Unsplash "hero générique" par une composition bento sur fond mesh
 * gradient : rien d'importé de nulle part, tout réutilise le vocabulaire
 * visuel déjà en place ailleurs dans l'app (le duel face-à-face de
 * DuelSetup.jsx MatchmakingScene, les tips d'interstitials.js) — cohérent
 * avec l'identité QuizArena plutôt qu'un thème SaaS générique plaqué dessus.
 */
export default function AuthLeft() {
  const [stats, setStats] = useState(null);
  const [card, setCard] = useState(() => pickInterstitial(null));
  const reduced = useReducedMotion();

  useEffect(() => { api.getPublicStats().then(setStats).catch(() => {}); }, []);
  useEffect(() => {
    const id = setInterval(() => setCard((prev) => pickInterstitial(prev?.title ?? null)), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="auth-showcase-v2">
      <div className="auth-mesh" aria-hidden="true" />
      <motion.div className="auth-mesh-orbit auth-mesh-orbit-one" aria-hidden="true" animate={reduced ? {} : { x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="auth-mesh-orbit auth-mesh-orbit-two" aria-hidden="true" animate={reduced ? {} : { x: [0, -24, 0], y: [0, 18, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />

      <div className="auth-showcase-top"><Brand /><span className="auth-secure"><ShieldCheck className="h-3.5 w-3.5" /> Compte sécurisé</span></div>

      <motion.div className="auth-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
        <p className="auth-kicker"><Zap className="h-3.5 w-3.5" /> QuizArena · live</p>
        <h2>Entre dans<br /><span>l’arène.</span></h2>
        <p>Des questions rapides. Des duels réels. Une seule place au sommet.</p>
      </motion.div>

      <motion.div className="auth-bento" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: .45 }}>
        <div className="auth-bento-cell auth-bento-versus">
          <VersusGraphic reduced={reduced} />
        </div>
        <BentoStat icon={Users} value={stats?.activePlayers7d ?? "—"} label="joueurs actifs" />
        <BentoStat icon={Swords} value={stats?.duelsToday ?? "—"} label="duels aujourd’hui" />
        <div className="auth-bento-cell auth-bento-fact">
          <AnimatePresence mode="wait">
            <motion.div
              key={card?.title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: .3 }}
            >
              <p className="auth-fact-title">{card?.title}</p>
              <p className="auth-fact-body">{card?.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </aside>
  );
}

export function AuthMobileBrand() { return <div className="auth-mobile-brand"><Brand /></div>; }
function Brand() { return <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: AMBER, color: "#0A0910" }}><BrainCircuit className="h-4 w-4" /></div><span className="font-display text-lg font-extrabold tracking-tight text-white">Quiz<span style={{ color: AMBER }}>Arena</span></span></div>; }
function BentoStat({ icon: Icon, value, label }) {
  return (
    <div className="auth-bento-cell auth-bento-stat">
      <Icon className="h-4 w-4" style={{ color: AMBER }} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

/** Même motif que MatchmakingScene (§DuelSetup.jsx) — deux joueurs
 * face-à-face, l'épée qui pulse entre eux — réutilisé ici au lieu d'une
 * photo stock, pour que la première chose vue en arrivant sur le site
 * soit déjà le langage visuel du duel, pas une image générique. */
function VersusGraphic({ reduced }) {
  return (
    <div className="auth-versus">
      <div className="auth-versus-row">
        <motion.div className="auth-versus-avatar" animate={reduced ? {} : { scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <UserRound className="h-6 w-6" />
        </motion.div>
        <motion.div className="auth-versus-spark" animate={reduced ? {} : { rotate: [0, 180, 360], scale: [.9, 1.1, .9] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
          <Swords className="h-4 w-4" />
        </motion.div>
        <motion.div className="auth-versus-avatar auth-versus-avatar-dim" animate={reduced ? {} : { scale: [1, 1.06, 1] }} transition={{ duration: 1.6, delay: .3, repeat: Infinity, ease: "easeInOut" }}>
          <UserRound className="h-6 w-6" />
        </motion.div>
      </div>
      <span className="auth-versus-label"><Trophy className="h-3 w-3" /> Duel en direct</span>
    </div>
  );
}
