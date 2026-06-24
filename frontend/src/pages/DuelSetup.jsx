import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { CATEGORIES } from "../data/mockData";
import { Search, Swords, ChevronRight, Plus, Minus } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";
import { toast } from "sonner";

const AMBER = "#E5A800";
const STAKE_PRESETS = [100, 250, 500, 1000, 2500, 5000];

export default function DuelSetup() {
  const { t, lang, coins } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const quickOpponent = location.state?.quickOpponent; // { name, elo } from profile challenge

  const [category, setCategory] = useState(location.state?.defaultCategory || "histoire");
  const [stake, setStake] = useState(location.state?.defaultStake || 500);
  const [searching, setSearching] = useState(false);
  const [matched, setMatched] = useState(!!quickOpponent); // skip straight to matched if invited
  const opponentName = quickOpponent?.name || "QuantumKid";
  const opponentElo  = quickOpponent?.elo  || 1120;

  const startSearch = () => {
    if (stake > coins) {
      toast.error("Solde insuffisant", { description: `${t.common.coins}: ${coins}` });
      return;
    }
    setSearching(true);
    setTimeout(() => { setSearching(false); setMatched(true); }, 2200);
  };

  const startDuel = () =>
    navigate("/duel/play", {
      state: { category, stake, opponentName, opponentElo },
    });

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-6">
          <h1 className="text-sm font-semibold text-white">{t.duel.title}</h1>
          <p className="text-xs text-white/40 mt-0.5">{t.duel.subtitle}</p>
        </div>

        <AnimatePresence mode="wait">
          {!searching && !matched && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid lg:grid-cols-12 gap-4"
            >
              {/* Category picker */}
              <div className="lg:col-span-7 rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/[0.06]">
                  <span className="text-xs font-medium text-white/50">
                    {lang === "fr" ? "Catégorie" : "Category"}
                  </span>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const active = c.id === category;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        data-testid={`duel-cat-${c.id}`}
                        className="flex items-center gap-2.5 p-3 rounded-lg border transition-all text-left"
                        style={{
                          borderColor: active ? `${AMBER}60` : "rgba(255,255,255,0.07)",
                          background: active ? `${AMBER}10` : "#12121E",
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: active ? `${AMBER}20` : "rgba(255,255,255,0.06)", color: active ? AMBER : "#9aa0a6" }}
                        >
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate" style={{ color: active ? AMBER : "#fff" }}>
                            {c.name[lang]}
                          </div>
                          <div className="text-[10px] text-white/25">{c.questions} Q</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bet slip */}
              <div className="lg:col-span-5 rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/[0.06]">
                  <span className="text-xs font-medium text-white/50">{t.duel.setStake}</span>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <div className="text-[10px] text-white/30 mb-2">{t.duel.yourStake}</div>
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setStake((s) => Math.max(50, s - 50))}
                        className="p-2 border border-white/[0.07] rounded-md hover:border-white/20 transition text-white/50 hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        value={stake}
                        onChange={(e) => setStake(Math.max(50, parseInt(e.target.value) || 0))}
                        data-testid="bet-stake-input"
                        className="flex-1 px-3 py-2 rounded-md bg-black/40 border font-arcade text-2xl text-center focus:outline-none"
                        style={{ color: AMBER, borderColor: `${AMBER}25` }}
                      />
                      <button
                        onClick={() => setStake((s) => Math.min(coins, s + 50))}
                        className="p-2 border border-white/[0.07] rounded-md hover:border-white/20 transition text-white/50 hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {STAKE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setStake(preset)}
                          className="py-1.5 text-xs rounded-md border transition"
                          style={
                            stake === preset
                              ? { borderColor: `${AMBER}60`, color: AMBER, background: `${AMBER}10` }
                              : { borderColor: "rgba(255,255,255,0.07)", color: "#94a3b8" }
                          }
                        >
                          {preset.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">{t.duel.yourStake}</span>
                      <span className="font-arcade text-base" style={{ color: AMBER }}>{stake.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">{t.duel.potentialWin}</span>
                      <span data-testid="bet-slip-total" className="font-arcade text-base text-[#5DD66E]">
                        +{(stake * 2 - Math.round(stake * 0.05)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/25">Frais (5%)</span>
                      <span className="text-[10px] text-white/25">{Math.round(stake * 0.05)}</span>
                    </div>
                  </div>

                  <button
                    onClick={startSearch}
                    data-testid="bet-confirm-btn"
                    disabled={stake > coins}
                    className="w-full py-2.5 text-black text-xs font-semibold rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    style={{ background: AMBER }}
                  >
                    <Search className="w-3.5 h-3.5" />
                    {t.duel.findOpponent}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {searching && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 mx-auto rounded-full border-2 border-t-transparent mb-6"
                style={{ borderColor: AMBER }}
              />
              <div className="text-sm font-semibold text-white mb-1">{t.duel.searching}</div>
              <div className="text-xs text-white/30">Scanning the arena…</div>
            </motion.div>
          )}

          {matched && (
            <motion.div
              key="matched"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto"
            >
              <div className="text-center mb-6">
                <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{t.duel.matched}</div>
                <h2 className="text-base font-semibold text-white">Match trouvé</h2>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-4">
                <PlayerCard name="ArenaCadet" subtitle="Toi" />
                <div className="font-arcade text-3xl px-2" style={{ color: AMBER }}>VS</div>
                <PlayerCard name={opponentName} subtitle={`ELO ${opponentElo}`} />
              </div>

              <div className="rounded-xl bg-[#0B0B14] border border-white/[0.07] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/40">{t.common.prizePool}</span>
                  <span className="font-arcade text-xl" style={{ color: AMBER }}>{(stake * 2).toLocaleString()}</span>
                </div>
                <button
                  onClick={startDuel}
                  data-testid="start-duel-btn"
                  className="w-full py-2.5 text-black text-xs font-semibold rounded-md transition flex items-center justify-center gap-1.5"
                  style={{ background: AMBER }}
                >
                  <Swords className="w-3.5 h-3.5" /> {t.duel.startDuel}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PlayerCard({ name, subtitle }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] p-4 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-base mx-auto mb-2 border"
        style={{ background: `${AMBER}12`, color: AMBER, borderColor: `${AMBER}35` }}
      >
        {name.substring(0, 2).toUpperCase()}
      </div>
      <div className="text-xs font-medium text-white/80">{name}</div>
      <div className="text-[10px] text-white/30 mt-0.5">{subtitle}</div>
    </div>
  );
}
