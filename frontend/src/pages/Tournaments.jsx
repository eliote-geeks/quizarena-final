import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TOURNAMENTS, BRACKET, REPLAYS, getCategory } from "../data/mockData";
import CategoryChip from "../components/CategoryChip";
import SpectateModal from "../components/SpectateModal";
import ReplayModal from "../components/ReplayModal";
import {
  Coins, Crown, ChevronRight, Radio, ChevronDown, ChevronUp,
  UserPlus, Swords, Trophy, Zap, Play, Eye,
} from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";
import { toast } from "sonner";

const AMBER = "#E5A800";

const ROUND_LABELS = {
  round1: "1/8 de finale",
  round2: "Quarts",
  round3: "Demis",
  round4: "Finale",
};

// Tick live finale scores
function useFinaleScore() {
  const [aScore, setAScore] = useState(3);
  const [bScore, setBScore] = useState(2);
  const ref = useRef({ a: 3, b: 2 });
  useEffect(() => {
    const id = setInterval(() => {
      if (ref.current.a >= 10 && ref.current.b >= 10) { clearInterval(id); return; }
      const r = Math.random();
      if (r < 0.48) { ref.current.a = Math.min(10, ref.current.a + 1); setAScore(ref.current.a); }
      else if (r < 0.82) { ref.current.b = Math.min(10, ref.current.b + 1); setBScore(ref.current.b); }
    }, 5000 + Math.random() * 3500);
    return () => clearInterval(id);
  }, []);
  return [aScore, bScore];
}

