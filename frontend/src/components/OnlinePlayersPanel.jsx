import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { ONLINE_PLAYERS } from "../data/mockData";
import { getRank } from "../lib/eloEngine";
import { Swords, User } from "lucide-react";

const AMBER = "#E5A800";

const STATUS = {
  lobby:  { color: "#5DD66E", label: "Disponible" },
  ingame: { color: AMBER,     label: "En partie"  },
  away:   { color: "#505060", label: "Absent"     },
};

export default function OnlinePlayersPanel() {
  const { lang } = useApp();
  const navigate = useNavigate();
  const onlineCount = ONLINE_PLAYERS.filter(p => p.status !== "away").length;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <span className="text-xs font-medium text-white/50">
          {lang === "fr" ? "Joueurs en ligne" : "Online players"}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5DD66E]" />
          <span className="text-[10px] text-white/30">{onlineCount} connectés</span>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {ONLINE_PLAYERS.map((p, i) => {
          const rank = getRank(p.elo);
          const st = STATUS[p.status];
          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border"
                    style={{ background: `${AMBER}10`, color: AMBER, borderColor: `${AMBER}25` }}
                  >
                    {p.avatar}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0B0B14]"
                    style={{ background: st.color }}
                  />
                </div>

                <div className="min-w-0">
                  <button
                    onClick={() => navigate("/player/" + p.name)}
                    className="text-xs font-medium text-white/80 hover:text-white transition truncate block text-left"
                  >
                    {p.name}
                  </button>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px]" style={{ color: rank.color }}>{rank.emoji}</span>
                    <span className="font-arcade text-[10px] leading-none" style={{ color: rank.color }}>{p.elo}</span>
                    <span className="text-[9px] text-white/20">·</span>
                    <span className="text-[9px]" style={{ color: st.color }}>{st.label}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => navigate("/player/" + p.name)}
                  className="p-1.5 rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition"
                  title="Voir le profil"
                >
                  <User className="w-3 h-3" />
                </button>
                {p.status === "lobby" && (
                  <button
                    onClick={() => navigate("/duel", { state: { quickOpponent: { name: p.name, elo: p.elo } } })}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition"
                    style={{ background: `${AMBER}15`, color: AMBER }}
                    title="Défier en duel"
                  >
                    <Swords className="w-2.5 h-2.5" />
                    Défier
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
