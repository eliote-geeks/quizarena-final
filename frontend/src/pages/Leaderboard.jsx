import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TOP_PLAYERS } from "../data/mockData";
import { Crown, Flame } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";

const AMBER = "#E5A800";
const TABS = [
  { id: "all", labelKey: "allTime" },
  { id: "week", labelKey: "thisWeek" },
];

export default function Leaderboard() {
  const { t } = useApp();
  const [tab, setTab] = useState("all");

  const podiumColors = { 0: AMBER, 1: "#9aa0a6", 2: "#a37247" };
  const podiumHeights = { 0: "h-28", 1: "h-20", 2: "h-14" };

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold text-white">{t.leaderboard.title}</h1>
            <p className="text-xs text-white/40 mt-0.5">{t.leaderboard.subtitle}</p>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-[#0B0B14] border border-white/[0.07] self-start sm:self-auto">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                data-testid={`lb-tab-${tb.id}`}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  tab === tb.id
                    ? "text-black font-semibold"
                    : "text-white/40 hover:text-white/70"
                }`}
                style={tab === tb.id ? { background: AMBER } : {}}
              >
                {t.leaderboard[tb.labelKey]}
              </button>
            ))}
          </div>
        </div>

        {/* Podium top 3 */}
        <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] p-6">
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[1, 0, 2].map((idx) => {
              const p = TOP_PLAYERS[idx];
              const rank = idx + 1;
              const color = podiumColors[idx];
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative mb-2">
                    {rank === 1 && (
                      <Crown className="absolute -top-5 left-1/2 -translate-x-1/2 w-4 h-4" style={{ color: AMBER }} />
                    )}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-base border"
                      style={{ background: `${color}15`, color, borderColor: `${color}60` }}
                    >
                      {p.avatar}
                    </div>
                  </div>
                  <div className="text-[10px] font-medium text-white/70 text-center mb-1 truncate w-full text-center">{p.name}</div>
                  <div className="font-arcade text-sm mb-2" style={{ color }}>{p.earnings.toLocaleString()}</div>
                  <div
                    className={`w-full ${podiumHeights[idx]} rounded-t-lg flex items-center justify-center font-arcade text-xl`}
                    style={{ background: `${color}12`, borderTop: `2px solid ${color}50`, color }}
                  >
                    #{rank}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Full table */}
        <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <div className="min-w-[480px]">
              <div className="grid grid-cols-[40px_1fr_70px_70px_100px_60px] gap-3 px-4 py-2.5 border-b border-white/[0.06] text-[10px] uppercase tracking-widest text-white/25">
                <div>{t.leaderboard.rank}</div>
                <div>{t.leaderboard.player}</div>
                <div className="text-right">{t.leaderboard.wins}</div>
                <div className="text-right">{t.leaderboard.winRate}</div>
                <div className="text-right">{t.leaderboard.earnings}</div>
                <div className="text-right">Streak</div>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {TOP_PLAYERS.map((p, i) => (
                  <div
                    key={p.id}
                    data-testid={`lb-row-${i + 1}`}
                    className="grid grid-cols-[40px_1fr_70px_70px_100px_60px] gap-3 px-4 py-3 hover:bg-white/[0.02] transition items-center"
                  >
                    <div className="font-arcade text-base leading-none" style={{ color: i < 3 ? AMBER : "#505060" }}>
                      {i + 1}
                    </div>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-[#12121E] border border-white/[0.06] flex items-center justify-center font-medium text-xs text-white/70 flex-shrink-0">
                        {p.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white/80 truncate">{p.name}</div>
                        <div className="text-[10px] text-white/25">{t.common.level} {p.level} · {p.country}</div>
                      </div>
                    </div>
                    <div className="text-right font-arcade text-base text-white/70">{p.wins}</div>
                    <div className="text-right text-xs text-white/60">{p.winRate}%</div>
                    <div className="text-right font-arcade text-base" style={{ color: AMBER }}>{p.earnings.toLocaleString()}</div>
                    <div className="text-right flex items-center justify-end gap-1 text-white/40">
                      <Flame className="w-3 h-3" style={{ color: AMBER }} />
                      <span className="text-xs">{p.streak}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
