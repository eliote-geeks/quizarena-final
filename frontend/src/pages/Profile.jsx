import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { USER_PROFILE, getCategory } from "../data/mockData";
import { Swords, Brain, Zap, Star, Crown, Target, Trophy, Coins } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";

const ICONS = { swords: Swords, brain: Brain, zap: Zap, star: Star, crown: Crown, target: Target };

export default function Profile() {
  const { t, lang } = useApp();
  const p = USER_PROFILE;
  const xpPct = (p.xp / p.xpNext) * 100;

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-8 lg:p-10 mb-10 border-2 border-[#00FFFF]/40 relative overflow-hidden bg-[#0B0B14]"
        >
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[#00FFFF]/15 blur-[100px]" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-[#FF007F]/15 blur-[100px]" />
          <div className="relative grid md:grid-cols-[auto_1fr_auto] gap-8 items-center">
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center font-display font-black text-4xl border-2 border-[#FFD700]"
              style={{ background: "#FFD70015", color: "#FFD700" }}
            >
              {p.avatar}
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-[#00FFFF] mb-1">// CADET</div>
              <h1 className="font-display font-black uppercase tracking-tighter text-4xl lg:text-5xl mb-2">
                {p.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-slate-400 mb-3">
                <span>{t.common.level} <span className="text-[#FFD700] font-bold">{p.level}</span></span>
                <span>•</span>
                <span>Membre depuis {p.joined}</span>
              </div>
              <div className="max-w-md">
                <div className="flex items-center justify-between text-xs uppercase tracking-widest mb-1">
                  <span className="text-slate-500">{t.common.xp}</span>
                  <span className="font-arcade text-base text-[#FFD700]">{p.xp.toLocaleString()} / {p.xpNext.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-sm bg-white/5 border border-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#FFD700] to-[#00FFFF] shadow-[0_0_12px_rgba(255,215,0,0.7)]"
                  />
                </div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Rang Global</div>
              <div className="font-arcade text-5xl text-[#FFD700] text-glow-yellow">#142</div>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Trophy, label: t.profile.totalWins, value: p.wins, color: "#FFD700" },
            { icon: Swords, label: t.profile.totalGames, value: p.games, color: "#00FFFF" },
            { icon: Target, label: t.profile.winRate, value: `${p.winRate}%`, color: "#39FF14" },
            { icon: Zap, label: t.profile.bestStreak, value: p.bestStreak, color: "#FF007F" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl p-5 bg-[#0B0B14] border border-white/10 hover:border-white/30 transition">
                <Icon className="w-6 h-6 mb-3" style={{ color: s.color }} />
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{s.label}</div>
                <div className="font-arcade text-3xl" style={{ color: s.color }}>{s.value}</div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Badges */}
          <div className="lg:col-span-2 rounded-2xl p-6 bg-[#0B0B14] border border-white/10">
            <h2 className="font-display font-bold uppercase tracking-tight text-xl mb-5">{t.profile.badges}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {p.badges.map((b) => {
                const Icon = ICONS[b.icon] || Star;
                return (
                  <div
                    key={b.id}
                    data-testid={`badge-${b.id}`}
                    className="aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-2 p-2 transition hover:-translate-y-1"
                    style={{ borderColor: `${b.color}66`, background: `${b.color}10`, boxShadow: `0 0 16px ${b.color}25` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: b.color }} />
                    <div className="text-[10px] uppercase tracking-widest text-center" style={{ color: b.color }}>
                      {b.name[lang]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent matches */}
          <div className="rounded-2xl p-6 bg-[#0B0B14] border border-white/10">
            <h2 className="font-display font-bold uppercase tracking-tight text-xl mb-5">{t.profile.recentMatches}</h2>
            <div className="space-y-2">
              {p.recent.map((r, i) => {
                const c = getCategory(r.category);
                const won = r.result === "win";
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#12121E] border border-white/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <c.icon className="w-4 h-4 flex-shrink-0" style={{ color: c.accent }} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{r.mode}</div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 truncate">
                          {c.name[lang]}
                        </div>
                      </div>
                    </div>
                    <div className={`font-arcade text-lg flex-shrink-0 ${won ? "text-[#39FF14]" : "text-[#FF3333]"}`}>
                      {won ? "+" : ""}{r.delta}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Performance par catégorie */}
        <div className="mt-6 rounded-2xl p-6 bg-[#0B0B14] border border-white/10">
          <h2 className="font-display font-bold uppercase tracking-tight text-xl mb-5">{t.profile.categoryPerf}</h2>
          <div className="space-y-3">
            {p.categoryPerf.map((cp) => {
              const c = getCategory(cp.id);
              return (
                <div key={cp.id} className="flex items-center gap-4">
                  <div className="w-32 sm:w-40 flex items-center gap-2">
                    <c.icon className="w-4 h-4 flex-shrink-0" style={{ color: c.accent }} />
                    <span className="text-sm font-medium text-white truncate">{c.name[lang]}</span>
                  </div>
                  <div className="flex-1 h-3 rounded-sm bg-white/5 border border-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${cp.rate}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1 }}
                      className="h-full"
                      style={{ background: c.accent, boxShadow: `0 0 10px ${c.accent}` }}
                    />
                  </div>
                  <div className="font-arcade text-lg w-12 text-right" style={{ color: c.accent }}>
                    {cp.rate}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
