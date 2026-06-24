import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { QUESTIONS, getCategory } from "../data/mockData";
import { X, Eye, Coins } from "lucide-react";

const AMBER = "#E5A800";
const LABELS = ["A", "B", "C", "D"];
const TIME_PER_Q = 15;

function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function SpectateModal({ match, onClose }) {
  const { lang } = useApp();
  const cat = getCategory(match.category);
  const allQ = useMemo(() => pickRandom(QUESTIONS[match.category] || [], match.total), [match]);

  // The match is already mid-game: start from current round
  const startRound = match.round - 1; // 0-indexed
  const [qIdx, setQIdx] = useState(startRound);
  const [timeLeft, setTimeLeft] = useState(() => Math.floor(6 + Math.random() * 7));
  // Approximate scores for what's happened before current round
  const [p1Score, setP1Score] = useState(() => Math.round(startRound * 0.73));
  const [p2Score, setP2Score] = useState(() => Math.round(startRound * 0.60));
  const [p1Status, setP1Status] = useState("thinking"); // thinking | correct | wrong
  const [p2Status, setP2Status] = useState("thinking");
  const [simPhase, setSimPhase] = useState("playing"); // playing | ceremony | done
  const [viewersCount] = useState(() => Math.floor(12 + Math.random() * 88));

  const timerRef = useRef(null);
  const p1TimerRef = useRef(null);
  const p2TimerRef = useRef(null);
  const phaseRef = useRef("playing");
  const p1ScoreRef = useRef(Math.round(startRound * 0.73));
  const p2ScoreRef = useRef(Math.round(startRound * 0.60));

  useEffect(() => { phaseRef.current = simPhase; }, [simPhase]);

  const q = allQ[qIdx];

  const startCeremony = () => {
    clearInterval(timerRef.current);
    clearTimeout(p1TimerRef.current);
    clearTimeout(p2TimerRef.current);
    setSimPhase("ceremony");

    setTimeout(() => {
      if (qIdx + 1 >= allQ.length) {
        setSimPhase("done");
        return;
      }
      setQIdx(i => i + 1);
      setTimeLeft(TIME_PER_Q);
      setP1Status("thinking");
      setP2Status("thinking");
      setSimPhase("playing");
    }, 2000);
  };

  // Schedule player answers for each question
  useEffect(() => {
    if (simPhase !== "playing" || !q) return;

    // Player 1: 72% accuracy, think 1.5–9s
    const p1Correct = Math.random() < 0.72;
    const p1Think = 1500 + Math.random() * 7500;
    p1TimerRef.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      if (p1Correct) { p1ScoreRef.current += 1; setP1Score(p1ScoreRef.current); }
      setP1Status(p1Correct ? "correct" : "wrong");
    }, p1Think);

    // Player 2: 60% accuracy, think 2–11s
    const p2Correct = Math.random() < 0.60;
    const p2Think = 2000 + Math.random() * 9000;
    p2TimerRef.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      if (p2Correct) { p2ScoreRef.current += 1; setP2Score(p2ScoreRef.current); }
      setP2Status(p2Correct ? "correct" : "wrong");
    }, p2Think);

    return () => {
      clearTimeout(p1TimerRef.current);
      clearTimeout(p2TimerRef.current);
    };
  }, [qIdx, simPhase, q]);

  // Question timer
  useEffect(() => {
    if (simPhase !== "playing") return;
    let t = timeLeft;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (phaseRef.current !== "playing") { clearInterval(timerRef.current); return; }
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current);
        startCeremony();
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx, simPhase]);

  // Both answered → start ceremony
  useEffect(() => {
    if (p1Status !== "thinking" && p2Status !== "thinking" && simPhase === "playing") {
      setTimeout(startCeremony, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p1Status, p2Status]);

  if (!q) return null;

  const p1 = match.players[0];
  const p2 = match.players[1];
  const timePct = (timeLeft / TIME_PER_Q) * 100;
  const maxScore = qIdx + 1;
  const currentRound = qIdx + 1;

  const StatusBadge = ({ status, name }) => (
    <div
      className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md"
      style={
        status === "correct"
          ? { background: "#5DD66E14", color: "#5DD66E", border: "1px solid #5DD66E30" }
          : status === "wrong"
          ? { background: "#FF555514", color: "#FF5555", border: "1px solid #FF555530" }
          : { background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "correct" ? "bg-[#5DD66E]"
          : status === "wrong" ? "bg-[#FF5555]"
          : "bg-white/25 animate-pulse"
        }`}
      />
      <span className="truncate max-w-[70px]">{name}</span>
      <span className="opacity-60">
        {status === "correct" ? "✓" : status === "wrong" ? "✗" : "…"}
      </span>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
        style={{ background: "rgba(5,5,10,0.85)", backdropFilter: "blur(12px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          onClick={e => e.stopPropagation()}
          className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-white/[0.08] overflow-hidden"
          style={{ background: "#0B0B14" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]"
            style={{ background: `${AMBER}08` }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5555] blink" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#FF5555]">Live</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              {cat && <cat.icon className="w-3.5 h-3.5" style={{ color: AMBER }} />}
              <span className="text-xs font-medium text-white/70">{cat?.name[lang]}</span>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-white/30" />
                <span className="text-[10px] text-white/30">{viewersCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" style={{ color: AMBER }} />
                <span className="font-arcade text-base leading-none" style={{ color: AMBER }}>
                  {match.pool.toLocaleString()}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scoreboard */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              {/* P1 */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white/80 truncate">{p1}</span>
                  <span className="font-arcade text-xl leading-none ml-2" style={{ color: AMBER }}>{p1Score}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${(p1Score / match.total) * 100}%` }}
                    transition={{ duration: 0.4 }}
                    style={{ background: AMBER }}
                  />
                </div>
              </div>

              <div className="font-arcade text-xs text-white/20 flex-shrink-0 px-1">VS</div>

              {/* P2 */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-arcade text-xl leading-none mr-2 text-white/50">{p2Score}</span>
                  <span className="text-xs font-medium text-white/50 truncate text-right">{p2}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex justify-end">
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${(p2Score / match.total) * 100}%` }}
                    transition={{ duration: 0.4 }}
                    style={{ background: "rgba(255,255,255,0.2)" }}
                  />
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between mb-4 text-[10px] text-white/25">
              <span>Q{currentRound}/{match.total}</span>
              <div className="flex gap-1">
                {Array.from({ length: match.total }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: i < qIdx ? AMBER : i === qIdx ? `${AMBER}70` : "rgba(255,255,255,0.1)" }}
                  />
                ))}
              </div>
              <span>{match.total - currentRound} restantes</span>
            </div>

            {/* Timer bar */}
            {simPhase === "playing" && (
              <div className="mb-4">
                <div className="h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${timePct}%`, background: timeLeft <= 5 ? "#FF5555" : AMBER }}
                  />
                </div>
              </div>
            )}

            {/* Question */}
            <AnimatePresence mode="wait">
              {simPhase !== "done" && (
                <motion.div
                  key={`q-${qIdx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="rounded-xl bg-[#0D0D18] border border-white/[0.06] p-3.5 mb-3">
                    <p className="text-[10px] text-white/25 mb-1.5">Question {currentRound}</p>
                    <p className="text-sm text-white/85 leading-snug">{q.q[lang]}</p>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {q.options.map((opt, i) => {
                      let bg = "rgba(255,255,255,0.03)";
                      let border = "rgba(255,255,255,0.07)";
                      let textColor = "rgba(255,255,255,0.5)";
                      if (simPhase === "ceremony") {
                        if (i === q.answer) { bg = "#5DD66E10"; border = "#5DD66E50"; textColor = "#5DD66E"; }
                        else if (
                          (p1Status === "wrong" && i !== q.answer) ||
                          (p2Status === "wrong" && i !== q.answer)
                        ) { /* keep neutral */ }
                      }
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2.5 rounded-lg border text-[11px]"
                          style={{ background: bg, borderColor: border, color: textColor }}
                        >
                          <span
                            className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                            style={{ background: `${border}40`, color: border }}
                          >
                            {LABELS[i]}
                          </span>
                          <span className="truncate">{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Player statuses */}
                  <div className="flex gap-2">
                    <StatusBadge status={p1Status} name={p1} />
                    <StatusBadge status={p2Status} name={p2} />
                  </div>
                </motion.div>
              )}

              {simPhase === "done" && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 text-center"
                >
                  <div className="text-3xl mb-2">🏆</div>
                  <div className="text-xs text-white/30 mb-1">Match terminé</div>
                  <div className="text-sm font-semibold text-white mb-4">
                    {p1Score > p2Score ? p1 : p2Score > p1Score ? p2 : "Égalité"}{p1Score !== p2Score ? " gagne !" : ""}
                  </div>
                  <div className="flex items-center justify-center gap-6 text-sm mb-4">
                    <div className="text-center">
                      <div className="font-arcade text-3xl" style={{ color: AMBER }}>{p1Score}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{p1}</div>
                    </div>
                    <div className="text-white/20">—</div>
                    <div className="text-center">
                      <div className="font-arcade text-3xl text-white/40">{p2Score}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{p2}</div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold rounded-md border border-white/[0.1] text-white/50 hover:bg-white/[0.04] transition"
                  >
                    Fermer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