export default function Tournaments() {
  const { t, lang, coins, addCoins } = useApp();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(TOURNAMENTS[0].id);
  const [activeRound, setActiveRound] = useState(BRACKET.rounds.length - 1);
  const [howOpen, setHowOpen] = useState(false);
  const [replayMatch, setReplayMatch] = useState(null);
  const [spectatingFinale, setSpectatingFinale] = useState(false);
  const [activeTab, setActiveTab] = useState("bracket"); // "bracket" | "replays"
  const current = TOURNAMENTS.find((tr) => tr.id === selected);
  const [finaleA, finaleB] = useFinaleScore();

  const handleRegister = () => {
    if (coins < current.entryFee) { toast.error("Solde insuffisant"); return; }
    addCoins(-current.entryFee);
    toast.success(`Inscrit à ${current.name[lang]}`, {
      description: `Frais: -${current.entryFee} ${t.common.coins}`,
    });
  };

  const rounds = BRACKET.rounds;
  const currentMatches = rounds[activeRound]?.matches || [];
  const isFinale = activeRound === rounds.length - 1;

  return (
    <>
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Page header */}
        <div>
          <h1 className="text-sm font-semibold text-white">{t.tournament.title}</h1>
          <p className="text-xs text-white/40 mt-0.5">{t.tournament.subtitle}</p>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">
          <button
            onClick={() => setHowOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition"
          >
            <span className="text-xs font-medium text-white/50">
              Comment ça marche ?
            </span>
            {howOpen
              ? <ChevronUp className="w-3.5 h-3.5 text-white/30" />
              : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
          </button>

          <AnimatePresence>
            {howOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-white/[0.06]">
                  <div className="grid sm:grid-cols-4 gap-3 pt-4">
                    {[
                      {
                        step: "01",
                        icon: UserPlus,
                        title: "S'inscrire",
                        desc: "Paie les frais d'entrée avant le début du tournoi. Plus de joueurs = plus grande cagnotte.",
                      },
                      {
                        step: "02",
                        icon: Swords,
                        title: "Jouer les duels",
                        desc: "Quand le chrono atteint 0, tu affronte un adversaire en quiz MCQ 10 questions. Le meilleur score avance.",
                      },
                      {
                        step: "03",
                        icon: Trophy,
                        title: "Avancer dans le bracket",
                        desc: "1/8 → Quarts → Demis → Finale. Chaque victoire t'amène un tour plus haut.",
                      },
                      {
                        step: "04",
                        icon: Zap,
                        title: "Empocher la cagnotte",
                        desc: "Le gagnant de la finale remporte toute la prize pool. Les finalistes peuvent gagner un prix de consolation.",
                      },
                    ].map((s, i) => {
                      const Icon = s.icon;
                      return (
                        <motion.div
                          key={s.step}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex gap-3"
                        >
                          <div className="flex-shrink-0 pt-0.5">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center"
                              style={{ background: `${AMBER}18`, color: AMBER }}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-white/20 mb-0.5">{s.step}</div>
                            <div className="text-xs font-medium text-white mb-0.5">{s.title}</div>
                            <div className="text-[10px] text-white/35 leading-relaxed">{s.desc}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── TOURNAMENT CARDS ── */}
        <div className="grid sm:grid-cols-3 gap-3">
          {TOURNAMENTS.map((tr, i) => {
            const active = tr.id === selected;
            const fillPct = (tr.registered / tr.slots) * 100;
            return (
              <motion.button
                key={tr.id}
                onClick={() => setSelected(tr.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="text-left p-4 rounded-xl border transition-all"
                style={{
                  borderColor: active ? `${AMBER}50` : "rgba(255,255,255,0.07)",
                  background: active ? `${AMBER}08` : "#0B0B14",
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <CategoryChip id={tr.category} />
                  <span className="text-[10px] text-white/30 font-arcade">{tr.startsIn}</span>
                </div>
                <div className="text-sm font-medium text-white mb-3">{tr.name[lang]}</div>

                {/* Registration fill */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] text-white/30 mb-1">
                    <span>{tr.registered}/{tr.slots} joueurs</span>
                    <span style={{ color: fillPct > 85 ? "#FF6B6B" : AMBER }}>{Math.round(fillPct)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${fillPct}%` }}
                      transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.07 + 0.2 }}
                      className="h-full rounded-full"
                      style={{ background: fillPct > 85 ? "#FF6B6B" : AMBER }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-white/25">{t.common.prizePool}</div>
                  <div className="font-arcade text-base" style={{ color: AMBER }}>
                    {tr.prizePool.toLocaleString()}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── BRACKET / REPLAYS ── */}
        <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
            <div>
              <div className="text-[10px] text-white/25 mb-0.5">{current.name[lang]}</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-[#FF5555]">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  Finale en cours
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#12121E] border border-white/[0.06]">
                <Coins className="w-3.5 h-3.5" style={{ color: AMBER }} />
                <span className="font-arcade text-base" style={{ color: AMBER }}>{current.prizePool.toLocaleString()}</span>
              </div>
              <button
                onClick={handleRegister}
                data-testid="tournament-register-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 text-black text-xs font-semibold rounded-md transition hover:opacity-90"
                style={{ background: AMBER }}
              >
                {t.tournament.register} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main tab switch: Bracket / Rediffusions */}
          <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-white/[0.05]">
            {[
              { key: "bracket", label: "Bracket" },
              { key: "replays", label: `Rediffusions (${REPLAYS.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-3 py-1.5 -mb-px text-xs font-medium border-b-2 transition"
                style={activeTab === tab.key
                  ? { borderColor: AMBER, color: AMBER }
                  : { borderColor: "transparent", color: "rgba(255,255,255,0.35)" }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            <AnimatePresence mode="wait">

              {/* ── BRACKET TAB ── */}
              {activeTab === "bracket" && (
                <motion.div
                  key="bracket"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Round tabs */}
                  <div className="flex gap-1 mb-4 overflow-x-auto">
                    {rounds.map((r, ri) => {
                      const isLive = ri === rounds.length - 1;
                      const isActive = ri === activeRound;
                      return (
                        <button
                          key={r.label}
                          onClick={() => setActiveRound(ri)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition flex-shrink-0 border"
                          style={isActive
                            ? { borderColor: `${AMBER}50`, background: `${AMBER}10`, color: AMBER }
                            : { borderColor: "transparent", color: "rgba(255,255,255,0.35)" }}
                        >
                          {isLive && <Radio className="w-2.5 h-2.5 text-[#FF5555] animate-pulse" />}
                          {ROUND_LABELS[r.label]}
                          <span className="text-[10px] opacity-50">({r.matches.length})</span>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeRound}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                    >
                      {isFinale ? (
                        <FinaleCard
                          match={rounds[activeRound].matches[0]}
                          liveA={finaleA}
                          liveB={finaleB}
                          onViewProfile={(name) => navigate("/player/" + name)}
                          onSpectate={() => setSpectatingFinale(true)}
                        />
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-2">
                          {currentMatches.map((m, mi) => (
                            <motion.div
                              key={mi}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: mi * 0.04 }}
                            >
                              <MatchCard match={m} onViewProfile={(name) => navigate("/player/" + name)} />
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}

              {/* ── REPLAYS TAB ── */}
              {activeTab === "replays" && (
                <motion.div
                  key="replays"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  {REPLAYS.map((rp, i) => {
                    const cat = getCategory(rp.category);
                    const aWon = rp.scoreA > rp.scoreB;
                    return (
                      <motion.div
                        key={rp.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl border border-white/[0.06] bg-[#0D0D18]"
                      >
                        <div className="flex-shrink-0">
                          {cat && <cat.icon className="w-4 h-4" style={{ color: AMBER }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white/70 truncate">
                            <button onClick={() => navigate("/player/" + rp.playerA)} className="hover:text-white transition">{rp.playerA}</button>
                            <span className="text-white/25 mx-1.5">vs</span>
                            <button onClick={() => navigate("/player/" + rp.playerB)} className="hover:text-white transition">{rp.playerB}</button>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/30">{rp.tournament} · {rp.round}</span>
                            <span className="text-[10px] text-white/20">· {rp.date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="font-arcade text-base leading-none" style={{ color: aWon ? AMBER : "rgba(255,255,255,0.3)" }}>
                              {rp.scoreA}–{rp.scoreB}
                            </div>
                            <div className="text-[9px] text-white/20 mt-0.5">{rp.duration}</div>
                          </div>
                          <button
                            onClick={() => setReplayMatch(rp)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition"
                            style={{ background: `${AMBER}15`, color: AMBER }}
                          >
                            <Play className="w-3 h-3" /> Revoir
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>

    {spectatingFinale && (
      <SpectateModal
        match={{ id: "finale", category: "histoire", players: ["NeoQuiz", "AtomBlitz"], pool: 8000, round: Math.min(finaleA + finaleB + 1, 10), total: 10 }}
        onClose={() => setSpectatingFinale(false)}
      />
    )}
    {replayMatch && (
      <ReplayModal replay={replayMatch} onClose={() => setReplayMatch(null)} />
    )}
    </>
  );
}

/* ── Regular match card ── */
function MatchCard({ match, onViewProfile }) {
  const isPlayed = match.winner !== null;
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "#12121E", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <PlayerRow2 name={match.a} score={match.aScore} winner={match.winner === "a"} onViewProfile={onViewProfile} />
      <div className="border-t border-white/[0.05]" />
      <PlayerRow2 name={match.b} score={match.bScore} winner={match.winner === "b"} onViewProfile={onViewProfile} />
      {!isPlayed && (
        <div className="px-3 py-1.5 border-t border-white/[0.04]">
          <span className="text-[9px] text-white/20 italic">À venir</span>
        </div>
      )}
    </div>
  );
}

function PlayerRow2({ name, score, winner, onViewProfile }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5"
      style={{
        background: winner ? `${AMBER}10` : "transparent",
        borderLeft: `3px solid ${winner ? AMBER : "transparent"}`,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
          style={{ background: winner ? `${AMBER}20` : "rgba(255,255,255,0.06)", color: winner ? AMBER : "rgba(255,255,255,0.25)" }}
        >
          {name.substring(0, 2).toUpperCase()}
        </div>
        <button
          onClick={() => onViewProfile?.(name)}
          className={`text-xs transition hover:underline ${winner ? "font-medium text-white" : "text-white/40 hover:text-white/70"}`}
        >
          {name}
        </button>
        {winner && <Crown className="w-3 h-3" style={{ color: AMBER }} />}
      </div>
      <span className="font-arcade text-base" style={{ color: winner ? AMBER : "#404050" }}>
        {score === null ? "—" : score}
      </span>
    </div>
  );
}

/* ── Finale card (live) ── */
function FinaleCard({ match, liveA, liveB, onViewProfile, onSpectate }) {
  const aLeads = liveA > liveB;
  const bLeads = liveB > liveA;
  const maxPossible = 10;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "#0D0D18",
        borderColor: `${AMBER}50`,
        boxShadow: `0 0 20px ${AMBER}18`,
      }}
    >
      {/* Finale header */}
      <div
        className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-black"
        style={{ background: AMBER }}
      >
        <Crown className="w-3.5 h-3.5" />
        <Radio className="w-3 h-3 animate-pulse" />
        Finale — En direct
      </div>

      {/* VS layout */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-6 py-5">
        {/* Player A */}
        <div className={`text-center transition-all duration-500 ${aLeads ? "opacity-100" : "opacity-50"}`}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm mx-auto mb-2 border"
            style={{ background: `${AMBER}15`, color: AMBER, borderColor: `${AMBER}40` }}
          >
            {match.a.substring(0, 2).toUpperCase()}
          </div>
          <button onClick={() => onViewProfile?.(match.a)} className="text-xs font-medium text-white mb-1 hover:underline block">{match.a}</button>
          <motion.div
            key={liveA}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="font-arcade text-4xl leading-none"
            style={{ color: AMBER }}
          >
            {liveA}
          </motion.div>
        </div>

        {/* VS + progress */}
        <div className="text-center">
          <div className="font-arcade text-sm text-white/20 mb-3">VS</div>
          {/* Mini round progress dots */}
          <div className="flex flex-col gap-1 items-center">
            {Array.from({ length: maxPossible }).map((_, i) => {
              const aHas = i < liveA;
              const bHas = i < liveB;
              return (
                <div key={i} className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: aHas ? AMBER : "rgba(255,255,255,0.08)" }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: bHas ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.08)" }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Player B */}
        <div className={`text-center transition-all duration-500 ${bLeads ? "opacity-100" : "opacity-50"}`}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm mx-auto mb-2 border border-white/[0.12]"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
          >
            {match.b.substring(0, 2).toUpperCase()}
          </div>
          <button onClick={() => onViewProfile?.(match.b)} className="text-xs font-medium text-white/60 mb-1 hover:underline block">{match.b}</button>
          <motion.div
            key={liveB}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.25 }}
            className="font-arcade text-4xl leading-none text-white/50"
          >
            {liveB}
          </motion.div>
        </div>
      </div>

      <div className="px-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-white/25">
          <Radio className="w-2.5 h-2.5 text-[#FF5555] animate-pulse" />
          Question {Math.min(liveA + liveB + 1, 10)} / 10 en cours…
        </div>
        <button
          onClick={onSpectate}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition"
          style={{ background: `${AMBER}15`, color: AMBER }}
        >
          <Eye className="w-3 h-3" /> Regarder
        </button>
      </div>
    </div>
  );
}
