import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TOURNAMENTS, BRACKET, getCategory } from "../data/mockData";
import CategoryChip from "../components/CategoryChip";
import { Trophy, Users, Coins, Clock, Crown, ChevronRight } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";
import { toast } from "sonner";

export default function Tournaments() {
  const { t, lang, coins, addCoins } = useApp();
  const [selected, setSelected] = useState(TOURNAMENTS[0].id);
  const current = TOURNAMENTS.find((tr) => tr.id === selected);
  const cat = getCategory(current.category);

  const handleRegister = () => {
    if (coins < current.entryFee) {
      toast.error("Solde insuffisant");
      return;
    }
    addCoins(-current.entryFee);
    toast.success(`Inscrit à ${current.name[lang]}`, {
      description: `Frais: -${current.entryFee} ${t.common.coins}`,
    });
  };

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-[#00FFFF] mb-2">// BRACKETS</div>
          <h1 className="font-display font-black uppercase tracking-tighter text-4xl sm:text-5xl lg:text-6xl">
            {t.tournament.title}
          </h1>
          <p className="text-slate-400 mt-3">{t.tournament.subtitle}</p>
        </div>

        {/* Tournament list */}
        <div className="grid lg:grid-cols-3 gap-4 mb-10">
          {TOURNAMENTS.map((tr, i) => {
            const c = getCategory(tr.category);
            const active = tr.id === selected;
            return (
              <motion.button
                key={tr.id}
                onClick={() => setSelected(tr.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="text-left p-6 rounded-2xl border-2 bg-[#0B0B14] transition-all"
                style={{
                  borderColor: active ? c.accent : "rgba(255,255,255,0.1)",
                  boxShadow: active ? `0 0 30px ${c.accent}30` : "none",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <CategoryChip id={tr.category} />
                  <div className="font-arcade text-xl text-[#FF3333]">{tr.startsIn}</div>
                </div>
                <h3 className="font-display font-bold uppercase text-xl tracking-tight mb-4" style={{ color: active ? c.accent : "#fff" }}>
                  {tr.name[lang]}
                </h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500 uppercase tracking-widest text-[10px]">{t.tournament.entryFee}</div>
                    <div className="font-arcade text-base text-[#FFD700]">{tr.entryFee}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-widest text-[10px]">{t.tournament.slots}</div>
                    <div className="font-arcade text-base text-[#00FFFF]">{tr.registered}/{tr.slots}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 uppercase tracking-widest text-[10px]">{t.common.prizePool}</div>
                    <div className="font-arcade text-base text-[#39FF14]">{tr.prizePool.toLocaleString()}</div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Selected tournament details */}
        <div className="rounded-2xl border-2 bg-[#0B0B14] p-6 lg:p-8" style={{ borderColor: `${cat.accent}55` }}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Tournament</div>
              <h2 className="font-display font-black uppercase text-3xl tracking-tighter" style={{ color: cat.accent }}>
                {current.name[lang]}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#12121E] border border-white/10">
                <Coins className="w-4 h-4 text-[#FFD700]" />
                <span className="font-arcade text-xl text-[#FFD700]">{current.prizePool.toLocaleString()}</span>
              </div>
              <button
                onClick={handleRegister}
                data-testid="tournament-register-btn"
                className="px-6 py-3 bg-[#FFD700] text-black font-bold uppercase tracking-widest rounded-md hover:shadow-[0_0_24px_rgba(255,215,0,0.7)] transition flex items-center gap-2"
              >
                {t.tournament.register} <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bracket */}
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-4">{t.tournament.bracket}</div>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-max">
              {BRACKET.rounds.map((round, ri) => (
                <div key={round.label} className="flex flex-col justify-around min-w-[230px]">
                  <div className="text-[10px] uppercase tracking-widest text-[#00FFFF] mb-3 font-bold">
                    {t.tournament[round.label]}
                  </div>
                  <div className={`flex flex-col gap-${ri === 3 ? "0" : (ri + 1) * 4}`} style={{ gap: `${(ri + 1) * 16}px` }}>
                    {round.matches.map((m, mi) => (
                      <MatchNode key={mi} match={m} accent={cat.accent} isFinal={ri === 3} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchNode({ match, accent, isFinal }) {
  return (
    <div
      className="w-[210px] rounded-lg overflow-hidden border bg-[#12121E]"
      style={{ borderColor: isFinal ? "#FFD700" : "rgba(255,255,255,0.08)", boxShadow: isFinal ? "0 0 24px rgba(255,215,0,0.4)" : "none" }}
    >
      {isFinal && (
        <div className="bg-[#FFD700] text-black text-[10px] font-bold uppercase tracking-widest text-center py-1 flex items-center justify-center gap-1">
          <Crown className="w-3 h-3" /> Finale
        </div>
      )}
      <PlayerRow name={match.a} score={match.aScore} winner={match.winner === "a"} accent={accent} />
      <div className="border-t border-white/5" />
      <PlayerRow name={match.b} score={match.bScore} winner={match.winner === "b"} accent={accent} />
    </div>
  );
}

function PlayerRow({ name, score, winner, accent }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 text-sm"
      style={{
        background: winner ? `${accent}15` : "transparent",
        borderLeft: winner ? `3px solid ${accent}` : "3px solid transparent",
      }}
    >
      <div className={`truncate ${winner ? "font-bold text-white" : "text-slate-400"}`}>{name}</div>
      <div className={`font-arcade text-lg ${winner ? "" : "text-slate-500"}`} style={{ color: winner ? accent : "" }}>
        {score === null ? "—" : score}
      </div>
    </div>
  );
}
