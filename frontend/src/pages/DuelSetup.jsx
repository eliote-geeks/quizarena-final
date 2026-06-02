import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [category, setCategory] = useState("histoire");
  const [stake, setStake] = useState(500);
  const [searching, setSearching] = useState(false);
  const [matched, setMatched] = useState(false);

  const startSearch = () => {
    if (stake > coins) {
      toast.error("Solde insuffisant", { description: `${t.common.coins}: ${coins}` });
      return;
    }
    setSearching(true);
    setTimeout(() => {
      setSearching(false);
      setMatched(true);
    }, 2200);
  };

  const startDuel = () => {
    navigate(`/play/${category}`);
  };

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">// 1v1_ARENA</div>
          <h1 className="font-display font-black uppercase tracking-tighter text-4xl sm:text-5xl lg:text-6xl">
            {t.duel.title}
          </h1>
          <p className="text-slate-400 mt-3 max-w-xl">{t.duel.subtitle}</p>
        </div>

        <AnimatePresence mode="wait">
          {!searching && !matched && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-12 gap-6"
            >
              {/* Category picker */}
              <div className="lg:col-span-7 p-6 rounded-2xl border border-white/10 bg-[#0B0B14]">
                <h2 className="font-display font-bold uppercase tracking-tight text-xl mb-5">
                  Choisis ta catégorie
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    const active = c.id === category;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        data-testid={`duel-cat-${c.id}`}
                        className="relative p-4 rounded-xl border-2 transition-all text-left"
                        style={{
                          borderColor: active ? AMBER : "rgba(255,255,255,0.08)",
                          background: active ? `${AMBER}10` : "#12121E",
                        }}
                      >
                        <Icon className="w-6 h-6 mb-3" style={{ color: active ? AMBER : "#9aa0a6" }} />
                        <div
                          className="font-display font-bold uppercase text-sm tracking-tight"
                          style={{ color: active ? AMBER : "#fff" }}
                        >
                          {c.name[lang]}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                          {c.questions} Q
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bet slip */}
              <div
                className="lg:col-span-5 p-6 rounded-2xl border-2 bg-[#05050A] relative"
                style={{ borderColor: `${AMBER}55` }}
              >
                <div className="scanline-bar opacity-50" />
                <div className="font-arcade text-2xl mb-1" style={{ color: AMBER }}>
                  &gt;_ BET_SLIP.EXE
                </div>
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-6">{t.duel.setStake}</div>

                <div className="mb-6">
                  <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">{t.duel.yourStake}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setStake((s) => Math.max(50, s - 50))}
                      className="p-3 border border-white/10 rounded-md hover:border-white/30"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={stake}
                      onChange={(e) => setStake(Math.max(50, parseInt(e.target.value) || 0))}
                      data-testid="bet-stake-input"
                      className="flex-1 px-4 py-3 rounded-md bg-black border border-white/10 font-arcade text-3xl text-center focus:outline-none"
                      style={{ color: AMBER, borderColor: `${AMBER}33` }}
                    />
                    <button
                      onClick={() => setStake((s) => Math.min(coins, s + 50))}
                      className="p-3 border border-white/10 rounded-md hover:border-white/30"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {STAKE_PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setStake(p)}
                        className="py-2 text-xs uppercase tracking-wider rounded-md border transition"
                        style={
                          stake === p
                            ? { borderColor: AMBER, color: AMBER, background: `${AMBER}10` }
                            : { borderColor: "rgba(255,255,255,0.1)", color: "#cbd5e1" }
                        }
                      >
                        {p.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 mb-6 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{t.duel.yourStake}</span>
                    <span className="font-arcade text-xl" style={{ color: AMBER }}>{stake.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{t.duel.potentialWin}</span>
                    <span data-testid="bet-slip-total" className="font-arcade text-2xl text-[#5DD66E]">
                      +{(stake * 2 - Math.round(stake * 0.05)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Frais plateforme (5%)</span>
                    <span>{Math.round(stake * 0.05)}</span>
                  </div>
                </div>

                <button
                  onClick={startSearch}
                  data-testid="bet-confirm-btn"
                  disabled={stake > coins}
                  className="w-full py-4 text-black font-bold uppercase tracking-widest rounded-md hover:shadow-[0_0_24px_rgba(229,168,0,0.5)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: AMBER }}
                >
                  <Search className="w-5 h-5" />
                  {t.duel.findOpponent}
                </button>
              </div>
            </motion.div>
          )}

          {searching && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-32 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 mx-auto rounded-full border-4 border-t-transparent mb-8"
                style={{ borderColor: AMBER }}
              />
              <div className="font-display font-bold uppercase text-3xl text-white mb-2">{t.duel.searching}</div>
              <div className="text-slate-500 text-sm">Scanning the arena...</div>
            </motion.div>
          )}

          {matched && (
            <motion.div
              key="matched"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12"
            >
              <div className="text-center mb-10">
                <div className="text-xs uppercase tracking-widest mb-3 font-bold" style={{ color: AMBER }}>
                  {t.duel.matched}
                </div>
                <h2 className="font-display font-black uppercase text-5xl tracking-tighter">
                  Match Trouvé
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center max-w-4xl mx-auto">
                <PlayerCard name="ArenaCadet" subtitle="Toi" />
                <div className="font-display font-black text-7xl text-center px-4" style={{ color: AMBER, textShadow: `0 0 28px ${AMBER}80` }}>
                  {t.duel.vs}
                </div>
                <PlayerCard name="QuantumKid" subtitle="Niv. 40" />
              </div>

              <div className="mt-10 max-w-md mx-auto p-5 rounded-xl bg-[#0B0B14] border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-widest text-slate-400">{t.common.prizePool}</span>
                  <span className="font-arcade text-3xl" style={{ color: AMBER }}>
                    {(stake * 2).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={startDuel}
                  data-testid="start-duel-btn"
                  className="w-full py-4 text-black font-bold uppercase tracking-widest rounded-md hover:shadow-[0_0_24px_rgba(229,168,0,0.5)] transition flex items-center justify-center gap-2"
                  style={{ background: AMBER }}
                >
                  <Swords className="w-5 h-5" /> {t.duel.startDuel} <ChevronRight className="w-5 h-5" />
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
    <div className="p-6 rounded-2xl border-2 bg-[#0B0B14] relative" style={{ borderColor: `${AMBER}55` }}>
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-black text-3xl mx-auto mb-4 border-2"
        style={{ background: `${AMBER}10`, color: AMBER, borderColor: AMBER }}
      >
        {name.substring(0, 2).toUpperCase()}
      </div>
      <div className="font-display font-bold uppercase text-xl text-center text-white">{name}</div>
      <div className="text-xs uppercase tracking-widest text-slate-500 text-center mt-1">{subtitle}</div>
    </div>
  );
}
