import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { QUESTIONS, getCategory } from "../data/mockData";
import { toast } from "sonner";
import PixelScene from "../components/PixelScene";
import { Heart, Timer, Zap, Trophy, X, Check, ArrowRight, Coins } from "lucide-react";

const TIME_PER_Q = 15;
const ROUND_SIZE = 10;
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
  const list = useMemo(
    () => pickRandom(QUESTIONS[categoryId] || [], ROUND_SIZE),
    [categoryId]
  );

  const [phase, setPhase] = useState("ready");
  const [countdown, setCountdown] = useState(3);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(TIME_PER_Q);
  const [pickedIdx, setPickedIdx] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [lives, setLives] = useState(3);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (phase !== "ready") return;
    if (countdown <= 0) {
      setPhase("playing");
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 800);
    return () => clearTimeout(id);
  }, [phase, countdown]);

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
      if (lives - 1 <= 0) finalize();
      else goNext();
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
      if (!correct && lives - 1 <= 0) finalize();
      else goNext();
    }, 1200);
  };

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

  const q = list[idx];
  const timePct = (time / TIME_PER_Q) * 100;

  return (
    <div className={`relative min-h-screen overflow-hidden bg-[#05050A] ${feedback === "wrong" ? "shake" : ""}`}>
      {/* Subtle amber glow ambience */}
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

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* HUD top */}
        <div className="flex items-center justify-between mb-6">
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
                className={`w-6 h-6 ${i < lives ? "text-white fill-white" : "text-white/15"}`}
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
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10">
            <cat.icon className="w-4 h-4" style={{ color: AMBER }} />
            <span className="font-display font-bold uppercase tracking-tight text-sm text-white">
              {cat.name[lang]}
            </span>
            <span className="text-xs text-slate-500">— {cat.style[lang]}</span>
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
              {/* PIXEL ART GAME SCENE */}
              <div className="mb-5">
                <PixelScene category={categoryId} idx={idx} />
              </div>

              {/* Timer bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2 text-xs uppercase tracking-widest text-slate-400">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5" />
                    {t.quiz.timer}
                  </div>
                  <div>
                    {t.quiz.question} {idx + 1}/{list.length}
                  </div>
                  <div
                    data-testid="quiz-timer-display"
                    className="font-arcade text-2xl"
                    style={{ color: time < 5 ? "#FF5555" : AMBER }}
                  >
                    {String(time).padStart(2, "0")}
                  </div>
                </div>
                <div className="h-2 rounded-sm bg-white/5 border border-white/10 overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{
                      width: `${timePct}%`,
                      background: time < 5 ? "#FF5555" : AMBER,
                    }}
                    animate={{ opacity: time < 5 ? [1, 0.5, 1] : 1 }}
                    transition={{ duration: 0.5, repeat: time < 5 ? Infinity : 0 }}
                  />
                </div>
              </div>

              {/* Question card — dialogue-box style */}
              <div
                className="rounded-xl p-6 sm:p-8 border-2 mb-5 relative bg-[#0B0B14]"
                style={{ borderColor: `${AMBER}55` }}
              >
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-arcade text-base" style={{ color: AMBER }}>
                  &gt;_ DIALOGUE.BOX [{String(idx + 1).padStart(2, "0")}/{list.length}]
                </div>
                <h2 className="font-display font-bold text-xl sm:text-2xl lg:text-3xl tracking-tight text-white leading-snug">
                  {q.q[lang]}
                </h2>
                {/* dialogue triangle */}
                <div className="absolute -bottom-2 left-8 w-3 h-3 rotate-45 bg-[#0B0B14] border-r-2 border-b-2" style={{ borderColor: `${AMBER}55` }} />
              </div>

              {/* Options */}
              <div className="grid sm:grid-cols-2 gap-3">
                {q.options.map((opt, i) => {
                  const isPicked = pickedIdx === i;
                  const isCorrect = i === q.answer;
                  const reveal = pickedIdx !== null;
                  let bd = "rgba(255,255,255,0.12)";
                  let bg = "#0B0B14";
                  let txt = "#fff";
                  if (reveal && isCorrect) {
                    bd = "#5DD66E";
                    bg = "rgba(93,214,110,0.10)";
                    txt = "#5DD66E";
                  } else if (reveal && isPicked && !isCorrect) {
                    bd = "#FF5555";
                    bg = "rgba(255,85,85,0.10)";
                    txt = "#FF5555";
                  }

                  return (
                    <motion.button
                      key={i}
                      onClick={() => handlePick(i)}
                      data-testid={`quiz-option-${["a", "b", "c", "d"][i]}`}
                      disabled={pickedIdx !== null}
                      whileHover={pickedIdx === null ? { scale: 1.01, borderColor: AMBER } : {}}
                      whileTap={pickedIdx === null ? { scale: 0.99 } : {}}
                      className="text-left p-4 rounded-lg border-2 transition-colors relative"
                      style={{ borderColor: bd, background: bg }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-9 h-9 rounded-md flex items-center justify-center font-pixel text-[10px] flex-shrink-0 border"
                          style={{ background: `${AMBER}15`, color: AMBER, borderColor: `${AMBER}50` }}
                        >
                          {["A", "B", "C", "D"][i]}
                        </div>
                        <div className="font-medium text-base" style={{ color: txt }}>{opt}</div>
                        {reveal && isCorrect && (
                          <Check className="ml-auto w-5 h-5 text-[#5DD66E]" />
                        )}
                        {reveal && isPicked && !isCorrect && (
                          <X className="ml-auto w-5 h-5 text-[#FF5555]" />
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
                        color: feedback === "correct" ? "#5DD66E" : "#FF5555",
                        textShadow: `0 0 30px ${feedback === "correct" ? "#5DD66E" : "#FF5555"}`,
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
                {t.quiz.rewardEarned}: <span className="font-arcade text-2xl" style={{ color: AMBER }}>+{(score * 18 + lives * 80).toLocaleString()}</span>
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
