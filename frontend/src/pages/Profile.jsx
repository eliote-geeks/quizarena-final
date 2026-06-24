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
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Identity card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 border border-white/[0.07] bg-[#0B0B14]"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-bold text-xl border flex-shrink-0"
              style={{ background: `${AMBER}15`, color: AMBER, borderColor: `${AMBER}40` }}
            >
              {p.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-base font-semibold text-white truncate">{p.name}</h1>
                <span className="text-xs text-white/30">·</span>
                <span className="text-xs text-white/40">{t.common.level} <span style={{ color: AMBER }}>{p.level}</span></span>
              </div>
              <div className="text-xs text-white/30 mb-2">Membre depuis {p.joined}</div>
              <div>
                <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
                  <span>{t.common.xp}</span>
                  <span style={{ color: AMBER }}>{p.xp.toLocaleString()} / {p.xpNext.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: AMBER }}
                  />
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] text-white/30 mb-0.5">Rang global</div>
              <div className="font-arcade text-2xl leading-none" style={{ color: AMBER }}>#142</div>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Trophy, label: t.profile.totalWins, value: p.wins },
            { icon: Swords, label: t.profile.totalGames, value: p.games },
            { icon: Target, label: t.profile.winRate, value: `${p.winRate}%` },
            { icon: Zap, label: t.profile.bestStreak, value: p.bestStreak },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl p-3.5 bg-[#0B0B14] border border-white/[0.07]">
                <Icon className="w-3.5 h-3.5 mb-2" style={{ color: AMBER }} />
                <div className="text-[10px] text-white/30 mb-0.5">{s.label}</div>
                <div className="font-arcade text-xl leading-none" style={{ color: AMBER }}>{s.value}</div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-3">
          {/* Badges */}
          <div className="lg:col-span-2 rounded-xl bg-[#0B0B14] border border-white/[0.07] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-white/50">{t.profile.badges}</span>
            </div>
            <div className="p-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {p.badges.map((b) => {
                const Icon = ICONS[b.icon] || Star;
                return (
                  <div
                    key={b.id}
                    data-testid={`badge-${b.id}`}
                    className="aspect-square rounded-lg border flex flex-col items-center justify-center gap-1.5 p-1.5 transition hover:border-amber-400/40"
                    style={{ borderColor: `${AMBER}20`, background: `${AMBER}06` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: AMBER }} />
                    <div className="text-[8px] text-white/50 text-center leading-tight">{b.name[lang]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent matches */}
          <div className="rounded-xl bg-[#0B0B14] border border-white/[0.07] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-white/50">{t.profile.recentMatches}</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {p.recent.map((r, i) => {
                const c = getCategory(r.category);
                const won = r.result === "win";
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <c.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: AMBER }} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white/70 truncate">{r.mode}</div>
                        <div className="text-[10px] text-white/30 truncate">{c.name[lang]}</div>
                      </div>
                    </div>
                    <div className={`font-arcade text-base leading-none flex-shrink-0 ${won ? "text-[#5DD66E]" : "text-[#E67373]"}`}>
                      {won ? "+" : ""}{r.delta}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category performance */}
        <div className="rounded-xl bg-[#0B0B14] border border-white/[0.07] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-white/50">{t.profile.categoryPerf}</span>
          </div>
          <div className="p-4 space-y-3">
            {p.categoryPerf.map((cp) => {
              const c = getCategory(cp.id);
              return (
                <div key={cp.id} className="flex items-center gap-3">
                  <div className="w-28 flex items-center gap-1.5 flex-shrink-0">
                    <c.icon className="w-3.5 h-3.5" style={{ color: AMBER }} />
                    <span className="text-xs text-white/60 truncate">{c.name[lang]}</span>
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${cp.rate}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{ background: AMBER }}
                    />
                  </div>
                  <div className="font-arcade text-sm w-10 text-right flex-shrink-0" style={{ color: AMBER }}>
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
