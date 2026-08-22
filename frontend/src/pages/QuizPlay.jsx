import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { CATEGORIES, QUESTIONS, getCategory } from "../data/mockData";
import { SFX } from "../lib/soundEngine";
import { formatMoney } from "../lib/currency";
import { X, Flame, Zap, AlertTriangle, Volume2, VolumeX, ShieldQuestion, Image as ImageIcon, Type, BookOpen } from "lucide-react";
import ResultScreen from "../components/ResultScreen";
import QuestionIntro from "../components/QuestionIntro";
import AmbientBackground from "../components/AmbientBackground";
import Celebration from "../components/Celebration";
import CountUp from "../components/CountUp";
import * as api from "../lib/api";

const QUESTION_REVEAL_MS = 650;
const AMBER        = "var(--accent)";

// Encouragements aléatoires affichés au feedback correct — style Duolingo
const PRAISE_WORDS = [
  "Excellent",
  "Impressionnant",
  "Bravo",
  "En feu",
  "Superbe",
  "Parfait",
  "Bien vu",
  "Continue",
];
const LABELS       = ["A", "B", "C", "D"];
const STAKES       = [100, 250, 500, 1000, 2500];
const SOLO_LEVELS = [
  { id: "easy", label: "Facile", odd: 1.05, time: 10, text: "Confort", icon: ShieldQuestion },
  { id: "medium", label: "Moyen", odd: 1.10, time: 8, text: "Équilibre", icon: Zap },
  { id: "hard", label: "Difficile", odd: 1.30, time: 7, text: "Risque", icon: Flame },
];
const QUESTION_FORMATS = ["text", "audio", "image"];

function getMult(streak) {
  if (streak >= 5) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

const R    = 46;
const CIRC = 2 * Math.PI * R;

function CircularTimer({ timeLeft, total, urgent }) {
  const pct    = timeLeft / total;
  const offset = CIRC * (1 - pct);
  const color  = urgent ? "var(--danger)" : timeLeft <= 5 ? "var(--warning)" : "var(--accent)";
  return (
    <motion.div
      className="relative flex items-center justify-center select-none"
      style={{ width: 116, height: 116 }}
      animate={{ scale: urgent ? [1, 1.03, 1] : 1 }}
      transition={{ duration: 0.6, repeat: urgent ? Infinity : 0, ease: "easeInOut" }}
    >
      <svg width="116" height="116" className="absolute" style={{ overflow: "visible" }}>
        <circle cx="58" cy="58" r={R} fill="none" stroke="var(--active)" strokeWidth="5" />
        <motion.circle
          cx="58" cy="58" r={R} fill="none" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={CIRC} transform="rotate(-90 58 58)"
          animate={{ strokeDashoffset: offset, stroke: color, filter: `drop-shadow(0 0 ${urgent ? 12 : 6}px ${color})` }}
          transition={{ strokeDashoffset: { duration: 1, ease: "linear" }, stroke: { duration: 0.3 } }}
        />
      </svg>
      <motion.span
        className="font-display font-semibold text-3xl leading-none z-10 tabular-nums tracking-tight"
        animate={{ color, scale: urgent ? [1, 1.10, 1] : 1 }}
        transition={{ duration: 0.5, repeat: urgent ? Infinity : 0 }}
      >
        {timeLeft}
      </motion.span>
    </motion.div>
  );
}

const STATE_STYLE = {
  idle:    { bg: "var(--surface)",             border: "var(--border-md)",     text: "var(--text)", lBg: "var(--active)",                lCol: "var(--text)",  glow: "none" },
  correct: { bg: "rgba(16,185,129,0.14)",      border: "rgba(16,185,129,0.55)", text: "var(--success)", lBg: "rgba(16,185,129,0.22)",  lCol: "var(--success)", glow: "0 0 20px rgba(16,185,129,0.28)" },
  wrong:   { bg: "rgba(244,63,94,0.14)",       border: "rgba(244,63,94,0.55)",  text: "var(--danger)",  lBg: "rgba(244,63,94,0.22)",   lCol: "var(--danger)",  glow: "0 0 20px rgba(244,63,94,0.24)" },
};

function SetupStat({ label, value }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "var(--qa-active)" }}>
      <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--qa-text-faint)" }}>
        {label}
      </div>
      <div className="text-sm font-bold mt-0.5" style={{ color: "var(--qa-text)" }}>
        {value}
      </div>
    </div>
  );
}

