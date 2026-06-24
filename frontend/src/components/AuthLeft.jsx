import { motion } from "framer-motion";
import { CATEGORIES, TOP_PLAYERS, CATEGORY_COLORS } from "../data/mockData";
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
        className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${AMBER}12 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />
      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 60px),
                            repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 60px)`,
        }}
      />

      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-10">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-pixel text-[9px] text-black flex-shrink-0"
            style={{ background: AMBER }}
          >
            QA
          </div>
          <span className="font-display font-black text-base tracking-tight text-white">
            Quiz<span style={{ color: AMBER }}>Arena</span>
          </span>
        </div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold text-white leading-tight mb-3">
            La culture générale<br />
            <span style={{ color: AMBER }}>est un sport de combat.</span>
          </h2>
          <p className="text-sm text-white/35 leading-relaxed">
            Défie les meilleurs. Prouve ta valeur.<br />Remporte la mise.
          </p>
        </motion.div>

        {/* Live stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4 mt-8"
        >
          {[
            { icon: Users,  value: "5 247",  label: "joueurs en ligne" },
            { icon: Swords, value: "1 832",  label: "parties en cours" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.07]"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-[#5DD66E] animate-pulse" />
                </div>
                <div>
                  <div className="font-arcade text-sm" style={{ color: AMBER }}>
                    {s.value}
                  </div>
                  <div className="text-[9px] text-white/30">{s.label}</div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Leaderboard preview */}
      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-[9px] uppercase tracking-[0.14em] text-white/20 font-semibold mb-3">
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
                  className="flex items-center gap-2.5"
                >
                  <span className="text-[10px] font-arcade w-4 text-right flex-shrink-0" style={{ color: i === 0 ? AMBER : "rgba(255,255,255,0.2)" }}>
                    {i + 1}
                  </span>
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{ background: `${AMBER}15`, color: AMBER }}
                  >
                    {p.avatar}
                  </div>
                  <span className="text-xs text-white/70 flex-1 truncate">{p.name}</span>
                  <span className="font-arcade text-[10px] flex-shrink-0" style={{ color: rank.color }}>
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
          className="flex gap-2 mt-6"
        >
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const col = CATEGORY_COLORS[c.id] || AMBER;
            return (
              <div
                key={c.id}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${col}18`, color: col }}
                title={c.name.fr}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
