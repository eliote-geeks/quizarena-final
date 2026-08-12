import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { USER_PROFILE, getCategory } from "../data/mockData";
import {
  Swords, Brain, Zap, Star, Crown, Target, Trophy,
  RotateCcw, BookOpen, ChevronRight, Sparkles,
} from "lucide-react";

const GREEN = "var(--success)";
const RED   = "var(--danger)";
const ICONS = { swords: Swords, brain: Brain, zap: Zap, star: Star, crown: Crown, target: Target };

export default function Profile() {
  const { t, lang, resetOnboarding } = useApp();
  const navigate = useNavigate();
  const p = USER_PROFILE;
  const xpPct = (p.xp / p.xpNext) * 100;

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-4xl mx-auto space-y-8">

      {/* Identity */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center font-display font-semibold text-2xl flex-shrink-0"
          style={{
            background: "var(--accent-soft)",
            color: "var(--accent-hover)",
            border: "1px solid var(--border-md)",
          }}
        >
          {p.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-semibold text-3xl sm:text-4xl leading-tight tracking-tight" style={{ color: "var(--text)" }}>
            {p.name}
          </h1>
          <div className="text-sm mt-1" style={{ color: "var(--text-sub)" }}>
            Niveau <span className="font-semibold" style={{ color: "var(--accent)" }}>{p.level}</span> · Rang #142 · Membre depuis {p.joined}
          </div>
        </div>
      </motion.header>

      {/* XP */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card rounded-2xl p-5"
      >
        <div className="flex items-center justify-between text-xs mb-3" style={{ color: "var(--text-sub)" }}>
          <span className="font-medium">Progression</span>
          <span className="font-medium tabular-nums" style={{ color: "var(--accent)" }}>
            {p.xp.toLocaleString()} / {p.xpNext.toLocaleString()} XP
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--active)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "var(--accent)" }}
          />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { icon: Trophy, label: "Victoires", value: p.wins },
          { icon: Swords, label: "Parties",   value: p.games },
          { icon: Target, label: "Win rate",  value: `${p.winRate}%` },
          { icon: Zap,    label: "Streak",    value: p.bestStreak },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card rounded-2xl p-4">
              <Icon className="w-4 h-4 mb-2" style={{ color: "var(--accent)" }} strokeWidth={2} />
              <div className="text-xs font-medium" style={{ color: "var(--text-sub)" }}>{s.label}</div>
              <div className="font-display font-semibold text-2xl mt-1 tracking-tight" style={{ color: "var(--text)" }}>
                {s.value}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Category perf */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.11 }}
      >
        <h2 className="font-display font-semibold text-2xl tracking-tight mb-4" style={{ color: "var(--text)" }}>
          Par catégorie
        </h2>
        <div className="card rounded-2xl p-5 space-y-4">
          {p.categoryPerf.map((cp) => {
            const c = getCategory(cp.id);
            return (
              <div key={cp.id} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent-hover)" }}>
                  <c.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold mb-1.5" style={{ color: "var(--text)" }}>{c.name[lang]}</div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--active)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${cp.rate}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                  </div>
                </div>
                <div className="font-display font-semibold text-base w-12 text-right tabular-nums" style={{ color: "var(--accent)" }}>
                  {cp.rate}%
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Badges */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
      >
        <h2 className="font-display font-semibold text-2xl tracking-tight mb-4" style={{ color: "var(--text)" }}>
          Badges
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {p.badges.map((b) => {
            const Icon = ICONS[b.icon] || Star;
            return (
              <div
                key={b.id}
                data-testid={`badge-${b.id}`}
                className="card aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 p-2"
              >
                <Icon className="w-6 h-6" style={{ color: "var(--accent)" }} strokeWidth={1.8} />
                <div className="text-xs font-medium text-center leading-tight" style={{ color: "var(--text-sub)" }}>
                  {b.name[lang]}
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Recent */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-2xl tracking-tight" style={{ color: "var(--text)" }}>Récents</h2>
          <button onClick={() => navigate("/replays")} className="btn-ghost text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
            Tous <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="card rounded-2xl overflow-hidden divide-y" style={{ borderColor: "var(--divider)" }}>
          {p.recent.map((r, i) => {
            const c = getCategory(r.category);
            const won = r.result === "win";
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent-hover)" }}>
                  <c.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{r.mode}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-sub)" }}>{c.name[lang]}</div>
                </div>
                <div className="font-display font-semibold text-base tabular-nums" style={{ color: won ? GREEN : RED }}>
                  {won ? "+" : ""}{r.delta}
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.20 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <button
          onClick={() => navigate("/replays")}
          className="card card-hover flex items-center gap-3 p-4 rounded-2xl text-left"
        >
          <RotateCcw className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Replays</span>
          <ChevronRight className="w-4 h-4 ml-auto" style={{ color: "var(--text-faint)" }} />
        </button>
        <button
          onClick={() => navigate("/rules")}
          className="card card-hover flex items-center gap-3 p-4 rounded-2xl text-left"
        >
          <BookOpen className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Règles</span>
          <ChevronRight className="w-4 h-4 ml-auto" style={{ color: "var(--text-faint)" }} />
        </button>
        <button
          onClick={() => { resetOnboarding(); navigate("/"); }}
          className="card card-hover flex items-center gap-3 p-4 rounded-2xl text-left"
        >
          <Sparkles className="w-5 h-5" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Revoir le tutoriel</span>
          <ChevronRight className="w-4 h-4 ml-auto" style={{ color: "var(--text-faint)" }} />
        </button>
      </motion.div>
    </div>
  );
}
