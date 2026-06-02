import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { QUESTIONS, getCategory } from "../data/mockData";
import { toast } from "sonner";
import { Heart, Timer, Zap, Trophy, X, Check, ArrowRight, Coins } from "lucide-react";

const TIME_PER_Q = 15;

export default function QuizPlay() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { t, lang, addCoins } = useApp();

  const cat = getCategory(categoryId);
  const list = useMemo(() => QUESTIONS[categoryId] || [], [categoryId]);

  const [phase, setPhase] = useState("ready"); // ready -> playing -> done
  const [countdown, setCountdown] = useState(3);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(TIME_PER_Q);
  const [pickedIdx, setPickedIdx] = useState(null);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [lives, setLives] = useState(3);
  const intervalRef = useRef(null);

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

  // Question timer
  useEffect(() => {
    if (phase !== "playing") return;
    setTime(TIME_PER_Q);
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

  const goNext = () => {
    if (idx + 1 >= list.length) {
      finalize();
    } else {
      setIdx((i) => i + 1);
      setPickedIdx(null);
      setFeedback(null);
    }
  };

  const finalize = () => {
    setPhase("done");
    clearInterval(intervalRef.current);
    const reward = Math.round(score * 18 + lives * 80);
    addCoins(reward);
    toast.success(`+${reward.toLocaleString()} ${t.common.coins}`, {
      description: `${t.quiz.finalScore}: ${score}/${list.length}`,
    });
  };

  const handleTimeout = () => {
    setFeedback("wrong");
    setLives((l) => Math.max(0, l - 1));
    setTimeout(() => {
      if (lives - 1 <= 0) {
        finalize();
      } else {
        goNext();
      }
    }, 1100);
  };

  const handlePick = (i) => {
    if (pickedIdx !== null || phase !== "playing") return;
    clearInterval(intervalRef.current);
    setPickedIdx(i);
    const correct = i === list[idx].answer;
    if (correct) {
      setScore((s) => s + 1);
      setFeedback("correct");
    } else {
      setFeedback("wrong");
      setLives((l) => Math.max(0, l - 1));
    }
    setTimeout(() => {
      if (!correct && lives - 1 <= 0) {
        finalize();
      } else {
        goNext();
      }
    }, 1200);
  };

  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <p>Catégorie introuvable.</p>
          <Link to="/categories" className="text-[#00FFFF] underline">Retour</Link>
        </div>
      </div>
    );
  }

  const accent = cat.accent;
  const q = list[idx];

  const timePct = (time / TIME_PER_Q) * 100;

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${feedback === "wrong" ? "shake" : ""}`}
      style={{ background: `radial-gradient(ellipse at center, ${accent}10, #05050A 60%)` }}
    >
      {/* Arena Grid backdrop */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `linear-gradient(to right, ${accent}18 1px, transparent 1px), linear-gradient(to bottom, ${accent}18 1px, transparent 1px)`,
          backgroundSize: "70px 70px",
        }}
      />
      <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />
      {/* Animated horizon line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${accent}30, transparent)`,
        }}
      />
      {/* Big accent blob */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 pointer-events-none"
        style={{ background: accent }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* HUD top */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/lobby")}
            data-testid="quit-quiz-btn"
            className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-widest rounded-md border border-white/10 hover:border-white/30 text-slate-300"
          >
            <X className="w-4 h-4" /> {t.common.quit}
          </button>

          {/* Lives */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <Heart
                key={i}
                className={`w-6 h-6 ${i < lives ? "text-[#FF3333] fill-[#FF3333]" : "text-white/15"}`}
                style={{ filter: i < lives ? "drop-shadow(0 0 8px #FF3333)" : "none" }}
              />
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{t.quiz.score}</div>
              <div
                data-testid="quiz-score-display"
                className="font-arcade text-3xl text-glow-yellow"
                style={{ color: "#FFD700" }}
              >
                {String(score).padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>

        {/* Category label */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border" style={{ borderColor: `${accent}66`, background: `${accent}10` }}>
            <cat.icon className="w-4 h-4" style={{ color: accent }} />
            <span className="font-display font-bold uppercase tracking-tight text-sm" style={{ color: accent }}>
              {cat.name[lang]}
            </span>
            <span className="text-xs text-slate-500">— {cat.style}</span>
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
                className="font-arcade text-[180px] leading-none text-glow-yellow"
                style={{ color: countdown > 0 ? accent : "#FFD700" }}
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
              {/* Timer bar (HUD) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2 text-xs uppercase tracking-widest text-slate-400">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5" />
                    {t.quiz.timer}
                  </div>
                  <div>
                    {t.quiz.question} {idx + 1}/{list.length}
                  </div>
                </div>
                <div className="h-3 rounded-sm bg-white/5 border border-white/10 overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{
                      width: `${timePct}%`,
                      background: time < 5 ? "#FF3333" : accent,
                      boxShadow: `0 0 12px ${time < 5 ? "#FF3333" : accent}`,
                    }}
                    animate={{ opacity: time < 5 ? [1, 0.5, 1] : 1 }}
                    transition={{ duration: 0.5, repeat: time < 5 ? Infinity : 0 }}
                  />
                </div>
                <div
                  data-testid="quiz-timer-display"
                  className="text-center mt-2 font-arcade text-4xl"
                  style={{ color: time < 5 ? "#FF3333" : accent }}
                >
                  {String(time).padStart(2, "0")}
                </div>
              </div>

              {/* Question card */}
              <div
                className="rounded-2xl p-8 border-2 mb-6 relative overflow-hidden"
                style={{
                  borderColor: `${accent}55`,
                  background: "rgba(11, 11, 20, 0.85)",
                  backdropFilter: "blur(12px)",
                  boxShadow: `0 0 36px ${accent}30, inset 0 0 24px ${accent}10`,
                }}
              >
                <div className="scanline-bar" />
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-arcade text-base">
                  &gt;_ QUESTION {String(idx + 1).padStart(2, "0")}
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-white">
                  {q.q[lang]}
                </h2>
              </div>

              {/* Options */}
              <div className="grid sm:grid-cols-2 gap-4">
                {q.options.map((opt, i) => {
                  const isPicked = pickedIdx === i;
                  const isCorrect = i === q.answer;
                  const reveal = pickedIdx !== null;
                  let bd = "rgba(255,255,255,0.1)";
                  let bg = "rgba(18,18,30,0.8)";
                  let glow = "";
                  if (reveal && isCorrect) {
                    bd = "#39FF14";
                    bg = "rgba(57,255,20,0.12)";
                    glow = "0 0 28px rgba(57,255,20,0.5)";
                  } else if (reveal && isPicked && !isCorrect) {
                    bd = "#FF3333";
                    bg = "rgba(255,51,51,0.12)";
                    glow = "0 0 28px rgba(255,51,51,0.5)";
                  } else if (!reveal) {
                    bd = `${accent}40`;
                  }

                  return (
                    <motion.button
                      key={i}
                      onClick={() => handlePick(i)}
                      data-testid={`quiz-option-${["a", "b", "c", "d"][i]}`}
                      disabled={pickedIdx !== null}
                      whileHover={pickedIdx === null ? { scale: 1.02 } : {}}
                      whileTap={pickedIdx === null ? { scale: 0.98 } : {}}
                      className="text-left p-5 rounded-xl border-2 transition-all relative"
                      style={{ borderColor: bd, background: bg, boxShadow: glow }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-md flex items-center justify-center font-pixel text-xs flex-shrink-0"
                          style={{ background: `${accent}25`, color: accent }}
                        >
                          {["A", "B", "C", "D"][i]}
                        </div>
                        <div className="font-medium text-white text-base">{opt}</div>
                        {reveal && isCorrect && (
                          <Check className="ml-auto w-6 h-6 text-[#39FF14]" />
                        )}
                        {reveal && isPicked && !isCorrect && (
                          <X className="ml-auto w-6 h-6 text-[#FF3333]" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Feedback splash */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
                  >
                    <div
                      className="font-display font-black uppercase text-6xl sm:text-8xl tracking-tighter"
                      style={{
                        color: feedback === "correct" ? "#39FF14" : "#FF3333",
                        textShadow: `0 0 30px ${feedback === "correct" ? "#39FF14" : "#FF3333"}`,
                      }}
                    >
                      {feedback === "correct" ? t.quiz.correct : t.quiz.wrong}
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
              <Trophy className="w-20 h-20 mx-auto mb-4 text-[#FFD700]" />
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">GAME COMPLETE</div>
              <h2 className="font-display font-black text-5xl uppercase tracking-tighter mb-6">
                {t.quiz.finalScore}
              </h2>
              <div className="font-arcade text-[140px] leading-none text-[#FFD700] text-glow-yellow mb-2">
                {score}/{list.length}
              </div>
              <div className="text-slate-400 mb-8">
                {t.quiz.rewardEarned}: <span className="font-arcade text-2xl text-[#39FF14]">+{(score * 18 + lives * 80).toLocaleString()}</span>
                <Coins className="inline w-5 h-5 text-[#FFD700] ml-1" />
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => window.location.reload()}
                  data-testid="play-again-btn"
                  className="px-6 py-3 bg-[#FFD700] text-black font-bold uppercase tracking-wider rounded-md hover:shadow-[0_0_24px_rgba(255,215,0,0.7)] transition flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" /> {t.quiz.playAgain}
                </button>
                <button
                  onClick={() => navigate("/lobby")}
                  className="px-6 py-3 border border-[#00FFFF] text-[#00FFFF] font-bold uppercase tracking-wider rounded-md hover:bg-[#00FFFF]/10 transition flex items-center gap-2"
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
