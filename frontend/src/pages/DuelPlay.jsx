import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as duel from "../lib/duelSocket";
import AmbientBackground from "../components/AmbientBackground";
import { Check, Eye, Radio, Swords, Wifi, WifiOff, X } from "lucide-react";

const LABELS = ["A", "B", "C", "D"];

export default function DuelPlay() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const spectateId = params.get("spectate");
  const { currency, refreshWallet, updateElo } = useApp();
  const [phase, setPhase] = useState(spectateId ? "spectating" : "loading");
  const [match, setMatch] = useState(() => duel.getSnapshot().match || null);
  const [question, setQuestion] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [picked, setPicked] = useState(null);
  const [scores, setScores] = useState([0, 0]);
  const [countdown, setCountdown] = useState(5);
  const [left, setLeft] = useState(8000);
  const [opponentReady, setOpponentReady] = useState(false);
  const [readyClicked, setReadyClicked] = useState(false);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [connection, setConnection] = useState("online");
  const [banner, setBanner] = useState("");
  const [result, setResult] = useState(null);
  const [spectatorState, setSpectatorState] = useState(null);
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
      if (snapshot.phase === "idle") navigate("/duel", { replace: true });
    }

    const offs = [
      duel.on("matched", (message) => setMatch(message)),
      duel.on("waiting_ready", () => { setPhase("ready"); setReadyClicked(false); setOpponentReady(false); }),
      duel.on("opponent_ready", () => setOpponentReady(true)),
      duel.on("countdown", (message) => { setPhase("countdown"); setCountdown(message.seconds || 5); }),
      duel.on("question", (message) => { setPhase("question"); setQuestion(message); setReveal(null); setPicked(null); setOpponentAnswered(false); setBanner(""); setLeft(Math.max(0, message.deadline - Date.now())); }),
      duel.on("opponent_answered", () => setOpponentAnswered(true)),
      duel.on("reveal", (message) => { setReveal(message); setScores([message.scoreYou, message.scoreOpponent]); }),
      duel.on("opponent_disconnected", () => setBanner("Adversaire déconnecté — délai de reconnexion en cours")),
      duel.on("opponent_reconnected", () => setBanner("Adversaire reconnecté")),
      duel.on("_close", () => setConnection("offline")),
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
    if (phase !== "countdown" || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, phase]);

  useEffect(() => {
    if (phase !== "question" || !question || reveal) return;
    let frame;
    const tick = () => {
      const remaining = Math.max(0, question.deadline - Date.now());
      setLeft(remaining);
      if (remaining > 0 && questionRef.current === question) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, question, reveal]);

  useEffect(() => {
    if (phase !== "question") return;
    const visibility = () => duel.send({ type: document.hidden ? "tab_hidden" : "tab_visible" });
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [phase]);

  const choose = (index) => {
    if (!question || reveal || left <= 0) return;
    setPicked(index); // le joueur peut changer : chaque clic remplace le précédent côté serveur
    duel.answer(question.questionId, index);
  };

  const quit = () => {
    if (spectateId) { duel.leaveSpectate(spectateId); navigate("/"); return; }
    if (["question", "countdown", "ready"].includes(phase) && !window.confirm("Quitter maintenant compte comme une défaite. Continuer ?")) return;
    if (["question", "countdown", "ready"].includes(phase)) duel.forfeit();
    navigate("/");
  };

  if (spectateId) return <SpectatorView state={spectatorState} banner={banner} onQuit={quit} currency={currency} />;
  if (phase === "result" && result) return <Result result={result} match={match} currency={currency} onLobby={() => navigate("/")} onReplay={() => navigate("/duel")} />;

  return (
    <div className="relative min-h-screen overflow-hidden"><AmbientBackground intensity={left < 2500 ? "urgent" : "calm"} /><div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-7">
      <header className="flex items-center justify-between"><button onClick={quit} className="btn-ghost inline-flex items-center gap-2 text-xs"><X className="h-4 w-4" />Quitter</button><span className="inline-flex items-center gap-2 text-xs" style={{ color: connection === "online" ? "var(--success)" : "var(--danger)" }}>{connection === "online" ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}{connection === "online" ? "Connecté" : "Reconnexion…"}</span></header>
      {banner && <p className="mx-auto mt-4 rounded-full px-4 py-2 text-xs" style={{ background: "rgba(229,168,0,.12)", color: "var(--accent)" }}>{banner}</p>}

      {phase === "loading" && <Center title="Connexion à l’arène…" subtitle="Le serveur restaure ton match." />}
      {phase === "ready" && <Center title={`${match?.opponent?.username || "Adversaire"} est trouvé`} subtitle={`Mise ${formatMoney(match?.stakeCoins || 0, currency)}`}><button disabled={readyClicked} onClick={() => { setReadyClicked(true); duel.ready(); }} className="btn-primary mt-7 rounded-2xl px-10 py-4 disabled:opacity-60">{readyClicked ? opponentReady ? "Départ imminent" : "En attente de l’adversaire" : "Je suis prêt"}</button></Center>}
      {phase === "countdown" && <Center title="Le duel commence" subtitle={match?.opponent?.username || "Adversaire"}><motion.strong key={countdown} initial={{ scale: .4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-7 font-display text-9xl" style={{ color: "var(--accent)" }}>{countdown || "GO"}</motion.strong></Center>}
      {phase === "question" && question && <ArenaQuestion question={question} reveal={reveal} picked={picked} choose={choose} scores={scores} opponent={match?.opponent?.username} opponentAnswered={opponentAnswered} left={left} stake={match?.stakeCoins || 0} currency={currency} />}
    </div></div>
  );
}

function ArenaQuestion({ question, reveal, picked, choose, scores, opponent, opponentAnswered, left, stake, currency }) {
  const seconds = Math.max(0, Math.ceil(left / 1000));
  const pct = Math.max(0, Math.min(100, left / 80));
  return <div className="flex flex-1 flex-col justify-center py-6"><div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><Player name="Vous" score={scores[0]} status={picked !== null ? "Réponse sélectionnée" : "À toi de jouer"} /><div className="text-center"><div className="grid h-20 w-20 place-items-center rounded-full border-4 font-display text-3xl" style={{ borderColor: seconds <= 3 ? "var(--danger)" : "var(--accent)" }}>{reveal ? "✓" : seconds}</div><p className="mt-2 text-[10px] uppercase" style={{ color: "var(--text-faint)" }}>{formatMoney(stake, currency)}</p></div><Player name={opponent || "Adversaire"} score={scores[1]} status={opponentAnswered ? "Réponse verrouillée" : "Connecté"} right /></div><div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border p-5 sm:p-8" style={{ background: "rgba(18,15,28,.93)", borderColor: "rgba(229,168,0,.32)" }}><div className="mb-6 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.08)" }}><motion.div className="h-full" animate={{ width: `${pct}%` }} style={{ background: seconds <= 3 ? "var(--danger)" : "var(--accent)" }} /></div><p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Question {question.index + 1}/{question.total}</p><h1 className="my-6 text-2xl font-bold leading-snug sm:text-4xl">{question.text}</h1><div className="grid gap-3 sm:grid-cols-2">{question.options.map((option, index) => { const correct = reveal && index === reveal.correctPosition; const wrong = reveal && index === picked && !correct; return <motion.button key={index} onClick={() => choose(index)} disabled={!!reveal} whileTap={!reveal ? { scale: .98 } : {}} className="flex min-h-16 items-center gap-3 rounded-2xl border p-4 text-left transition" style={{ background: correct ? "rgba(16,185,129,.2)" : wrong ? "rgba(244,63,94,.18)" : picked === index ? "rgba(229,168,0,.18)" : "rgba(255,255,255,.045)", borderColor: correct ? "var(--success)" : wrong ? "var(--danger)" : picked === index ? "var(--accent)" : "rgba(255,255,255,.1)" }}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-bold" style={{ background: "rgba(0,0,0,.22)", color: correct ? "var(--success)" : "var(--accent)" }}>{correct ? <Check className="h-4 w-4" /> : LABELS[index]}</span><span className="font-semibold">{option}</span></motion.button>; })}</div>{picked !== null && !reveal && <p className="mt-4 text-center text-xs" style={{ color: "var(--accent)" }}>Choix actuel : {LABELS[picked]} · tu peux encore le modifier avant la fin</p>}{reveal && <p className="mt-5 text-center font-bold" style={{ color: reveal.yourCorrect ? "var(--success)" : "var(--danger)" }}>{reveal.yourCorrect ? "Bonne réponse" : "Mauvaise réponse"}{reveal.nextInMs > 0 ? " · prochaine manche dans quelques secondes" : ""}</p>}</div></div>;
}

