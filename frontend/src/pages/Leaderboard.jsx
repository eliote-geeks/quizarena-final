import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TOP_PLAYERS } from "../data/mockData";
import { Crown, TrendingUp, Coins, Flame } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";

const TABS = [
  { id: "all", labelKey: "allTime" },
  { id: "week", labelKey: "thisWeek" },
];

export default function Leaderboard() {
  const { t } = useApp();
  const [tab, setTab] = useState("all");

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-[#FFD700] mb-2">// HALL OF FAME</div>
          <h1 className="font-display font-black uppercase tracking-tighter text-4xl sm:text-5xl lg:text-6xl">
            {t.leaderboard.title}
          </h1>
          <p className="text-slate-400 mt-3">{t.leaderboard.subtitle}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              data-testid={`lb-tab-${tb.id}`}
              className={`px-4 py-2 text-xs uppercase tracking-widest font-bold rounded-md transition ${
                tab === tb.id
                  ? "bg-[#FFD700] text-black"
                  : "bg-[#0B0B14] border border-white/10 text-slate-300 hover:border-white/30"
              }`}
            >
              {t.leaderboard[tb.labelKey]}
            </button>
          ))}
        </div>

        {/* Podium for top 3 */}
        <div className="grid grid-cols-3 gap-4 mb-10 max-w-4xl mx-auto">
          {[1, 0, 2].map((idx) => {
            const p = TOP_PLAYERS[idx];
            const rank = idx + 1;
            const colors = { 0: "#FFD700", 1: "#C0C0C0", 2: "#CD7F32" };
            const heights = { 0: "h-44", 1: "h-32", 2: "h-24" };
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-3">
                  {rank === 1 && (
                    <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7 text-[#FFD700]" />
                  )}
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-black text-2xl border-2"
                    style={{ background: `${colors[idx]}15`, color: colors[idx], borderColor: colors[idx] }}
                  >
                    {p.avatar}
                  </div>
                </div>
                <div className="font-display font-bold uppercase text-sm mb-1 text-center">{p.name}</div>
                <div className="font-arcade text-2xl mb-3" style={{ color: colors[idx] }}>
                  {p.earnings.toLocaleString()}
                </div>
                <div
                  className={`w-full ${heights[idx]} rounded-t-xl flex items-center justify-center font-display font-black text-4xl`}
                  style={{ background: `${colors[idx]}22`, borderTop: `4px solid ${colors[idx]}`, color: colors[idx] }}
                >
                  #{rank}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/10 bg-[#0B0B14] overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_100px_100px_140px_80px] gap-4 px-6 py-3 border-b border-white/10 text-[10px] uppercase tracking-widest text-slate-500">
            <div>{t.leaderboard.rank}</div>
            <div>{t.leaderboard.player}</div>
            <div className="text-right">{t.leaderboard.wins}</div>
            <div className="text-right">{t.leaderboard.winRate}</div>
            <div className="text-right">{t.leaderboard.earnings}</div>
            <div className="text-right">Streak</div>
          </div>
          {TOP_PLAYERS.map((p, i) => (
            <div
              key={p.id}
              data-testid={`lb-row-${i + 1}`}
              className="grid grid-cols-[60px_1fr_100px_100px_140px_80px] gap-4 px-6 py-4 border-b border-white/5 hover:bg-white/[0.02] transition items-center"
            >
              <div className="font-arcade text-2xl" style={{ color: i < 3 ? "#FFD700" : "#606070" }}>
                {i + 1}
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-md bg-[#12121E] border border-white/10 flex items-center justify-center font-display font-bold text-sm">
                  {p.avatar}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">{p.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">
                    {t.common.level} {p.level} • {p.country}
                  </div>
                </div>
              </div>
              <div className="text-right font-arcade text-xl text-white">{p.wins}</div>
              <div className="text-right">
                <span className="font-medium" style={{ color: p.winRate >= 70 ? "#39FF14" : p.winRate >= 60 ? "#FFD700" : "#FF3333" }}>
                  {p.winRate}%
                </span>
              </div>
              <div className="text-right font-arcade text-xl text-[#FFD700]">{p.earnings.toLocaleString()}</div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[#FF3333]">
                  <Flame className="w-3.5 h-3.5" /> {p.streak}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
