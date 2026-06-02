import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { QUESTIONS, getCategory } from "../data/mockData";
import { extractKey } from "../lib/answerKey";
import { toast } from "sonner";
import PixelScene from "../components/PixelScene";
import PixelKeyboard from "../components/PixelKeyboard";
import CoinShower from "../components/CoinShower";
import { Heart, Zap, Trophy, X, ArrowRight, Coins, Skull } from "lucide-react";

const TIME_PER_Q = 20;
const ROUND_SIZE = 10;
const BOSS_START_INDEX = 4; // Boss appears at question 5+
const AMBER = "#E5A800";

function pickRandom(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function QuizPlay() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { t, lang, addCoins } = useApp();

  const cat = getCategory(categoryId);
  const list = useMemo(() => pickRandom(QUESTIONS[categoryId] || [], ROUND_SIZE), [categoryId]);

  const [phase, setPhase] = useState("ready"); // ready | playing | done
  const [countdown, setCountdown] = useState(3);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(TIME_PER_Q);
  const [lives, setLives] = useState(3);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | 'timeout'
  const [showShower, setShowShower] = useState(0);
  const [hitFlash, setHitFlash] = useState(0);
  const intervalRef = useRef(null);

  const q = list[idx];
  const answerKey = useMemo(() => (q ? extractKey(q.options[q.answer]) : ""), [q]);
  const boss = idx >= BOSS_START_INDEX;

  // Ready countdown
  useEffect(() => {
    if (phase !== "ready") return;
    if (countdown <= 0) {
      setPhase("playing");
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  // Per-question timer
  useEffect(() => {
    if (phase !== "playing") return;
    setTime(TIME_PER_Q);
    setTyped("");
    setFeedback(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTime((tm) => {
        if (tm <= 1) {
          clearInterval(intervalRef.current);
          handleTimeout();
          return 0;
        }
        return tm - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase]);

  const finalize = useCallback(() => {
    setPhase("done");
    clearInterval(intervalRef.current);
    const reward = Math.round(score * 22 + lives * 90);
    addCoins(reward);
    toast.success(`+${reward.toLocaleString()} ${t.common.coins}`, {
      description: `${t.quiz.finalScore}: ${score}/${list.length}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, lives, list.length, addCoins, t]);

  const goNext = useCallback(() => {
    if (idx + 1 >= list.length) {
      finalize();
    } else {
      setIdx((i) => i + 1);
    }
  }, [idx, list.length, finalize]);

  const handleTimeout = () => {
    setFeedback("timeout");
    setLives((l) => Math.max(0, l - 1));
    setTimeout(() => {
      if (lives - 1 <= 0) finalize();
      else goNext();
    }, 1300);
  };

  const handleWin = () => {
    setScore((s) => s + 1);
    setFeedback("correct");
    setShowShower((s) => s + 1);
    clearInterval(intervalRef.current);
    setTimeout(() => setShowShower(0), 1300);
    setTimeout(() => goNext(), 1300);
  };

  const handleWrongLetter = () => {
    // Penalty: lose 2 seconds + shake. Lives are reserved for timeouts.
    setTime((t) => Math.max(1, t - 2));
    setFeedback("wrong");
    setTimeout(() => setFeedback(null), 350);
  };

  const handleKey = useCallback(
    (key) => {
      if (phase !== "playing" || feedback === "correct" || feedback === "timeout") return;
      if (key === "BACK") {
        setTyped((t) => t.slice(0, -1));
        return;
      }
      // Lock when complete
      if (typed.length >= answerKey.length) return;
      const expected = answerKey[typed.length];
      if (key === expected) {
        const newTyped = typed + key;
        setTyped(newTyped);
        setHitFlash((h) => h + 1);
        if (newTyped === answerKey) {
          // delay to show last letter
          setTimeout(() => handleWin(), 250);
        }
      } else {
        handleWrongLetter();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, feedback, typed, answerKey]
  );

  // Physical keyboard listener
  useEffect(() => {
    const onKeyDown = (e) => {
      if (phase !== "playing") return;
      if (e.key === "Backspace") {
        e.preventDefault();
        handleKey("BACK");
        return;
      }
      const k = e.key.toUpperCase();
      if (/^[A-Z0-9]$/.test(k)) {
        e.preventDefault();
        handleKey(k);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, phase]);

  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <p>Catégorie introuvable.</p>
          <Link to="/categories" className="text-amber-400 underline">Retour</Link>
        </div>
      </div>
    );
  }

  const timePct = (time / TIME_PER_Q) * 100;

  return (
    <div className={`relative min-h-screen overflow-hidden bg-[#05050A] ${feedback === "wrong" || feedback === "timeout" ? "shake" : ""}`}>
      {/* Ambience */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[160px] opacity-10 pointer-events-none"
        style={{ background: AMBER }}
      />
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, ${AMBER}11 1px, transparent 1px), linear-gradient(to bottom, ${AMBER}11 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <CoinShower trigger={showShower} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* HUD top */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/lobby")}
            data-testid="quit-quiz-btn"
            className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest rounded-md border border-white/10 hover:border-white/30 text-slate-300"
          >
            <X className="w-4 h-4" /> {t.common.quit}
          </button>

          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                className={`w-5 h-5 sm:w-6 sm:h-6 ${i < lives ? "text-white fill-white" : "text-white/15"}`}
              />
            ))}
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{t.quiz.score}</div>
            <div
              data-testid="quiz-score-display"
              className="font-arcade text-3xl"
              style={{ color: AMBER }}
            >
              {String(score).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Category label */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full border border-white/10">
            <cat.icon className="w-4 h-4" style={{ color: AMBER }} />
            <span className="font-display font-bold uppercase tracking-tight text-xs sm:text-sm text-white">
              {cat.name[lang]}
            </span>
            {boss && (
              <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest" style={{ color: AMBER }}>
                <Skull className="w-3.5 h-3.5" /> BOSS STAGE
              </span>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {phase === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="text-center py-32"
            >
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-4">{t.quiz.ready}</div>
              <div
                className="font-arcade text-[180px] leading-none"
                style={{ color: AMBER, textShadow: `0 0 30px ${AMBER}80` }}
              >
                {countdown > 0 ? countdown : t.quiz.go}
              </div>
            </motion.div>
          )}

          {phase === "playing" && q && (
            <motion.div
              key={`q-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
            >
              {/* PIXEL GAME SCENE */}
              <div className="mb-4">
                <PixelScene category={categoryId} idx={idx} boss={boss} hitFlash={hitFlash} />
              </div>

              {/* Timer bar */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-sm bg-white/5 border border-white/10 overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{ width: `${timePct}%`, background: time < 5 ? "#FF5555" : AMBER }}
                    animate={{ opacity: time < 5 ? [1, 0.5, 1] : 1 }}
                    transition={{ duration: 0.5, repeat: time < 5 ? Infinity : 0 }}
                  />
                </div>
                <div
                  data-testid="quiz-timer-display"
                  className="font-arcade text-xl sm:text-2xl min-w-[40px] text-right"
                  style={{ color: time < 5 ? "#FF5555" : AMBER }}
                >
                  {String(time).padStart(2, "0")}
                </div>
              </div>

              {/* Question dialogue box */}
              <div
                className="rounded-xl p-4 sm:p-6 border-2 mb-4 relative bg-[#0B0B14]"
                style={{ borderColor: `${AMBER}55` }}
              >
                <div
                  className="text-xs uppercase tracking-widest font-arcade text-sm mb-2"
                  style={{ color: AMBER }}
                >
                  &gt;_ ÉNIGME [{String(idx + 1).padStart(2, "0")}/{list.length}]
                </div>
                <h2 className="font-display font-bold text-lg sm:text-2xl tracking-tight text-white leading-snug">
                  {q.q[lang]}
                </h2>
                <div className="absolute -bottom-2 left-8 w-3 h-3 rotate-45 bg-[#0B0B14] border-r-2 border-b-2" style={{ borderColor: `${AMBER}55` }} />
              </div>

              {/* Answer slots */}
              <div className="mb-5">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 text-center">
                  Tape la réponse ({answerKey.length} {answerKey.length > 1 ? "caractères" : "caractère"})
                </div>
                <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap">
                  {answerKey.split("").map((ch, i) => {
                    const filled = i < typed.length;
                    const current = i === typed.length && phase === "playing" && feedback !== "correct";
                    return (
                      <div
                        key={i}
                        data-testid={`slot-${i}`}
                        className={`pixel-block w-8 h-10 sm:w-10 sm:h-12 rounded-sm border-2 flex items-center justify-center font-pixel text-base sm:text-lg ${
                          current ? "blink-slot" : ""
                        }`}
                        style={{
                          borderColor: filled ? AMBER : "rgba(255,255,255,0.15)",
                          background: filled ? `${AMBER}1f` : "#0B0B14",
                          color: filled ? AMBER : "transparent",
                          boxShadow: filled ? `0 0 8px ${AMBER}55` : "none",
                        }}
                      >
                        {filled ? typed[i] : "_"}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* On-screen pixel keyboard */}
              <PixelKeyboard onKey={handleKey} disabled={feedback === "correct" || feedback === "timeout"} accent={AMBER} />

              {/* Feedback splash */}
              <AnimatePresence>
                {feedback === "correct" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
                  >
                    <div
                      className="font-display font-black uppercase text-6xl sm:text-8xl tracking-tighter"
                      style={{ color: "#5DD66E", textShadow: "0 0 30px #5DD66E" }}
                    >
                      {t.quiz.correct}
                    </div>
                  </motion.div>
                )}
                {feedback === "timeout" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
                  >
                    <div className="text-center">
                      <div className="font-display font-black uppercase text-5xl sm:text-7xl tracking-tighter text-[#FF5555]" style={{ textShadow: "0 0 24px #FF5555" }}>
                        TIME OUT
                      </div>
                      <div className="mt-2 font-arcade text-xl" style={{ color: AMBER }}>
                        &gt; {q.options[q.answer]}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-16 text-center"
            >
              <Trophy className="w-20 h-20 mx-auto mb-4" style={{ color: AMBER }} />
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">GAME COMPLETE</div>
              <h2 className="font-display font-black text-5xl uppercase tracking-tighter mb-6">
                {t.quiz.finalScore}
              </h2>
              <div
                className="font-arcade text-[140px] leading-none mb-2"
                style={{ color: AMBER, textShadow: `0 0 30px ${AMBER}80` }}
              >
                {score}/{list.length}
              </div>
              <div className="text-slate-400 mb-8">
                {t.quiz.rewardEarned}: <span className="font-arcade text-2xl" style={{ color: AMBER }}>+{(score * 22 + lives * 90).toLocaleString()}</span>
                <Coins className="inline w-5 h-5 ml-1" style={{ color: AMBER }} />
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => window.location.reload()}
                  data-testid="play-again-btn"
                  className="px-6 py-3 font-bold uppercase tracking-wider rounded-md transition flex items-center gap-2"
                  style={{ background: AMBER, color: "#000" }}
                >
                  <Zap className="w-4 h-4" /> {t.quiz.playAgain}
                </button>
                <button
                  onClick={() => navigate("/lobby")}
                  className="px-6 py-3 border border-white/20 text-white font-bold uppercase tracking-wider rounded-md hover:bg-white/5 transition flex items-center gap-2"
                >
                  {t.quiz.backToLobby} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
