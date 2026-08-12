import { motion } from "framer-motion";
import { CATEGORIES, TOP_PLAYERS } from "../data/mockData";
import { getRank } from "../lib/eloEngine";
import { Radio, Users, Swords } from "lucide-react";

const AMBER = "#E5A800";

export default function AuthLeft() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between px-10 py-12 relative overflow-hidden"
      style={{ background: "linear-gradient(140deg, #07070F 0%, #0C0A1A 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${AMBER}18 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-12">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
            style={{ background: AMBER, color: "#07070F" }}
          >
            QA
          </div>
          <span className="font-display font-bold text-lg tracking-tight" style={{ color: "#FFFFFF" }}>
            Quiz<span style={{ color: AMBER }}>Arena</span>
          </span>
        </div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-display font-bold text-4xl leading-tight mb-4" style={{ color: "#FFFFFF" }}>
            La culture générale<br />
            <span style={{ color: AMBER }}>est un sport de combat.</span>
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            Défie les meilleurs.<br />Prouve ta valeur. Remporte la mise.
          </p>
        </motion.div>

        {/* Live stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mt-10"
        >
          {[
            { icon: Users,  value: "5 247",  label: "en ligne" },
            { icon: Swords, value: "1 832",  label: "en cours" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" style={{ color: "#5DD66E" }} />
              <div>
                <div className="font-display font-bold text-lg" style={{ color: AMBER }}>
                  {s.value}
                </div>
                <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Leaderboard preview */}
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            Top joueurs
          </div>
          <div className="space-y-2">
            {TOP_PLAYERS.slice(0, 4).map((p, i) => {
              const rank = getRank(p.elo || 1400 - i * 80);
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className="flex items-center gap-3"
                >
                  <span
                    className="font-display font-bold text-sm w-5 text-right flex-shrink-0"
                    style={{ color: i === 0 ? AMBER : "rgba(255,255,255,0.45)" }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${AMBER}22`, color: AMBER }}
                  >
                    {p.avatar}
                  </div>
                  <span className="text-sm font-bold flex-1 truncate" style={{ color: "#FFFFFF" }}>{p.name}</span>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: rank.color }}>
                    {rank.emoji} {p.wins}W
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Category icons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex flex-wrap gap-2 mt-6"
        >
          {CATEGORIES.slice(0, 8).map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.id}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${AMBER}18`, color: AMBER }}
                title={c.name.fr}
              >
                <Icon className="w-4 h-4" />
              </div>
            );
          })}
          {CATEGORIES.length > 8 && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}
            >
              +{CATEGORIES.length - 8}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
