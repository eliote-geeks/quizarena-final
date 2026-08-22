import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { CATEGORIES, QUESTIONS, getCategory } from "../data/mockData";
import { calcNewElo } from "../lib/eloEngine";
import { SFX } from "../lib/soundEngine";
import { Image as ImageIcon, Type, X, Swords, Volume2, VolumeX } from "lucide-react";
import { formatMoney } from "../lib/currency";
import ResultScreen from "../components/ResultScreen";
import QuestionIntro from "../components/QuestionIntro";
import AmbientBackground from "../components/AmbientBackground";

const TIME_PER_Q = 8;
const ROUND_SIZE = 10;
const QUESTION_REVEAL_MS = 650;
const AMBER = "var(--accent)";
const LABELS = ["A", "B", "C", "D"];
const QUESTION_FORMATS = ["text", "audio", "image"];

function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function buildQuestionPool(category) {
  if (category && category !== "random" && QUESTIONS[category]) {
    return QUESTIONS[category].map((question) => ({ ...question, categoryId: category }));
  }

  return CATEGORIES.flatMap((cat) =>
    (QUESTIONS[cat.id] || []).map((question) => ({ ...question, categoryId: cat.id }))
  );
}

function withDisplayFormats(questions) {
  return questions.map((question, index) => ({
    ...question,
    displayType: QUESTION_FORMATS[index % QUESTION_FORMATS.length],
  }));
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

  const questions = useMemo(
    () => withDisplayFormats(pickRandom(buildQuestionPool(category), ROUND_SIZE)),
    [category]
  );

  const [phase, setPhase] = useState("countdown"); // countdown | playing | ceremony | cashout | result
  const [countdownVal, setCountdownVal] = useState(3);
  const [muted, setMuted] = useState(() => localStorage.getItem("qa_sound_muted") === "1");
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  // Joue un effet sonore, sauf si l'utilisateur a coupé le son (ref pour
  // rester correct dans les callbacks mémoïsés qui n'ont pas `muted` en dep).
  const playSfx = useCallback((fn) => { if (!mutedRef.current) fn(); }, []);
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [chosen, setChosen] = useState(null); // my choice (null | 0-3 | -1 for timeout)
  const [answersReady, setAnswersReady] = useState(false);
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
  const revealTimerRef = useRef(null);
  const phaseRef = useRef("countdown");

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const q = questions[qIdx];
  const cat = getCategory(q?.categoryId || category);

  const speakQuestion = useCallback(() => {
    if (!q || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(q.q[lang]);
    utterance.lang = lang === "fr" ? "fr-FR" : "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [q, lang]);

  useEffect(() => {
    if (phase === "playing" && q?.displayType === "audio") speakQuestion();
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [phase, qIdx, q?.displayType, speakQuestion]);

  const toggleMusic = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem("qa_sound_muted", next ? "1" : "0");
      return next;
    });
  }, []);

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
    const thinkTime = 1800 + Math.random() * Math.max(1000, TIME_PER_Q * 1000 - 2200);

    oppTimerRef.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      opponentAnswerRef.current = oppChoice;
      setOpponentAnswered(true);
      playSfx(SFX.opponentLocked);
    }, thinkTime);
  }, [playSfx]);

  // Per-question timer
  useEffect(() => {
    if (phase !== "playing" || !q) return;
    setTimeLeft(TIME_PER_Q);
    setChosen(null);
    setAnswersReady(false);

    clearInterval(timerRef.current);
    clearTimeout(revealTimerRef.current);
    clearTimeout(oppTimerRef.current);

    revealTimerRef.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      setAnswersReady(true);
      scheduleOpponent(q);

      let t = TIME_PER_Q;
      timerRef.current = setInterval(() => {
        if (phaseRef.current !== "playing") { clearInterval(timerRef.current); return; }
        t -= 1;
        if (t <= 3) playSfx(SFX.tick);
        if (t <= 0) {
          clearInterval(timerRef.current);
          clearTimeout(oppTimerRef.current);
          if (opponentAnswerRef.current === null) {
            const isCorrect = Math.random() < 0.65;
            const wrongOptions = [0, 1, 2, 3].filter(i => i !== q.answer);
            opponentAnswerRef.current = isCorrect ? q.answer : wrongOptions[Math.floor(Math.random() * 3)];
          }
          setOpponentAnswered(true);
          setChosen(-1);
          setPhase("ceremony");
          return;
        }
        setTimeLeft(t);
      }, 1000);
    }, QUESTION_REVEAL_MS);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(oppTimerRef.current);
      clearTimeout(revealTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx, phase]);

  const handleChoice = useCallback((optIdx) => {
    if (phase !== "playing" || !answersReady || chosen !== null) return;
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

    if (optIdx === q.answer) playSfx(SFX.correct);
    else playSfx(SFX.wrong);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, answersReady, chosen, q, opponentAnswered]);

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
          playSfx(SFX.cashOut);
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
      playSfx(SFX.victory);
    } else if (result === "draw") {
      // House fee: 5% each → each gets back 95% of stake
      const refund = Math.round(stake * 0.95);
      addCoins(refund - stake); // net -0.05×stake
      playSfx(SFX.cashOut);
    } else {
      addCoins(-stake); // net -stake
      playSfx(SFX.defeat);
    }
    setPhase("result");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elo, opponentElo, stake]);

  const takeCashout = () => {
    const { newElo, delta } = calcNewElo(elo, opponentElo, "win");
    updateElo(newElo);
    addCoins(cashoutValue - stake);
    setEloResult({ newElo, delta, result: "cashout", myCorrect: myCorrectRef.current, oppCorrect: oppCorrectRef.current });
    playSfx(SFX.victory);
    setPhase("result");
  };

  const continueDuel = () => {
    setQIdx(i => i + 1);
    setPhase("playing");
  };

  if (!duelState) return <Navigate to="/duel" replace />;
  if (!q) return null;

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
        modeLabel="Mix global"
        onReplay={() => navigate("/duel")}
        onLobby={() => navigate("/")}
      />
    );
  }

  const timePct = (timeLeft / TIME_PER_Q) * 100;
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AmbientBackground intensity={timeLeft <= 3 && phase === "playing" ? "urgent" : "calm"} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6">

        {/* Top bar — glass, propre */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition hover:opacity-90"
            style={{
              background: "rgba(11,11,16,0.55)",
              border: "1px solid var(--border-md)",
              color: "var(--text-sub)",
              backdropFilter: "blur(12px)",
            }}
          >
            <X className="w-4 h-4" /> Quitter
          </button>

          {/* VS scoreboard */}
          <div
            className="flex items-center gap-4 px-4 py-2 rounded-xl"
            style={{
              background: "rgba(11,11,16,0.55)",
              border: "1px solid var(--border-md)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest font-medium mb-0.5" style={{ color: "var(--text-faint)" }}>Vous</div>
              <div className="font-display font-semibold text-2xl leading-none tabular-nums" style={{ color: "var(--accent)" }}>{myCorrect}</div>
            </div>
            <div className="font-serif-i text-sm" style={{ color: "var(--text-faint)" }}>vs</div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest font-medium mb-0.5 truncate max-w-[80px]" style={{ color: "var(--text-faint)" }}>
                {opponentName.slice(0, 10)}
              </div>
              <div className="font-display font-semibold text-2xl leading-none tabular-nums" style={{ color: "var(--text)" }}>{oppCorrect}</div>
            </div>
          </div>

          {/* Stake + son toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMusic}
              className="p-2 rounded-xl transition hover:opacity-90"
              style={{
                background: "rgba(11,11,16,0.55)",
                border: `1px solid ${muted ? "var(--border-md)" : "var(--accent)"}`,
                color: muted ? "var(--text-faint)" : "var(--accent)",
                backdropFilter: "blur(12px)",
              }}
              title={muted ? "Activer le son" : "Couper le son"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div
              className="hidden sm:block px-3 py-2 rounded-xl"
              style={{
                background: "rgba(11,11,16,0.55)",
                border: "1px solid var(--border-md)",
                backdropFilter: "blur(12px)",
              }}
            >
              <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                {formatMoney(stake, currency)}
              </span>
            </div>
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
              className="py-28 text-center rounded-3xl backdrop-blur-sm"
            >
              <div
                className="inline-flex items-center justify-center gap-3 mb-8 px-4 py-2 rounded-2xl"
                style={{
                  background: "rgba(11,11,16,0.55)",
                  border: "1px solid var(--border-md)",
                  color: "var(--text-sub)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span className="text-sm font-medium">Vous</span>
                <Swords className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span className="text-sm font-medium">{opponentName}</span>
              </div>
              <motion.div
                key={countdownVal}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="font-display font-semibold leading-none tracking-tight"
                style={{
                  color: countdownVal === 0 ? "var(--success)" : "var(--accent)",
                  fontSize: countdownVal === 0 ? 96 : 140,
                }}
              >
                {countdownVal > 0 ? countdownVal : "Go"}
              </motion.div>
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
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>Q{qIdx + 1}/{questions.length}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: timeLeft <= 3 ? "var(--danger)" : timeLeft <= 5 ? "var(--warning)" : "var(--accent)" }}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--active)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    animate={{
                      width: `${timePct}%`,
                      background: timeLeft <= 3 ? "var(--danger)" : timeLeft <= 5 ? "var(--warning)" : "var(--accent)",
                    }}
                    transition={{ width: { duration: 1, ease: "linear" }, background: { duration: 0.3 } }}
                  />
                </div>
              </div>

              {/* Opponent status */}
              <div className="mb-3 flex items-center gap-2">
                <div
                  className={opponentAnswered ? "chip chip-success" : "chip chip-neutral"}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${opponentAnswered ? "" : "pulse-soft"}`}
                    style={{ background: opponentAnswered ? "var(--success)" : "var(--text-faint)" }}
                  />
                  {opponentName} — {opponentAnswered ? "a répondu" : "réfléchit"}
                </div>
              </div>

              <QuestionPrompt
                question={q}
                cat={cat}
                lang={lang}
                qIdx={qIdx}
                onReplayAudio={speakQuestion}
              />

              {/* Options */}
              {answersReady || phase === "ceremony" ? (
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
                    idle:    { bg: "rgba(17,17,23,0.72)",   border: "var(--border-md)",       text: "var(--text)",    labelBg: "var(--active)",           labelCol: "var(--text)",    labelBorder: "var(--border-md)" },
                    correct: { bg: "rgba(16,185,129,0.16)", border: "rgba(16,185,129,0.55)", text: "var(--success)", labelBg: "rgba(16,185,129,0.24)", labelCol: "var(--success)", labelBorder: "rgba(16,185,129,0.55)" },
                    wrong:   { bg: "rgba(244,63,94,0.16)",  border: "rgba(244,63,94,0.55)",  text: "var(--danger)",  labelBg: "rgba(244,63,94,0.24)",  labelCol: "var(--danger)",  labelBorder: "rgba(244,63,94,0.55)" },
                  };
                  const c = colors[myState];

                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleChoice(i)}
                      disabled={phase !== "playing" || !answersReady}
                      whileHover={phase === "playing" && answersReady ? { scale: 1.01 } : {}}
                      whileTap={phase === "playing" && answersReady ? { scale: 0.98 } : {}}
                      className="flex items-center gap-3 w-full text-left p-3.5 rounded-xl border transition-colors relative"
                      style={{ background: c.bg, borderColor: c.border, backdropFilter: "blur(14px)" }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: c.labelBg, color: c.labelCol, border: `1px solid ${c.labelBorder}` }}
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
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border px-4 py-4 text-center text-xs font-semibold"
                  style={{ background: "rgba(5,12,10,0.88)", borderColor: "rgba(216,238,218,0.16)", color: "rgba(255,255,255,0.72)", backdropFilter: "blur(14px)" }}
                >
                  Lis la question. Les réponses arrivent.
                </motion.div>
              )}

              {/* Ceremony summary */}
              {phase === "ceremony" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="text-xs text-white/40">
                      {chosen === q.answer ? "Tu as bon" : chosen === -1 ? "Timeout" : "Raté"}
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
                        style={{ color: nextIn === 1 ? AMBER : "var(--qa-text-sub)" }}
                      >
                        {nextIn}s
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </motion.div>
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

function QuestionPrompt({ question, cat, lang, qIdx, onReplayAudio }) {
  const CatIcon = cat?.icon;
  const label = {
    text: "Question texte",
    audio: "Question audio",
    image: "Question image",
  }[question.displayType] || "Question";

  if (question.displayType === "audio") {
    return (
      <div className="card rounded-2xl p-5 sm:p-6 mb-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--text-faint)" }}>
            {label} {qIdx + 1}
          </p>
          <button
            type="button"
            onClick={onReplayAudio}
            className="btn-secondary w-10 h-10 rounded-xl flex items-center justify-center"
            title="Réécouter"
          >
            <Volume2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 h-24 sm:h-28 rounded-xl mb-4" style={{ background: "var(--surface-2)" }}>
          {[18, 34, 52, 74, 42, 64, 28, 48, 70].map((height, i) => (
            <motion.span
              key={i}
              className="w-1.5 rounded-full"
              style={{ background: i % 2 ? "var(--text-sub)" : "var(--accent)" }}
              animate={{ height: [height * 0.45, height, height * 0.55] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.05 }}
            />
          ))}
        </div>
        <h2 className="text-lg sm:text-xl font-semibold leading-snug" style={{ color: "var(--text)" }}>
          {question.q[lang]}
        </h2>
      </div>
    );
  }

  if (question.displayType === "image") {
    return (
      <div className="card rounded-2xl p-5 sm:p-6 mb-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--text-faint)" }}>
            {label} {qIdx + 1}
          </p>
        </div>
        <div className="relative h-40 sm:h-48 rounded-xl mb-5 flex items-center justify-center overflow-hidden mesh-hero">
          {CatIcon && (
            <CatIcon
              className="w-20 h-20 sm:w-24 sm:h-24"
              style={{ color: "var(--accent)", opacity: 0.55 }}
              strokeWidth={1.2}
            />
          )}
        </div>
        <h2 className="text-lg sm:text-xl font-semibold leading-snug" style={{ color: "var(--text)" }}>
          {question.q[lang]}
        </h2>
      </div>
    );
  }

  return (
    <div className="card rounded-2xl p-5 sm:p-6 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Type className="w-4 h-4" style={{ color: "var(--accent)" }} />
        <p className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--text-faint)" }}>
          {label} {qIdx + 1}
        </p>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold leading-snug" style={{ color: "var(--text)" }}>
        {question.q[lang]}
      </h2>
    </div>
  );
}