function Player({ name, score, status, right }) { return <div className={right ? "text-right" : "text-left"}><strong className="block truncate text-sm sm:text-base">{name}</strong><span className="font-display text-4xl font-bold">{score}</span><p className="hidden text-[10px] sm:block" style={{ color: "var(--text-faint)" }}>{status}</p></div>; }
function Center({ title, subtitle, children }) { return <div className="flex flex-1 flex-col items-center justify-center text-center"><Swords className="h-10 w-10" style={{ color: "var(--accent)" }} /><h1 className="mt-5 font-display text-3xl font-extrabold sm:text-5xl">{title}</h1><p className="mt-3 text-sm" style={{ color: "var(--text-sub)" }}>{subtitle}</p>{children}</div>; }

function Result({ result, match, currency, onLobby, onReplay }) { const net = result.payoutCoins - (match?.stakeCoins || 0); return <div className="flex min-h-screen items-center justify-center px-5 text-center"><div><p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Résultat officiel</p><h1 className="mt-4 font-display text-6xl font-extrabold sm:text-8xl">{result.result === "win" ? "VICTOIRE" : result.result === "draw" ? "ÉGALITÉ" : "DÉFAITE"}</h1><p className="mt-8 font-display text-5xl">{result.scoreYou} — {result.scoreOpponent}</p><div className="mx-auto mt-7 w-fit rounded-2xl p-4" style={{ background: "var(--surface-2)" }}><p className="text-xs uppercase" style={{ color: "var(--text-faint)" }}>{net >= 0 ? "Gain net" : "Perte"}</p><strong className="text-2xl" style={{ color: net >= 0 ? "var(--success)" : "var(--danger)" }}>{formatMoney(Math.abs(net), currency)}</strong></div><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={onReplay} className="btn-primary rounded-2xl px-8 py-3">Nouveau défi</button><button onClick={onLobby} className="btn-secondary rounded-2xl px-8 py-3">Retour à l’accueil</button></div></div></div>; }

