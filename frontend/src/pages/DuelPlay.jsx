import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { QUESTIONS, getCategory } from "../data/mockData";
import { calcNewElo, getRank } from "../lib/eloEngine";
import { SFX } from "../lib/soundEngine";
import { X, Swords } from "lucide-react";
import { formatMoney } from "../lib/currency";
import ResultScreen from "../components/ResultScreen";
import QuestionIntro from "../components/QuestionIntro";

const TIME_PER_Q = 13;
const ROUND_SIZE = 10;
const AMBER = "#E5A800";
const LABELS = ["A", "B", "C", "D"];

function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function DuelPlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, addCoins, elo, updateElo, currency } = useApp();
  const duelState = location.state;

  // Derive values with fallbacks so hooks always run unconditionally
  const category = duelState?.category || "histoire";
  const stake = duelState?.stake || 500;
  const opponentName = duelState?.opponentName || "QuantumKid";
  const opponentElo = duelState?.opponentElo || 1120;

  const cat = getCategory(category);
  const questions = useMemo(() => pickRandom(QUESTIONS[category] || [], ROUND_SIZE), [category]);

  const [phase, setPhase] = useState("countdown"); // countdown | playing | ceremony | cashout | result
  const [countdownVal, setCountdownVal] = useState(3);
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [chosen, setChosen] = useState(null); // my choice (null | 0-3 | -1 for timeout)
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [myCorrect, setMyCorrect] = useState(0);
  const [oppCorrect, setOppCorrect] = useState(0);
  const [eloResult, setEloResult] = useState(null);
  const [cashoutValue] = useState(() => Math.round(stake * 1.5));
  const [nextIn, setNextIn] = useState(null); // inter-question countdown

  // Refs
  const myCorrectRef = useRef(0);
  const oppCorrectRef = useRef(0);
  const opponentAnswerRef = useRef(null); // secretly stored
  const timerRef = useRef(null);
  const oppTimerRef = useRef(null);
  const phaseRef = useRef("countdown");

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const q = questions[qIdx];

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownVal <= 0) { setPhase("playing"); return; }
    const id = setTimeout(() => setCountdownVal(c => c - 1), 800);
    return () => clearTimeout(id);
  }, [phase, countdownVal]);

  // Schedule opponent's answer for each question
  const scheduleOpponent = useCallback((qData) => {
    clearTimeout(oppTimerRef.current);
    setOpponentAnswered(false);
    opponentAnswerRef.current = null;

    const isCorrect = Math.random() < 0.65;
    const correctAnswer = qData.answer;
    // Wrong option: pick one of the other 3
    const wrongOptions = [0, 1, 2, 3].filter(i => i !== correctAnswer);
    const oppChoice = isCorrect ? correctAnswer : wrongOptions[Math.floor(Math.random() * 3)];
    const thinkTime = 1800 + Math.random() * 11200; // 1.8s–13s

    oppTimerRef.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      opponentAnswerRef.current = oppChoice;
      setOpponentAnswered(true);
      SFX.opponentLocked();
    }, thinkTime);
  }, []);

  // Per-question timer
  useEffect(() => {
    if (phase !== "playing" || !q) return;
    setTimeLeft(TIME_PER_Q);
    setChosen(null);
    scheduleOpponent(q);

    let t = TIME_PER_Q;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (phaseRef.current !== "playing") { clearInterval(timerRef.current); return; }
      t -= 1;
      if (t <= 3) SFX.tick();
      if (t <= 0) {
        clearInterval(timerRef.current);
        clearTimeout(oppTimerRef.current);
        // Finalize opponent's answer if not yet done
        if (opponentAnswerRef.current === null) {
          const isCorrect = Math.random() < 0.65;
          const wrongOptions = [0, 1, 2, 3].filter(i => i !== q.answer);
          opponentAnswerRef.current = isCorrect ? q.answer : wrongOptions[Math.floor(Math.random() * 3)];
        }
        setOpponentAnswered(true);
        setChosen(-1); // timeout
        setPhase("ceremony");
        return;
      }
      setTimeLeft(t);
    }, 1000);
    return () => { clearInterval(timerRef.current); clearTimeout(oppTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx, phase]);

  const handleChoice = useCallback((optIdx) => {
    if (phase !== "playing" || chosen !== null) return;
    clearInterval(timerRef.current);
    setChosen(optIdx);

    // Give opponent up to 0.7s more if not answered yet
    const finalize = () => {
      if (opponentAnswerRef.current === null) {
        const isCorrect = Math.random() < 0.65;
        const wrongOptions = [0, 1, 2, 3].filter(i => i !== q.answer);
        opponentAnswerRef.current = isCorrect ? q.answer : wrongOptions[Math.floor(Math.random() * 3)];
        setOpponentAnswered(true);
      }
      setPhase("ceremony");
    };

    if (opponentAnswered) {
      setTimeout(finalize, 300);
    } else {
      clearTimeout(oppTimerRef.current);
      setTimeout(finalize, 700);
    }

    if (optIdx === q.answer) SFX.correct();
    else SFX.wrong();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, chosen, q, opponentAnswered]);

  // Intro → playing after 1.5s
  useEffect(() => {
    if (phase !== "intro") return;
    const id = setTimeout(() => setPhase("playing"), 1500);
    return () => clearTimeout(id);
  }, [phase]);

  // Keyboard A/B/C/D
  useEffect(() => {
    const map = { a: 0, b: 1, c: 2, d: 3 };
    const onKey = e => {
      if (phase !== "playing") return;
      const i = map[e.key.toLowerCase()];
      if (i !== undefined) handleChoice(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleChoice]);

  // Ceremony: update scores → 3s countdown → check cashout → next question or result
  useEffect(() => {
    if (phase !== "ceremony") { setNextIn(null); return; }

    // Update scores based on what was chosen
    const myWon = chosen !== -1 && chosen === q?.answer;
    const oppWon = opponentAnswerRef.current === q?.answer;

    if (myWon) { myCorrectRef.current += 1; setMyCorrect(myCorrectRef.current); }
    if (oppWon) { oppCorrectRef.current += 1; setOppCorrect(oppCorrectRef.current); }

    setNextIn(3);
    let t = 3;
    const id = setInterval(() => {
      t -= 1;
      if (t <= 0) {
        clearInterval(id);
        const isLastQ = qIdx + 1 >= questions.length;
        const lead = myCorrectRef.current - oppCorrectRef.current;
        if (!isLastQ && qIdx >= 4 && lead >= 2) {
          setPhase("cashout");
          SFX.cashOut();
          return;
        }
        if (isLastQ) {
          finalizeResult();
        } else {
          setQIdx(i => i + 1);
          setPhase("intro");
        }
      } else {
        setNextIn(t);
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const finalizeResult = useCallback(() => {
    const mc = myCorrectRef.current;
    const oc = oppCorrectRef.current;
    const result = mc > oc ? "win" : mc < oc ? "loss" : "draw";
    const { newElo, delta } = calcNewElo(elo, opponentElo, result);
    updateElo(newElo);
    setEloResult({ newElo, delta, result, myCorrect: mc, oppCorrect: oc });

    if (result === "win") {
      // House fee: 10% of pot → winner gets 90% of 2×stake = 1.80×stake
      const prize = Math.round(stake * 2 * 0.90);
      addCoins(prize - stake); // net +0.80×stake
      SFX.victory();
    } else if (result === "draw") {
      // House fee: 5% each → each gets back 95% of stake
      const refund = Math.round(stake * 0.95);
      addCoins(refund - stake); // net -0.05×stake
      SFX.cashOut();
    } else {
      addCoins(-stake); // net -stake
      SFX.defeat();
    }
    setPhase("result");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elo, opponentElo, stake]);

  const takeCashout = () => {
    const { newElo, delta } = calcNewElo(elo, opponentElo, "win");
    updateElo(newElo);
    addCoins(cashoutValue - stake);
    setEloResult({ newElo, delta, result: "cashout", myCorrect: myCorrectRef.current, oppCorrect: oppCorrectRef.current });
    SFX.victory();
    setPhase("result");
  };

  const continueDuel = () => {
    setQIdx(i => i + 1);
    setPhase("playing");
  };

  if (!duelState) return <Navigate to="/duel" replace />;
  if (!cat || !q) return null;

  if (phase === "result" && eloResult) {
    const netCoins =
      eloResult.result === "win"
        ? Math.round(stake * 2 * 0.90) - stake        // net +0.80×stake
        : eloResult.result === "cashout"
        ? cashoutValue - stake                         // net depends on cashout offer
        : eloResult.result === "draw"
        ? Math.round(stake * 0.95) - stake            // net -0.05×stake
        : -stake;                                      // net -stake

    return (
      <ResultScreen
        result={eloResult.result}
        coinsGained={netCoins}
        myScore={eloResult.myCorrect}
        oppScore={eloResult.oppCorrect}
        total={ROUND_SIZE}
        eloNew={eloResult.newElo}
        eloDelta={eloResult.delta}
        opponentName={opponentName}
        onReplay={() => navigate("/duel")}
        onLobby={() => navigate("/")}
      />
    );
  }

  const timePct = (timeLeft / TIME_PER_Q) * 100;
  const oppRank = getRank(opponentElo);

  return (
    <div className="relative min-h-screen bg-[#05050A] overflow-hidden">
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.05] pointer-events-none"
        style={{ background: AMBER }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/40 border border-white/[0.07] rounded-md hover:border-white/20 hover:text-white/70 transition"
          >
            <X className="w-3.5 h-3.5" /> Quitter
          </button>

          {/* VS scoreboard */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-[10px] text-white/30 mb-0.5">Toi</div>
              <div className="font-arcade text-2xl" style={{ color: AMBER }}>{myCorrect}</div>
            </div>
            <div className="font-arcade text-sm text-white/25">VS</div>
            <div className="text-center">
              <div className="text-[10px] text-white/30 mb-0.5">{opponentName}</div>
              <div className="font-arcade text-2xl text-white/60">{oppCorrect}</div>
            </div>
          </div>

          {/* Stake */}
          <div className="flex items-center gap-1">
            <span className="font-arcade text-sm" style={{ color: AMBER }}>{formatMoney(stake, currency)}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* COUNTDOWN */}
          {phase === "countdown" && (
            <motion.div
              key="cd"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-28 text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-6 text-xs text-white/30">
                <span>Tu</span>
                <Swords className="w-4 h-4" style={{ color: AMBER }} />
                <span>{opponentName}</span>
                <span className="text-[10px] text-white/20">({oppRank.emoji} {opponentElo})</span>
              </div>
              <div className="font-arcade text-[120px] leading-none" style={{ color: AMBER }}>
                {countdownVal > 0 ? countdownVal : "GO!"}
              </div>
            </motion.div>
          )}

          {/* PLAYING + CEREMONY + INTRO (question pre-rendered under overlay) */}
          {(phase === "playing" || phase === "ceremony" || phase === "intro") && (
            <motion.div
              key={`q-${qIdx}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
            >
              {/* Timer bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/25">Q{qIdx + 1}/{questions.length}</span>
                  <span className="font-arcade text-base" style={{ color: timeLeft <= 5 ? "#FF5555" : AMBER }}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${timePct}%`, background: timeLeft <= 5 ? "#FF5555" : AMBER }}
                  />
                </div>
              </div>

              {/* Opponent status */}
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px]"
                  style={
                    opponentAnswered
                      ? { background: "#5DD66E14", color: "#5DD66E", border: "1px solid #5DD66E30" }
                      : { background: "white/[0.03]", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.06)" }
                  }
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${opponentAnswered ? "bg-[#5DD66E]" : "bg-white/20 animate-pulse"}`} />
                  {opponentName} — {opponentAnswered ? "Répondu ✓" : "Réfléchit…"}
                </div>
              </div>

              {/* Question */}
              <div className="rounded-xl bg-[#0D0D18] border border-white/[0.07] p-5 mb-4">
                <p className="text-[10px] text-white/25 mb-2 uppercase tracking-widest">Question {qIdx + 1}</p>
                <h2 className="text-base font-semibold text-white leading-snug">{q.q[lang]}</h2>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((opt, i) => {
                  const label = LABELS[i];
                  let myState = "idle";
                  let oppState = false;

                  if (phase === "ceremony") {
                    if (i === q.answer) myState = "correct";
                    else if (i === chosen && chosen !== q.answer) myState = "wrong";
                    oppState = opponentAnswerRef.current === i;
                  }

                  const colors = {
                    idle:    { bg: "#0D0D18", border: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.75)", label: "rgba(255,255,255,0.25)" },
                    correct: { bg: "#5DD66E14", border: "#5DD66E60", text: "#5DD66E", label: "#5DD66E" },
                    wrong:   { bg: "#FF555514", border: "#FF555560", text: "#FF5555", label: "#FF5555" },
                  };
                  const c = colors[myState];

                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleChoice(i)}
                      disabled={phase !== "playing"}
                      whileHover={phase === "playing" ? { scale: 1.01 } : {}}
                      whileTap={phase === "playing" ? { scale: 0.98 } : {}}
                      className="flex items-center gap-3 w-full text-left p-3.5 rounded-xl border transition-colors relative"
                      style={{ background: c.bg, borderColor: c.border }}
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: `${c.label}20`, color: c.label, border: `1px solid ${c.label}40` }}
                      >
                        {label}
                      </div>
                      <span className="text-sm flex-1" style={{ color: c.text }}>{opt}</span>
                      {/* Badges showing who picked what */}
                      {phase === "ceremony" && (
                        <div className="flex gap-1 flex-shrink-0">
                          {chosen === i && chosen !== -1 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                              style={{ background: myState === "correct" ? "#5DD66E30" : "#FF555530", color: myState === "correct" ? "#5DD66E" : "#FF5555" }}>
                              Toi
                            </span>
                          )}
                          {oppState && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                              style={{ background: i === q.answer ? "#5DD66E30" : "#FF555530", color: i === q.answer ? "#5DD66E" : "#FF5555" }}>
                              {opponentName.slice(0, 6)}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Ceremony summary */}
              {phase === "ceremony" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-xs text-white/40">
                      {chosen === q.answer ? "✓ Tu as bon" : chosen === -1 ? "⏱ Timeout" : "✗ Raté"}
                    </div>
                    <div className="text-xs text-white/40">
                      {opponentAnswerRef.current === q.answer ? `${opponentName} a bon` : `${opponentName} a raté`}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/[0.05]">
                    <span className="text-[10px] text-white/20">Question suivante dans</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={nextIn}
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="font-arcade text-sm leading-none"
                        style={{ color: nextIn === 1 ? AMBER : "rgba(255,255,255,0.4)" }}
                      >
                        {nextIn}s
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {phase === "playing" && (
                <div className="mt-3 text-center text-[10px] text-white/15">A · B · C · D</div>
              )}
            </motion.div>
          )}

          {/* CASHOUT */}
          {phase === "cashout" && (
            <motion.div
              key="cashout"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center max-w-sm mx-auto"
            >
              <div className="text-2xl mb-2">💰</div>
              <h2 className="text-base font-semibold text-white mb-1">Sécurise tes gains ?</h2>
              <p className="text-xs text-white/40 mb-6">
                Tu mènes {myCorrect}–{oppCorrect} — tu peux partir maintenant
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl bg-[#0D0D18] border border-white/[0.07] p-4">
                  <div className="text-[10px] text-white/30 mb-1">Sécuriser</div>
                  <div className="font-arcade text-lg" style={{ color: AMBER }}>
                    {formatMoney(cashoutValue - stake, currency, { showPlus: true })}
                  </div>
                  <div className="text-[9px] text-white/20 mt-0.5">garanti</div>
                </div>
                <div className="rounded-xl bg-[#0D0D18] border border-white/[0.07] p-4">
                  <div className="text-[10px] text-white/30 mb-1">Si victoire</div>
                  <div className="font-arcade text-lg text-[#5DD66E]">
                    {formatMoney(Math.round(stake * 2 * 0.90) - stake, currency, { showPlus: true })}
                  </div>
                  <div className="text-[9px] text-white/20 mt-0.5">mais risque de perdre</div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={takeCashout}
                  className="w-full py-3 text-black text-sm font-semibold rounded-xl transition"
                  style={{ background: AMBER }}
                >
                  Prendre {formatMoney(cashoutValue, currency)}
                </button>
                <button
                  onClick={continueDuel}
                  className="w-full py-3 text-white/60 text-sm font-semibold rounded-xl border border-white/[0.08] hover:bg-white/[0.04] transition"
                >
                  Continuer à jouer
                </button>
              </div>
            </motion.div>
          )}

          {/* RESULT — handled via early return above (ResultScreen) */}

        </AnimatePresence>
      </div>

      {/* Question intro overlay */}
      <AnimatePresence>
        {phase === "intro" && q && (
          <QuestionIntro
            qIdx={qIdx}
            total={ROUND_SIZE}
            question={q}
            cat={cat}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
