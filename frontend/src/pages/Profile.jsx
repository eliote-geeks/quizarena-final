import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { USER_PROFILE, getCategory } from "../data/mockData";
import { Swords, Brain, Zap, Star, Crown, Target, Trophy } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";

const AMBER = "#E5A800";
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
          className="rounded-3xl p-8 lg:p-10 mb-10 border border-white/10 relative overflow-hidden bg-[#0B0B14]"
        >
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-[#E5A800]/10 blur-[100px]" />
          <div className="relative grid md:grid-cols-[auto_1fr_auto] gap-8 items-center">
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center font-display font-black text-4xl border-2"
              style={{ background: `${AMBER}10`, color: AMBER, borderColor: AMBER }}
            >
              {p.avatar}
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40 mb-1">// CADET</div>
              <h1 className="font-display font-black uppercase tracking-tighter text-4xl lg:text-5xl mb-2">
                {p.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-slate-400 mb-3">
                <span>{t.common.level} <span className="font-bold" style={{ color: AMBER }}>{p.level}</span></span>
                <span>•</span>
                <span>Membre depuis {p.joined}</span>
              </div>
              <div className="max-w-md">
                <div className="flex items-center justify-between text-xs uppercase tracking-widest mb-1">
                  <span className="text-slate-500">{t.common.xp}</span>
                  <span className="font-arcade text-base" style={{ color: AMBER }}>{p.xp.toLocaleString()} / {p.xpNext.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-sm bg-white/5 border border-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full"
                    style={{ background: AMBER, boxShadow: `0 0 12px ${AMBER}80` }}
                  />
                </div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Rang Global</div>
              <div className="font-arcade text-5xl" style={{ color: AMBER }}>#142</div>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Trophy, label: t.profile.totalWins, value: p.wins },
            { icon: Swords, label: t.profile.totalGames, value: p.games },
            { icon: Target, label: t.profile.winRate, value: `${p.winRate}%` },
            { icon: Zap, label: t.profile.bestStreak, value: p.bestStreak },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl p-5 bg-[#0B0B14] border border-white/10 hover:border-[#E5A800]/40 transition">
                <Icon className="w-6 h-6 mb-3" style={{ color: AMBER }} />
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{s.label}</div>
                <div className="font-arcade text-3xl" style={{ color: AMBER }}>{s.value}</div>
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
                    className="aspect-square rounded-xl border flex flex-col items-center justify-center gap-2 p-2 transition hover:-translate-y-1 hover:border-[#E5A800]"
                    style={{ borderColor: "rgba(229,168,0,0.3)", background: "rgba(229,168,0,0.06)" }}
                  >
                    <Icon className="w-7 h-7" style={{ color: AMBER }} />
                    <div className="text-[10px] uppercase tracking-widest text-center text-white/70">
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
                      <c.icon className="w-4 h-4 flex-shrink-0" style={{ color: AMBER }} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{r.mode}</div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 truncate">
                          {c.name[lang]}
                        </div>
                      </div>
                    </div>
                    <div className={`font-arcade text-lg flex-shrink-0 ${won ? "text-[#5DD66E]" : "text-[#E67373]"}`}>
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
                    <c.icon className="w-4 h-4 flex-shrink-0" style={{ color: AMBER }} />
                    <span className="text-sm font-medium text-white truncate">{c.name[lang]}</span>
                  </div>
                  <div className="flex-1 h-3 rounded-sm bg-white/5 border border-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${cp.rate}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1 }}
                      className="h-full"
                      style={{ background: AMBER, boxShadow: `0 0 10px ${AMBER}80` }}
                    />
                  </div>
                  <div className="font-arcade text-lg w-12 text-right" style={{ color: AMBER }}>
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