export default function QuizPlay() {
  const { categoryId }    = useParams();
  const navigate          = useNavigate();
  const { lang, coins, refreshWallet, updateElo, currency } = useApp();

  // La banque locale ne sert plus à jouer. Le serveur choisit les questions,
  // mélange les propositions et ne révèle jamais la réponse avant le clic.
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState(null);
  const [startLoading, setStartLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Solo challenge state
  const [selectedLevelId, setSelectedLevelId] = useState("medium");
  const [selectedStake,  setSelectedStake] = useState(500);
  const selectedLevel = SOLO_LEVELS.find((level) => level.id === selectedLevelId) || SOLO_LEVELS[1];
  const currentTimeLimit = session ? Math.ceil(session.timePerQuestionMs / 1000) : selectedLevel.time;

  // Phase machine: setup → ready → playing → ceremony → done
  const [phase,        setPhase]        = useState("setup");
  const [countdown,    setCountdown]    = useState(3);
  const [qIdx,         setQIdx]         = useState(0);
  const [timeLeft,     setTimeLeft]     = useState(currentTimeLimit);
  const [chosen,       setChosen]       = useState(null);
  const [answersReady, setAnswersReady] = useState(false);
  const [totalPoints,  setTotalPoints]  = useState(0);
  const [lastPts,      setLastPts]      = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [eloResult,    setEloResult]    = useState(null);
  const [flash,        setFlash]        = useState(null);
  const [nextIn,       setNextIn]       = useState(null); // countdown before next question
  const [muted,        setMuted]        = useState(() => localStorage.getItem("qa_sound_muted") === "1");
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  // Joue un effet sonore, sauf si l'utilisateur a coupé le son (ref pour
  // rester correct dans les callbacks mémoïsés qui n'ont pas `muted` en dep).
  const playSfx = useCallback((fn) => { if (!mutedRef.current) fn(); }, []);

  const correctRef = useRef(0);
  const pointsRef  = useRef(0);
  const streakRef  = useRef(0);
  const timerRef   = useRef(null);
  const revealTimerRef = useRef(null);
  const phaseRef   = useRef("setup");
  const forfeitedRef = useRef(false);
  const answersRef = useRef([]);
  const questionShownAtRef = useRef(0);
  const sessionStartedAtRef = useRef(0);
  const tabSwitchesRef = useRef(0);
  const submittingRef = useRef(false);

  const toggleMusic = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem("qa_sound_muted", next ? "1" : "0");
      return next;
    });
  }, []);

  const q      = questions[qIdx];
  const cat    = getCategory(q?.categoryId || categoryId);
  const isMixed = categoryId === "random";
  const questionBankSize = CATEGORIES.reduce((sum, item) => sum + item.questions, 0);
  const mult   = getMult(streak);
  const urgent = timeLeft <= Math.min(5, currentTimeLimit - 1) && phase === "playing";
  const isGameScreen = phase !== "setup";

  const speakQuestion = useCallback(() => {
    if (!q || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(q.q[lang] || q.q.fr);
    utterance.lang = lang === "fr" ? "fr-FR" : "en-US";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }, [q, lang]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) tabSwitchesRef.current += 1; };
    const onBlur = () => { tabSwitchesRef.current += 1; };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (phase === "playing" && q?.displayType === "audio") speakQuestion();
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [phase, qIdx, q?.displayType, speakQuestion]);

  // Countdown
  useEffect(() => {
    if (phase !== "ready") return;
    if (countdown <= 0) { setPhase("playing"); return; }
    const id = setTimeout(() => setCountdown(c => c - 1), 900);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  // Intro → playing after 1.5s
  useEffect(() => {
    if (phase !== "intro") return;
    const id = setTimeout(() => setPhase("playing"), 1500);
    return () => clearTimeout(id);
  }, [phase]);

  // Per-question timer
  useEffect(() => {
    if (phase !== "playing") return;
    questionShownAtRef.current = performance.now();
    setTimeLeft(currentTimeLimit);
    setChosen(null);
    setFlash(null);
    setAnswersReady(false);

    clearInterval(timerRef.current);
    clearTimeout(revealTimerRef.current);

    revealTimerRef.current = setTimeout(() => {
      if (phaseRef.current !== "playing") return;
      setAnswersReady(true);

      let t = currentTimeLimit;
      timerRef.current = setInterval(() => {
        if (phaseRef.current !== "playing") { clearInterval(timerRef.current); return; }
        t -= 1;
        if (t <= 3) playSfx(SFX.tick);
        if (t <= 0) { clearInterval(timerRef.current); onTimeout(); return; }
        setTimeLeft(t);
      }, 1000);
    }, QUESTION_REVEAL_MS);

    return () => {
      clearInterval(timerRef.current);
      clearTimeout(revealTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx, phase, currentTimeLimit]);

  // Ceremony → countdown → next question / finalize
  useEffect(() => {
    if (phase !== "ceremony") { setNextIn(null); return; }
    setNextIn(3);
    let t = 3;
    const id = setInterval(() => {
      t -= 1;
      if (t <= 0) {
        clearInterval(id);
        if (qIdx + 1 >= questions.length) finalize();
        else { setQIdx(i => i + 1); setPhase("intro"); }
      } else {
        setNextIn(t);
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIdx]);

  const finalize = useCallback(async () => {
    if (!session || submittingRef.current) return;
    submittingRef.current = true;
    clearInterval(timerRef.current);
    try {
      const result = await api.submitQuiz({
        sessionId: session.sessionId,
        answers: answersRef.current,
        tabSwitches: tabSwitchesRef.current,
        totalDurationMs: Date.now() - sessionStartedAtRef.current,
      });
      const netCoins = result.payoutCoins - selectedStake;
      setCorrectCount(result.scoreServer);
      correctRef.current = result.scoreServer;
      setTotalPoints(netCoins);
      setEloResult({ newElo: result.eloRating, delta: result.eloDelta });
      updateElo(result.eloRating);
      await refreshWallet();
      playSfx(result.scoreServer >= 7 ? SFX.victory : SFX.defeat);
      setPhase("done");
    } catch (error) {
      setLoadError(error.message || "Impossible de valider la partie");
      setPhase("setup");
    } finally {
      submittingRef.current = false;
    }
  }, [playSfx, refreshWallet, selectedStake, session, updateElo]);

  const revealAnswer = useCallback(async (chosenIndex) => {
    const current = questions[qIdx];
    if (!session || !current) return;
    const responseMs = Math.max(0, Math.round(performance.now() - questionShownAtRef.current));
    answersRef.current.push({ questionId: current.id, chosenIndex, responseMs });
    try {
      const reveal = await api.revealQuiz(session.sessionId, current.id);
      setQuestions((items) => items.map((item, index) => index === qIdx ? { ...item, answer: reveal.shuffledCorrectIndex } : item));
      return reveal.shuffledCorrectIndex;
    } catch (error) {
      setLoadError(error.message || "La réponse n'a pas pu être vérifiée");
      return -2;
    }
  }, [qIdx, questions, session]);

  const onTimeout = async () => {
    const answer = await revealAnswer(-1);
    streakRef.current = 0;
    setStreak(0); setFlash("wrong"); setLastPts(0);
    playSfx(SFX.wrong);
    setChosen(-1);
    if (answer !== -2) setPhase("ceremony");
  };

  const handleChoice = useCallback(async (optIdx) => {
    if (phase !== "playing" || !answersReady || chosen !== null) return;
    clearInterval(timerRef.current);
    setChosen(optIdx);
    const correctIndex = await revealAnswer(optIdx);
    if (correctIndex === -2) return;
    if (optIdx === correctIndex) {
      streakRef.current += 1;
      const m    = getMult(streakRef.current);
      const base = Math.round(200 + (timeLeft / currentTimeLimit) * 800);
      const pts  = Math.round(base * m);
      correctRef.current += 1;
      pointsRef.current  += pts;
      setCorrectCount(correctRef.current);
      setTotalPoints(pointsRef.current);
      setStreak(streakRef.current);
      setLastPts(pts);
      setFlash("correct");
      playSfx(SFX.correct);
      if (streakRef.current >= 5) setTimeout(() => playSfx(SFX.onFire), 300);
      else if (streakRef.current >= 3) setTimeout(() => playSfx(SFX.streak), 300);
    } else {
      streakRef.current = 0;
      setStreak(0); setLastPts(0); setFlash("wrong");
      playSfx(SFX.wrong);
    }
    setPhase("ceremony");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, answersReady, chosen, timeLeft, currentTimeLimit, revealAnswer, playSfx]);

  const startGame = useCallback(async () => {
    if (coins < selectedStake || startLoading) return;
    setStartLoading(true);
    setLoadError("");
    try {
      const result = await api.startQuiz({ categoryId, mode: "CHALLENGE", stakeCoins: selectedStake });
      setSession(result);
      setQuestions(result.questions.map((question, index) => ({
        ...question,
        q: { fr: question.text, en: question.text },
        categoryId,
        displayType: QUESTION_FORMATS[index % QUESTION_FORMATS.length],
        answer: null,
      })));
      answersRef.current = [];
      sessionStartedAtRef.current = Date.now();
      tabSwitchesRef.current = 0;
      setQIdx(0);
      setCountdown(3);
      setPhase("ready");
      await refreshWallet();
    } catch (error) {
      setLoadError(error.message || "Impossible de démarrer la partie");
    } finally {
      setStartLoading(false);
    }
  }, [categoryId, coins, refreshWallet, selectedStake, startLoading]);

  useEffect(() => {
    const map = { a: 0, b: 1, c: 2, d: 3 };
    const fn  = (e) => { if (phase !== "playing") return; const i = map[e.key.toLowerCase()]; if (i !== undefined) handleChoice(i); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [phase, handleChoice]);

  if (!q && phase !== "setup") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/50 mb-2 text-sm">Catégorie introuvable.</p>
        <Link to="/" className="text-sm underline" style={{ color: AMBER }}>Retour</Link>
      </div>
    </div>
  );

  if (phase === "done") {
    return (
      <ResultScreen
        result={
          totalPoints >= 0 ? "win" : "loss"
        }
        coinsGained={totalPoints}
        myScore={correctCount}
        total={questions.length}
        eloNew={eloResult?.newElo}
        eloDelta={eloResult?.delta}
        streak={streak}
        isDaily={false}
        modeLabel={`Solo ${selectedLevel.label}`}
        onReplay={() => window.location.reload()}
        onLobby={() => navigate("/")}
      />
    );
  }

  const CatIcon = cat?.icon || ShieldQuestion;
  const modeName = isMixed ? "Quiz mélangé" : cat.name[lang];

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: isGameScreen ? undefined : "var(--qa-page)" }}>
      {isGameScreen && <AmbientBackground intensity={urgent ? "urgent" : "calm"} />}
      {/* Ambient glow */}
      {isGameScreen && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background:
              flash === "correct" ? "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(93,214,110,0.13) 0%, transparent 70%)" :
              flash === "wrong"   ? "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255,85,85,0.11) 0%, transparent 70%)" :
              urgent              ? "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255,85,85,0.07) 0%, transparent 70%)" :
                                    "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(229,168,0,0.06) 0%, transparent 70%)",
          }}
          transition={{ duration: 0.35 }}
        />
      )}

      <div
        className={`relative z-10 mx-auto px-4 sm:px-6 py-5 flex flex-col ${isGameScreen ? "max-w-3xl" : "max-w-2xl"}`}
        style={{ minHeight: "100dvh" }}
      >

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-white/70 rounded-lg hover:text-white transition backdrop-blur-md"
              style={{
                background: isGameScreen ? "rgba(7,18,14,0.48)" : "var(--qa-surface)",
                border: isGameScreen ? "1px solid rgba(216,238,218,0.16)" : "1px solid var(--qa-border)",
                color: isGameScreen ? undefined : "var(--qa-text-sub)",
              }}
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
            <button
              onClick={toggleMusic}
              className="p-2 rounded-lg border transition hover:opacity-80"
              style={{
                borderColor: muted ? (isGameScreen ? "rgba(216,238,218,0.14)" : "var(--qa-border)") : `${AMBER}45`,
                color: muted ? "var(--qa-text-faint)" : AMBER,
                background: muted ? (isGameScreen ? "rgba(7,18,14,0.40)" : "var(--qa-surface)") : `${AMBER}18`,
              }}
              title={muted ? "Activer le son" : "Couper le son"}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isGameScreen ? (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border backdrop-blur-md"
              style={{ background: `${AMBER}10`, borderColor: `${AMBER}28`, color: AMBER }}
            >
              <CatIcon className="w-3.5 h-3.5" />
              {modeName}
            </div>
          ) : (
            <div />
          )}

          <div className="w-20 flex justify-end">
            <AnimatePresence>
              {streak >= 3 && (
                <motion.div
                  key={`s-${streak}`}
                  initial={{ scale: 0, opacity: 0, y: -8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border"
                  style={{ background: streak >= 5 ? "rgba(255,107,107,0.14)" : `${AMBER}14`, color: streak >= 5 ? "#FF7070" : AMBER, borderColor: streak >= 5 ? "rgba(255,107,107,0.3)" : `${AMBER}30` }}
                >
                  <Flame className="w-3 h-3" /> ×{mult}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ════ SETUP ════ */}
          {phase === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="flex-1 flex flex-col gap-5"
            >
              <motion.header
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: AMBER }}>
                    <CatIcon className="w-4 h-4" />
                    Salle solo
                  </div>
                  <h1 className="font-display font-bold text-2xl sm:text-3xl mt-1" style={{ color: "var(--qa-text)" }}>
                    Solo rapide
                  </h1>
                </div>
                <div
                  className="grid grid-cols-3 gap-2 rounded-2xl p-2"
                  style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
                >
                  <SetupStat label="Banque" value={`${questionBankSize} Q`} />
                  <SetupStat label="Chrono" value={`${currentTimeLimit}s`} />
                  <SetupStat label="Format" value="Mix A/V" />
                </div>
              </motion.header>

              <div className="card rounded-2xl p-4 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: AMBER }}>
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--qa-text)" }}>Format officiel</div>
                  <div className="text-xs mt-1" style={{ color: "var(--qa-text-sub)" }}>10 questions · 8 secondes · paiement progressif selon le score</div>
                </div>
              </div>

              <div className="card rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--qa-text-faint)" }}>Ta mise</p>
                <div className="flex gap-2 flex-wrap">
                  {STAKES.map(s => {
                    const canAfford = coins >= s;
                    return (
                      <button
                        key={s}
                        onClick={() => canAfford && setSelectedStake(s)}
                        disabled={!canAfford}
                        className="px-3 py-2 rounded-xl text-xs font-bold transition border"
                        style={{
                          background: selectedStake === s ? AMBER : "var(--qa-surface-2)",
                          borderColor: selectedStake === s ? AMBER : "var(--qa-border)",
                          color: selectedStake === s ? "#07070F" : canAfford ? "var(--qa-text-sub)" : "var(--qa-text-faint)",
                          cursor: canAfford ? "pointer" : "not-allowed",
                        }}
                      >
                        {formatMoney(s, currency)}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{ background: "var(--qa-active)" }}>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--qa-text-faint)" }}>Gain si 7/10+</div>
                    <div className="text-base font-bold mt-1" style={{ color: "var(--success)" }}>
                      {formatMoney(Math.round(selectedStake * 0.2), currency, { showPlus: true })}
                    </div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "var(--qa-active)" }}>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--qa-text-faint)" }}>Règle</div>
                    <div className="text-xs font-semibold mt-1" style={{ color: "var(--qa-text)" }}>Sortie de page = mise perdue</div>
                  </div>
                </div>
                {coins < selectedStake && (
                  <div className="flex items-center gap-1.5 mt-3 text-[11px]" style={{ color: "var(--danger)" }}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Solde insuffisant — solde : {formatMoney(coins, currency)}
                  </div>
                )}
              </div>

              {/* Start button */}
              <div className="mt-auto pt-2">
                <button
                  onClick={startGame}
                  disabled={coins < selectedStake || startLoading}
                  className="w-full py-3 rounded-xl text-sm font-bold transition disabled:opacity-40"
                  style={{ background: AMBER, color: "#07070F" }}
                >
                  {startLoading ? "Ouverture sécurisée…" : `Miser ${formatMoney(selectedStake, currency)} et lancer le challenge`}
                </button>
                {loadError && <p className="text-center text-xs mt-2" style={{ color: "var(--danger)" }}>{loadError}</p>}
                <p className="text-center text-[10px] text-white/20 mt-2">
                  <Link to="/rules" className="underline hover:text-white/40 transition">Lire les règles complètes</Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* ════ READY ════ */}
          {phase === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex-1 flex flex-col items-center justify-center text-center gap-6"
            >
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{ background: `${AMBER}14`, color: AMBER }}
              >
                <CatIcon className="w-10 h-10" />
              </motion.div>
              <div>
                <p className="text-xs text-white/30 mb-2 uppercase tracking-widest">{ROUND_SIZE} questions · {modeName}</p>
                <p className="text-xs font-semibold mb-1" style={{ color: AMBER }}>
                  {selectedLevel.label} · Côte ×{selectedLevel.odd.toFixed(2)} · Mise {formatMoney(selectedStake, currency)}
                </p>
              </div>
              <motion.div
                key={countdown}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 18 }}
                className="font-arcade leading-none"
                style={{ fontSize: 110, color: AMBER, textShadow: `0 0 40px ${AMBER}70` }}
              >
                {countdown > 0 ? countdown : "GO!"}
              </motion.div>
            </motion.div>
          )}

          {/* ════ PLAYING + CEREMONY + INTRO (question rendered underneath overlay) ════ */}
          {(phase === "playing" || phase === "ceremony" || phase === "intro") && (
            <motion.div
              key={`q-${qIdx}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col"
            >
              {/* Scoreboard */}
              <div className="flex items-center justify-between mb-5 relative">
                <div className="text-center min-w-[80px]">
                  <p className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: "var(--text-faint)" }}>
                    Mise
                  </p>
                  <p className="font-display font-semibold text-base leading-none tabular-nums tracking-tight" style={{ color: "var(--accent)" }}>
                    {formatMoney(selectedStake, currency)}
                  </p>
                </div>

                <div className="relative">
                  <CircularTimer timeLeft={timeLeft} total={currentTimeLimit} urgent={urgent} />
                  {/* Celebration burst au correct */}
                  <Celebration show={flash === "correct"} />
                </div>

                <div className="text-center min-w-[80px]">
                  <p className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: "var(--text-faint)" }}>Score</p>
                  <p className="font-display font-semibold text-xl leading-none tabular-nums tracking-tight" style={{ color: "var(--success)" }}>
                    <CountUp to={correctCount} />
                    <span className="text-sm" style={{ color: "var(--text-faint)" }}>/{questions.length}</span>
                  </p>
                </div>
              </div>

              <SoloQuestionCard
                question={q}
                cat={cat}
                lang={lang}
                qIdx={qIdx}
                total={questions.length}
                flash={flash}
                onReplayAudio={speakQuestion}
                streak={streak}
              />

              {/* Options */}
              {answersReady || phase === "ceremony" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                  {q.options.map((opt, i) => {
                  let state = "idle";
                  if (phase === "ceremony") {
                    if (i === q.answer) state = "correct";
                    else if (i === chosen && chosen !== q.answer) state = "wrong";
                  }
                  const s = STATE_STYLE[state];
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0, scale: state === "correct" ? [1, 1.05, 0.98, 1] : 1, x: state === "wrong" ? [0, -7, 7, -5, 5, -3, 3, 0] : 0 }}
                      transition={{ opacity: { delay: 0.05 * i, duration: 0.2 }, y: { delay: 0.05 * i, duration: 0.2 }, scale: { duration: 0.4 }, x: { duration: 0.45 } }}
                      onClick={() => handleChoice(i)}
                      disabled={phase !== "playing" || !answersReady}
                      whileHover={phase === "playing" ? { scale: 1.025, y: -1 } : {}}
                      whileTap={phase === "playing" ? { scale: 0.96 } : {}}
                      className="relative flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-xl border transition-colors duration-200"
                      style={{ background: s.bg, borderColor: s.border, boxShadow: s.glow, cursor: phase !== "playing" || !answersReady ? "default" : "pointer", backdropFilter: "blur(14px)" }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: s.lBg, color: s.lCol }}>
                        {state === "correct" ? "OK" : state === "wrong" ? "NO" : LABELS[i]}
                      </div>
                      <span className="text-sm leading-snug" style={{ color: s.text }}>{opt}</span>
                      {phase === "ceremony" && state === "correct" && (
                        <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute right-3 text-[10px] font-bold text-[#5DD66E]">
                          {chosen === i ? "Toi" : "OK"}
                        </motion.span>
                      )}
                    </motion.button>
                  );
                  })}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 rounded-xl border px-4 py-4 text-center text-xs font-semibold"
                  style={{ background: "rgba(5,12,10,0.88)", borderColor: "rgba(216,238,218,0.16)", color: "rgba(255,255,255,0.72)", backdropFilter: "blur(14px)" }}
                >
                  Lis la question. Les réponses arrivent.
                </motion.div>
              )}

              {/* Feedback banner */}
              <AnimatePresence>
                {phase === "ceremony" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.22 }}
                    className="rounded-xl border px-4 py-3 mb-3"
                    style={flash === "correct" ? { background: "rgba(93,214,110,0.07)", borderColor: "rgba(93,214,110,0.28)" } : { background: "rgba(255,85,85,0.07)", borderColor: "rgba(255,85,85,0.28)" }}
                  >
                    <div className="flex items-center justify-between">
                    {flash === "correct" ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#5DD66E]">Correct</span>
                          {streak >= 3 && <span className="text-xs font-semibold" style={{ color: AMBER }}>{streak >= 5 ? "En feu" : "Série"}</span>}
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-xs" style={{ color: AMBER }}>
                          {formatMoney(lastPts, currency, { showPlus: true })}
                          {mult > 1 && <span className="text-[10px] opacity-60 ml-0.5">×{mult}</span>}
                        </div>
                      </>
                    ) : chosen === -1 ? (
                      <>
                        <span className="text-sm font-bold text-[#FF6B6B]">Temps écoulé</span>
                        <span className="text-xs text-white/40">→ <span className="text-white/60">{q.options[q.answer]}</span></span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-[#FF6B6B]">Incorrect</span>
                        <span className="text-xs text-white/40">→ <span className="text-white/60">{q.options[q.answer]}</span></span>
                      </>
                    )}
                    </div>
                    {/* Next-question countdown */}
                    <div className="flex items-center justify-center gap-2 mt-2.5 pt-2 border-t border-white/[0.06]">
                      <span className="text-[10px] text-white/25">Question suivante dans</span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={nextIn}
                          initial={{ scale: 1.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="font-arcade text-sm leading-none"
                          style={{ color: nextIn === 1 ? AMBER : "var(--qa-text-sub)" }}
                        >
                          {nextIn}s
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 mt-auto pt-2 pb-1">
                {questions.map((_, i) => {
                  const done    = i < qIdx || (i === qIdx && phase === "ceremony");
                  const current = i === qIdx && phase === "playing";
                  return (
                    <motion.div
                      key={i} className="rounded-full h-[5px]"
                      animate={{ width: current ? 22 : 6, background: done ? AMBER : current ? AMBER : "rgba(255,255,255,0.1)", opacity: done || current ? 1 : 0.35 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Question intro overlay — full screen, sits above everything */}
      <AnimatePresence>
        {phase === "intro" && (
          <QuestionIntro
            qIdx={qIdx}
            total={questions.length}
            question={questions[qIdx]}
            cat={cat}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SoloQuestionCard({ question, cat, lang, qIdx, total, flash, onReplayAudio, streak }) {
  // Random praise word — memoized per correct feedback burst
  const [praise] = useState(() => PRAISE_WORDS[Math.floor(Math.random() * PRAISE_WORDS.length)]);

  return (
    <motion.div
      className="rounded-3xl border mb-3 overflow-hidden relative"
      style={{ background: "var(--surface)" }}
      animate={{
        borderColor:
          flash === "correct" ? "rgba(16,185,129,0.5)" :
          flash === "wrong"   ? "rgba(244,63,94,0.5)"  :
          "var(--border-md)",
        boxShadow:
          flash === "correct" ? "0 0 40px rgba(16,185,129,0.14)" :
          flash === "wrong"   ? "0 0 40px rgba(244,63,94,0.14)" : "none",
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Feedback banner top */}
      <AnimatePresence>
        {flash === "correct" && (
          <motion.div
            key={`p-${qIdx}`}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 chip chip-success"
          >
            <Zap className="w-3 h-3" />
            <span className="font-serif-i" style={{ fontStyle: "italic" }}>{praise}</span>
            {streak >= 3 && <span className="ml-1 inline-flex items-center gap-0.5"><Flame className="w-3 h-3" />{streak}</span>}
          </motion.div>
        )}
        {flash === "wrong" && (
          <motion.div
            key={`w-${qIdx}`}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 chip chip-danger"
          >
            La bonne réponse est mise en évidence
          </motion.div>
        )}
      </AnimatePresence>

      {question.displayType === "audio" && (
        <div className="px-5 sm:px-6 pt-5">
          <button
            type="button"
            onClick={onReplayAudio}
            className="btn-secondary w-full h-16 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Volume2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
            Réécouter la question
          </button>
        </div>
      )}

      <div className="px-5 sm:px-7 py-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-medium mb-3" style={{ color: "var(--text-faint)" }}>
          <BookOpen className="w-3.5 h-3.5" />
          <span>Culture générale</span>
          <span style={{ color: "var(--divider)" }}>·</span>
          <span>Q{qIdx + 1} / {total}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold leading-snug tracking-tight" style={{ color: "var(--text)" }}>
          {question.q[lang]}
        </h2>
      </div>
    </motion.div>
  );
}
