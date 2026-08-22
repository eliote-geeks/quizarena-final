import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getMockPlayerProfile, getCategory } from "../data/mockData";
import { X, Swords, Trophy, Target, Zap, Brain, Crown, Star } from "lucide-react";

const AMBER = "#E5A800";
const ICONS = { swords: Swords, brain: Brain, zap: Zap, star: Star, crown: Crown, target: Target };

export default function PlayerProfileModal({ playerName, onClose }) {
  const { lang } = useApp();
  const navigate = useNavigate();
  const p = getMockPlayerProfile(playerName);
  const xpPct = (p.wins / p.games) * 100;

  const handleChallenge = () => {
    onClose();
    navigate("/duel", { state: { quickOpponent: { name: p.name, elo: p.elo } } });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
        style={{ background: "rgba(5,5,10,0.88)", backdropFilter: "blur(14px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 34 }}
          onClick={e => e.stopPropagation()}
          className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-white/[0.08] overflow-hidden"
          style={{ background: "var(--qa-surface)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-white/40">Profil joueur</span>
            <button onClick={onClose} className="p-1.5 rounded-md text-white/30 hover:text-white/70 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border flex-shrink-0"
                style={{ background: `${AMBER}15`, color: AMBER, borderColor: `${AMBER}35` }}
              >
                {p.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-white">{p.name}</span>
                </div>
                <div className="text-[10px] text-white/30">Membre depuis {p.joined}</div>
                <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${xpPct}%`, background: AMBER }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-display text-xl font-extrabold leading-none" style={{ color: AMBER }}>{p.wins}</div>
                <div className="text-[10px] text-white/25 mt-0.5">victoires</div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Trophy, label: "Victoires", value: p.wins },
                { icon: Swords, label: "Parties", value: p.games },
                { icon: Target, label: "Win rate", value: `${p.winRate}%` },
                { icon: Zap, label: "Série", value: p.streak },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-lg p-2.5 bg-[#0D0D18] border border-white/[0.06] text-center">
                    <Icon className="w-3 h-3 mx-auto mb-1" style={{ color: AMBER }} />
                    <div className="font-arcade text-base leading-none mb-0.5" style={{ color: AMBER }}>{s.value}</div>
                    <div className="text-[9px] text-white/25">{s.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Badges */}
            {p.badges.length > 0 && (
              <div>
                <div className="text-[10px] text-white/25 mb-2 uppercase tracking-widest">Badges</div>
                <div className="flex gap-2">
                  {p.badges.map(b => {
                    const Icon = ICONS[b.icon] || Star;
                    return (
                      <div
                        key={b.id}
                        className="w-9 h-9 rounded-lg flex flex-col items-center justify-center border"
                        style={{ background: `${AMBER}08`, borderColor: `${AMBER}20` }}
                        title={b.name[lang]}
                      >
                        <Icon className="w-4 h-4" style={{ color: AMBER }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent results */}
            <div>
              <div className="text-[10px] text-white/25 mb-2 uppercase tracking-widest">Dernières parties</div>
              <div className="space-y-1">
                {p.recent.map((r, i) => {
                  const cat = getCategory(r.category);
                  const won = r.result === "win";
                  return (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0D0D18]">
                      <div className="flex items-center gap-2 min-w-0">
                        {cat && <cat.icon className="w-3 h-3 flex-shrink-0" style={{ color: AMBER }} />}
                        <span className="text-xs text-white/50 truncate">{r.mode} · {cat?.name[lang]}</span>
                      </div>
                      <span
                        className="font-arcade text-sm flex-shrink-0 ml-2"
                        style={{ color: won ? "#5DD66E" : "#FF5555" }}
                      >
                        {won ? "+" : ""}{r.delta}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleChallenge}
              className="w-full flex items-center justify-center gap-2 py-3 text-black text-sm font-semibold rounded-xl transition hover:opacity-90"
              style={{ background: AMBER }}
            >
              <Swords className="w-4 h-4" />
              Défier en duel
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
