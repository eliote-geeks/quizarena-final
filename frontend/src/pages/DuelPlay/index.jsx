import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import { formatMoney } from "../../lib/currency";
import * as duel from "../../lib/duelSocket";
import * as music from "../../lib/musicEngine";
import AmbientBackground from "../../components/AmbientBackground";
import StakeConfirmModal from "../../components/StakeConfirmModal";
import QuestionIntro from "../../components/QuestionIntro";
import { getCategory } from "../../data/mockData";
import { Wifi, WifiOff, X } from "lucide-react";
import ArenaQuestion from "./ArenaQuestion";
import Center from "./Center";
import DuelPauseOverlay from "./DuelPauseOverlay";
import Result from "./Result";
import SpectatorView from "./SpectatorView";
import ImageLightbox from "./ImageLightbox";
import { AMBIENT_FAINT } from "./ambientColors";

export default function DuelPlay() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const spectateId = params.get("spectate");
  const { currency, refreshWallet, updateElo, user, lang } = useApp();
  const [phase, setPhase] = useState(spectateId ? "spectating" : "loading");
  const [match, setMatch] = useState(() => duel.getSnapshot().match || null);
  const [question, setQuestion] = useState(null);
  const [preload, setPreload] = useState(null); // { questionId, mediaUrl, categoryId, index, total } — §question_loading
  const [reveal, setReveal] = useState(null);
  const [picked, setPicked] = useState(null);
  const [scores, setScores] = useState([0, 0]);
  const [countdown, setCountdown] = useState(5);
  const [left, setLeft] = useState(13000); // aligné sur DUEL_TIME_PER_QUESTION_MS (§backend duel/engine.ts) — 13s en duel, 8s en solo
  const [opponentReady, setOpponentReady] = useState(false);
  const [readyClicked, setReadyClicked] = useState(false);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [connection, setConnection] = useState("online");
  const [banner, setBanner] = useState("");
  const [result, setResult] = useState(null);
  const [spectatorState, setSpectatorState] = useState(null);
  // Même règle qu'en solo : la musique s'efface pendant la question pour
  // laisser passer les sons qui informent (bonne/mauvaise réponse, chrono).
  useEffect(() => { music.duck(phase === "question"); }, [phase]);
  useEffect(() => { music.startMusic(); return () => music.duck(false); }, []);
  const [roundFlash, setRoundFlash] = useState(0);
  const [pauseState, setPauseState] = useState(null);
  const [presenceSent, setPresenceSent] = useState(false);
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const questionRef = useRef(null);
  questionRef.current = question;

  useEffect(() => {
    duel.connect();
    if (spectateId) duel.spectate(spectateId);
    else {
      const snapshot = duel.getSnapshot();
      if (snapshot.match) setMatch(snapshot.match);
      if (snapshot.phase === "waiting_ready") setPhase("ready");
      if (snapshot.phase === "countdown") { setPhase("countdown"); setCountdown(snapshot.last?.seconds || 5); }
      if (snapshot.phase === "question") { setPhase("question"); setQuestion(snapshot.last); setLeft(Math.max(0, snapshot.last.deadline - Date.now())); }
      if (snapshot.phase === "reveal") { setPhase("question"); setReveal(snapshot.last); setScores([snapshot.last.scoreYou, snapshot.last.scoreOpponent]); }
      if (snapshot.phase === "duel_paused") setPauseState(snapshot.last);
      if (snapshot.phase === "idle") navigate("/duel", { replace: true });
    }

    const restoreServerState = (message) => {
      setMatch(message);
      setScores([message.scoreYou || 0, message.scoreOpponent || 0]);
      if (message.phase !== "paused") {
        setPauseState(null);
        setPresenceSent(false);
      }
      const serverPhase = message.phase === "paused" ? message.pausedFrom : message.phase;
      if (serverPhase === "waiting_ready") {
        setPhase("ready");
        setReadyClicked(Boolean(message.alreadyReady));
        setOpponentReady(Boolean(message.opponentAlreadyReady));
      } else if (serverPhase === "countdown") {
        setPhase("countdown");
        setCountdown(message.countdownRemainingSeconds || 1);
      } else if (serverPhase === "question" || serverPhase === "reveal") {
        setPhase("question");
        if (message.questionId) {
          setQuestion(message);
          setPicked(Number.isInteger(message.chosenIndex) && message.chosenIndex >= 0 ? message.chosenIndex : null);
          setLeft(message.deadline ? Math.max(0, message.deadline - Date.now()) : 0);
        }
      }
    };

    const resumePhase = (message) => {
      setPauseState(null);
      setPresenceSent(false);
      setBanner("Duel repris — les deux joueurs sont présents");
      if (message.phase === "question" && message.questionId) {
        setPhase("question");
        setQuestion(message);
        setPicked(Number.isInteger(message.chosenIndex) && message.chosenIndex >= 0 ? message.chosenIndex : null);
        setLeft(Math.max(0, message.deadline - Date.now()));
      }
    };

    const offs = [
      duel.on("matched", (message) => setMatch(message)),
      duel.on("resumed", restoreServerState),
      duel.on("waiting_ready", () => { setPhase("ready"); setReadyClicked(false); setOpponentReady(false); }),
      duel.on("opponent_ready", () => setOpponentReady(true)),
      duel.on("countdown", (message) => { setPhase("countdown"); setCountdown(message.seconds || 5); }),
      // Le serveur envoie la question SANS chrono le temps que les deux
      // joueurs confirment avoir fini de charger (§backend prepareQuestion)
      // — sinon celui dont l'image met plus longtemps à charger perdrait
      // réellement du temps de réponse pendant que son écran est encore vide.
      // On précharge ici le média (rien à faire s'il n'y en a pas), puis on
      // confirme au serveur dès que c'est prêt.
      duel.on("question_preload", (message) => {
        // Bug du 31/08 (retour Paul) : en ne acceptant que "countdown", ce
        // preload ne déclenchait l'écran de catégorie QUE pour la toute
        // première question — dès la 2e, le preload arrive pendant que la
        // phase est encore "question" (reveal affiché), et la condition
        // ratait la transition. "question" doit aussi déclencher l'écran
        // de préparation, pas seulement "countdown".
        setPhase((p) => (p === "countdown" || p === "question" ? "question_loading" : p));
        setPreload(message); // catégorie + numéro affichés pendant l'attente, même modèle qu'en solo (§QuestionIntro)
        if (!message.mediaUrl) { duel.questionReady(message.questionId); return; }
        const img = new Image();
        const confirmReady = () => duel.questionReady(message.questionId);
        img.onload = confirmReady;
        img.onerror = confirmReady;
        img.src = message.mediaUrl;
      }),
      duel.on("question", (message) => { setPhase("question"); setQuestion(message); setReveal(null); setPicked(null); setOpponentAnswered(false); setBanner(""); setRoundFlash((value) => value + 1); setLeft(Math.max(0, message.deadline - Date.now())); }),
      duel.on("opponent_answered", () => setOpponentAnswered(true)),
      duel.on("reveal", (message) => { setReveal(message); setScores([message.scoreYou, message.scoreOpponent]); }),
      duel.on("opponent_disconnected", () => setBanner("Adversaire déconnecté — le duel est gelé")),
      duel.on("opponent_reconnected", () => setBanner("Adversaire reconnecté — confirmation de présence attendue")),
      duel.on("duel_paused", (message) => { setPauseState(message); setPresenceSent(false); setBanner(""); }),
      duel.on("presence_confirmed", (message) => setBanner(`${message.username} a confirmé sa présence${message.allReady ? " · reprise…" : ""}`)),
      duel.on("duel_resumed", resumePhase),
      duel.on("_close", () => { setConnection("offline"); setPauseState((current) => current || { reason: "connection_lost", localOnly: true, requiresYourConfirmation: false }); }),
      duel.on("_open", () => setConnection("online")),
      duel.on("duel_cancelled", (message) => navigate("/duel", { replace: true, state: { cancelledReason: message.reason } })),
      duel.on("duel_result", (message) => { setResult(message); setPhase("result"); updateElo(message.eloRating); refreshWallet().catch(() => {}); }),
      duel.on("spectator_state", (message) => { setSpectatorState(message); setPhase("spectating"); }),
      duel.on("spectator_result", (message) => setSpectatorState((current) => current ? { ...current, ...message, status: "done" } : message)),
      duel.on("spectator_unavailable", () => { setBanner("Ce match n’est plus disponible."); setTimeout(() => navigate("/"), 1600); }),
    ];
    return () => { offs.forEach((off) => off()); if (spectateId) duel.leaveSpectate(spectateId); };
  }, [navigate, refreshWallet, spectateId, updateElo]);

  useEffect(() => {
    if (phase !== "countdown" || countdown <= 0 || pauseState) return;
    const timer = setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, phase, pauseState]);

  useEffect(() => {
    if (phase !== "question" || !question || reveal || pauseState) return;
    let frame;
    const tick = () => {
      const remaining = Math.max(0, question.deadline - Date.now());
      setLeft(remaining);
      if (remaining > 0 && questionRef.current === question) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, question, reveal, pauseState]);

  useEffect(() => {
    if (!["ready", "countdown", "question_loading", "question"].includes(phase) || result || spectateId) return;
    const visibility = () => {
      duel.send({ type: document.hidden ? "tab_hidden" : "tab_visible" });
      if (document.hidden) setBanner("Vérification de présence en cours…");
    };
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "Un duel est en cours. Quitter maintenant peut compter comme un forfait.";
      return event.returnValue;
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("beforeunload", beforeUnload);
    return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("beforeunload", beforeUnload); };
  }, [phase, result, spectateId]);

  const choose = (index) => {
    if (!question || reveal || left <= 0 || pauseState) return;
    setPicked(index); // le joueur peut changer : chaque clic remplace le précédent côté serveur
    duel.answer(question.questionId, index);
  };

  const quit = () => {
    if (spectateId) { duel.leaveSpectate(spectateId); navigate("/"); return; }
    if (["question", "question_loading", "countdown", "ready"].includes(phase)) { setQuitConfirmOpen(true); return; }
    navigate("/");
  };
  const confirmQuit = () => {
    if (["question", "question_loading", "countdown", "ready"].includes(phase)) duel.forfeit();
    setQuitConfirmOpen(false);
    navigate("/");
  };

  if (spectateId) return <SpectatorView state={spectatorState} banner={banner} onQuit={quit} currency={currency} />;
  if (phase === "result" && result) return <Result result={result} match={match} currency={currency} onLobby={() => navigate("/")} onReplay={() => navigate("/duel")} />;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AmbientBackground intensity={left < 2500 ? "urgent" : "calm"} />
      <AnimatePresence>
        {phase === "question" && (
          <motion.div key={roundFlash} className="pointer-events-none absolute inset-0 z-20" initial={{ opacity: .28 }} animate={{ opacity: 0 }} transition={{ duration: .42 }} style={{ background: "var(--accent)" }} />
        )}
      </AnimatePresence>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-7">
        <header className="flex items-center justify-between">
          <button onClick={quit} className="btn-ghost inline-flex items-center gap-2 text-xs"><X className="h-4 w-4" />Quitter</button>
          <span className="inline-flex items-center gap-2 text-xs" style={{ color: connection === "online" ? "var(--success)" : "var(--danger)" }}>
            {connection === "online" ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {connection === "online" ? "Connecté" : "Reconnexion…"}
          </span>
        </header>
        {banner && <p className="mx-auto mt-4 rounded-full px-4 py-2 text-xs" style={{ background: "rgba(229,168,0,.12)", color: "var(--accent)" }}>{banner}</p>}

        {phase === "loading" && (
          <Center title="Connexion à l’arène…" subtitle="Le serveur restaure ton match.">
            <p className="mt-4 max-w-xs text-xs leading-relaxed" style={{ color: AMBIENT_FAINT }}>Ne recharge pas la page, patiente quelques secondes.</p>
          </Center>
        )}
        {phase === "ready" && (
          <Center title={`${match?.opponent?.username || "Adversaire"} est trouvé`} subtitle={`Mise ${formatMoney(match?.stakeCoins || 0, currency)}`}>
            <button disabled={readyClicked} onClick={() => { setReadyClicked(true); duel.ready(); }} className="btn-primary mt-7 rounded-2xl px-10 py-4 disabled:opacity-60">
              {readyClicked ? opponentReady ? "Départ imminent" : "En attente de l’adversaire" : "Je suis prêt"}
            </button>
            {readyClicked && <p className="mt-4 max-w-xs text-xs leading-relaxed" style={{ color: AMBIENT_FAINT }}>Ne recharge pas la page : la première question arrive automatiquement dès que les deux joueurs sont prêts.</p>}
          </Center>
        )}
        {phase === "countdown" && (
          <Center title="Le duel commence" subtitle={match?.opponent?.username || "Adversaire"}>
            <motion.strong key={countdown} initial={{ scale: .4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-7 font-display text-9xl" style={{ color: "var(--accent)" }}>{countdown || "GO"}</motion.strong>
            <p className="mt-4 text-xs uppercase tracking-[.16em]" style={{ color: AMBIENT_FAINT }}>Prochaine manche en approche</p>
          </Center>
        )}
        {/* Le compte à rebours visuel est arrivé à zéro mais le serveur attend
            encore que les deux joueurs confirment avoir chargé la question —
            même écran d'annonce de catégorie qu'en solo (§QuestionIntro),
            affiché tant que nécessaire au lieu d'un temps fixe : ça reste
            exact même si l'image met plus longtemps que d'habitude. */}
        <AnimatePresence>
          {phase === "question_loading" && preload && (
            <QuestionIntro
              qIdx={preload.index ?? 0}
              total={preload.total || match?.questions?.length || 10}
              question={undefined}
              cat={getCategory(preload.categoryId)}
              lang={lang}
              waitHint
            />
          )}
        </AnimatePresence>
        {phase === "question" && question && (
          <ArenaQuestion
            question={question} reveal={reveal} picked={picked} choose={choose} scores={scores}
            me={user?.username} opponent={match?.opponent?.username} opponentAnswered={opponentAnswered}
            left={left} stake={match?.stakeCoins || 0} currency={currency} onZoomImage={setZoomedImage}
          />
        )}
        <DuelPauseOverlay pause={pauseState} online={connection === "online"} presenceSent={presenceSent} onConfirm={() => { setPresenceSent(true); duel.confirmPresence(); }} />
        <StakeConfirmModal
          open={quitConfirmOpen} title="Abandonner le duel ?" amount={formatMoney(match?.stakeCoins || 0, currency)}
          message="Le duel continue côté serveur. En quittant maintenant, tu seras déclaré forfait et ta mise restera engagée."
          confirmLabel="Abandonner le duel" onCancel={() => setQuitConfirmOpen(false)} onConfirm={confirmQuit}
        />
        <ImageLightbox image={zoomedImage} onClose={() => setZoomedImage(null)} />
      </div>
    </div>
  );
}
