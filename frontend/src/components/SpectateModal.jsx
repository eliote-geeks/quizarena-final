import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { QUESTIONS, getCategory } from "../data/mockData";
import { X, Eye, Coins, Radio, Crown } from "lucide-react";

const AMBER = "#E5A800";
const GREEN = "#5DD66E";
const RED   = "#FF5555";
const LABELS = ["A", "B", "C", "D"];
const TIME_PER_Q = 8;

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

  const startRound = match.round - 1;
  const [qIdx, setQIdx] = useState(startRound);
  const [timeLeft, setTimeLeft] = useState(() => Math.floor(6 + Math.random() * 7));
  const [p1Score, setP1Score] = useState(() => Math.round(startRound * 0.73));
  const [p2Score, setP2Score] = useState(() => Math.round(startRound * 0.60));
  const [p1Status, setP1Status] = useState("thinking");
  const [p2Status, setP2Status] = useState("thinking");
  const [simPhase, setSimPhase] = useState("playing");
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

  // Schedule player answers
  useEffect(() => {
    if (simPhase !== "playing" || !q) return;

    const p1Correct = Math.random() < 0.72;
    const p1Think = 1500 + Math.random() * 7500;
    p1TimerRef.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      if (p1Correct) { p1ScoreRef.current += 1; setP1Score(p1ScoreRef.current); }
      setP1Status(p1Correct ? "correct" : "wrong");
    }, p1Think);

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

  // Both answered → ceremony
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
  const currentRound = qIdx + 1;
  const p1Leads = p1Score > p2Score;
  const p2Leads = p2Score > p1Score;

  const StatusPill = ({ status, name, leads }) => {
    const bg = status === "correct" ? `${GREEN}18`
      : status === "wrong" ? `${RED}18`
      : "var(--qa-active)";
    const color = status === "correct" ? GREEN
      : status === "wrong" ? RED
      : "var(--qa-text-sub)";
    return (
      <div
        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
        style={{ background: bg, color }}
      >
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${status === "thinking" ? "animate-pulse" : ""}`}
          style={{ background: color }}
        />
        <span className="truncate">{name}</span>
        <span className="ml-auto">
          {status === "correct" ? "✓" : status === "wrong" ? "✗" : "…"}
        </span>
      </div>
    );
  };

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
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden"
          style={{
            background: "var(--qa-surface)",
            border: "1px solid var(--qa-border-md)",
            boxShadow: `0 20px 60px -20px ${AMBER}55`,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--qa-divider)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                style={{ background: `${RED}18`, color: RED }}
              >
                <Radio className="w-3 h-3 animate-pulse" />
                <span className="text-xs font-bold">LIVE</span>
              </div>
              {cat && (
                <div className="flex items-center gap-1.5">
                  <cat.icon className="w-4 h-4" style={{ color: AMBER }} />
                  <span className="text-sm font-bold" style={{ color: "var(--qa-text)" }}>
                    {cat?.name[lang]}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1" style={{ color: "var(--qa-text-faint)" }}>
                <Eye className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{viewersCount}</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition hover:opacity-70"
                style={{ color: "var(--qa-text-faint)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Prize */}
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <div className="text-xs font-semibold" style={{ color: "var(--qa-text-sub)" }}>
              Cagnotte
            </div>
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4" style={{ color: AMBER }} />
              <span className="font-display font-bold text-lg" style={{ color: AMBER }}>
                {match.pool.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Scoreboard */}
          <div className="px-5 pb-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
              {/* P1 */}
              <div className={`transition-opacity ${p1Leads ? "" : "opacity-70"}`}>
                <div className="text-sm font-bold truncate" style={{ color: "var(--qa-text)" }}>
                  {p1}
                </div>
                <motion.div
                  key={p1Score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="font-display font-bold text-3xl mt-1"
                  style={{ color: p1Leads ? AMBER : "var(--qa-text-sub)" }}
                >
                  {p1Score}
                </motion.div>
              </div>

              <div className="font-display font-bold text-sm" style={{ color: "var(--qa-text-faint)" }}>
                VS
              </div>

              {/* P2 */}
              <div className={`text-right transition-opacity ${p2Leads ? "" : "opacity-70"}`}>
                <div className="text-sm font-bold truncate" style={{ color: "var(--qa-text)" }}>
                  {p2}
                </div>
                <motion.div
                  key={p2Score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="font-display font-bold text-3xl mt-1"
                  style={{ color: p2Leads ? AMBER : "var(--qa-text-sub)" }}
                >
                  {p2Score}
                </motion.div>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1 mb-3">
              {Array.from({ length: match.total }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === qIdx ? 16 : 6,
                    height: 6,
                    background: i < qIdx ? AMBER : i === qIdx ? `${AMBER}` : "var(--qa-border-md)",
                  }}
                />
              ))}
            </div>

            {/* Timer bar */}
            {simPhase === "playing" && (
              <div className="mb-4">
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--qa-active)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: `${timePct}%`,
                      background: timeLeft <= 5 ? RED : AMBER,
                      transition: "width 1s linear, background 0.2s",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs" style={{ color: "var(--qa-text-sub)" }}>
                  <span className="font-semibold">Question {currentRound}/{match.total}</span>
                  <span className="font-semibold" style={{ color: timeLeft <= 5 ? RED : "var(--qa-text-sub)" }}>
                    {timeLeft}s
                  </span>
                </div>
              </div>
            )}

            {/* Question + options */}
            <AnimatePresence mode="wait">
              {simPhase !== "done" && (
                <motion.div
                  key={`q-${qIdx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className="rounded-2xl p-4 mb-3"
                    style={{
                      background: "var(--qa-surface-2)",
                      border: "1px solid var(--qa-border)",
                    }}
                  >
                    <p className="text-sm font-bold leading-snug" style={{ color: "var(--qa-text)" }}>
                      {q.q[lang]}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {q.options.map((opt, i) => {
                      const isAnswer = i === q.answer;
                      const showAnswer = simPhase === "ceremony";
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-3 rounded-xl text-xs font-semibold transition-colors"
                          style={{
                            background: showAnswer && isAnswer ? `${GREEN}18` : "var(--qa-active)",
                            border: `1px solid ${showAnswer && isAnswer ? `${GREEN}55` : "transparent"}`,
                            color: showAnswer && isAnswer ? GREEN : "var(--qa-text)",
                          }}
                        >
                          <span
                            className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              background: showAnswer && isAnswer ? `${GREEN}33` : "var(--qa-border-md)",
                              color: showAnswer && isAnswer ? GREEN : "var(--qa-text-sub)",
                            }}
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
                    <StatusPill status={p1Status} name={p1} leads={p1Leads} />
                    <StatusPill status={p2Status} name={p2} leads={p2Leads} />
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
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `${AMBER}22`, color: AMBER }}>
                    <Crown className="w-8 h-8" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: AMBER }}>
                    Match terminé
                  </div>
                  <div className="font-display font-bold text-xl mb-5" style={{ color: "var(--qa-text)" }}>
                    {p1Score > p2Score ? p1 : p2Score > p1Score ? p2 : "Égalité"}
                    {p1Score !== p2Score ? " gagne !" : ""}
                  </div>
                  <div className="flex items-center justify-center gap-8 mb-5">
                    <div className="text-center">
                      <div className="font-display font-bold text-4xl" style={{ color: p1Score >= p2Score ? AMBER : "var(--qa-text-faint)" }}>
                        {p1Score}
                      </div>
                      <div className="text-xs font-bold mt-1" style={{ color: "var(--qa-text-sub)" }}>{p1}</div>
                    </div>
                    <div className="font-display font-bold" style={{ color: "var(--qa-text-faint)" }}>—</div>
                    <div className="text-center">
                      <div className="font-display font-bold text-4xl" style={{ color: p2Score >= p1Score ? AMBER : "var(--qa-text-faint)" }}>
                        {p2Score}
                      </div>
                      <div className="text-xs font-bold mt-1" style={{ color: "var(--qa-text-sub)" }}>{p2}</div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl text-sm font-bold transition"
                    style={{ background: AMBER, color: "#07070F" }}
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