function SpectatorView({ state, banner, onQuit, currency }) {
  if (!state) return <div className="flex min-h-screen items-center justify-center">Connexion au direct…</div>;
  const question = state.question;
  return <div className="min-h-screen px-4 py-5"><header className="mx-auto flex max-w-4xl items-center justify-between"><button onClick={onQuit} className="btn-ghost inline-flex items-center gap-2"><X className="h-4 w-4" />Quitter</button><span className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--danger)" }}><Radio className="h-4 w-4" />EN DIRECT</span><span className="inline-flex items-center gap-1 text-xs"><Eye className="h-4 w-4" />{state.viewerCount || 0}</span></header>{banner && <p className="mt-6 text-center">{banner}</p>}<div className="mx-auto mt-16 max-w-4xl text-center"><p className="text-sm" style={{ color: "var(--text-sub)" }}>Mise {formatMoney(state.stakeCoins || 0, currency)}</p><h1 className="mt-4 font-display text-4xl font-bold">{state.players?.[0]?.username} {state.scoreA} — {state.scoreB} {state.players?.[1]?.username}</h1>{state.status === "done" ? <p className="mt-10 text-2xl font-bold">Match terminé · vainqueur {state.winnerUsername || "non départagé"}</p> : question ? <div className="card mt-10 rounded-3xl p-6 text-left"><p className="text-xs uppercase">Question {question.index + 1}/{question.total}</p><h2 className="my-5 text-2xl font-bold">{question.text}</h2><div className="grid gap-2 sm:grid-cols-2">{question.options.map((option, index) => <div key={index} className="rounded-xl border p-4" style={{ borderColor: state.reveal?.correctPosition === index ? "var(--success)" : "var(--border)" }}>{LABELS[index]}. {option}</div>)}</div></div> : <p className="mt-10">Les joueurs se préparent…</p>}</div></div>;
}
