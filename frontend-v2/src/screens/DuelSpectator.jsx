import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { Label, Loader } from "../ui";
import * as api from "../lib/api";
import * as duel from "../lib/duelSocket";

const LETTERS = ["A", "B", "C", "D"];

export default function DuelSpectator() {
  const { matchId } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [, forceTick] = useState(0);

  useEffect(() => {
    duel.connect();
    const offState = duel.on("spectator_state", (message) => { if (message.matchId === matchId) setState(message); });
    const offResult = duel.on("spectator_result", (message) => { if (message.matchId === matchId) setResult(message); });
    const offUnavailable = duel.on("spectator_unavailable", (message) => { if (message.matchId === matchId) setUnavailable(true); });
    duel.spectate(matchId);
    return () => { offState(); offResult(); offUnavailable(); duel.leaveSpectate(matchId); };
  }, [matchId]);

  useEffect(() => {
    if (!state?.question || state.status !== "question") return;
    const timer = window.setInterval(() => forceTick((value) => value + 1), 100);
    return () => window.clearInterval(timer);
  }, [state?.question, state?.status]);

  if (unavailable) return <div className="grid min-h-dvh place-items-center bg-ink px-5 text-center"><div><Label tone="flare">direct terminé</Label><h1 className="t-display mt-3 text-3xl">Ce match n’est plus disponible</h1><button onClick={() => nav("/")} className="t-label mt-6 text-flare">← retour à Jouer</button></div></div>;
  if (!state) return <Loader full />;

  const remaining = state.question ? Math.max(0, state.question.deadline - Date.now()) : 0;
  const seconds = Math.ceil(remaining / 1000);
  const reveal = state.reveal;

  return <div className="arena-shell grain">
    <header className="arena-topbar"><button onClick={() => nav("/")} className="t-label text-bone-4 hover:text-flare">← quitter le direct</button><div className="flex items-center gap-3"><Label tone="danger">● en direct</Label><span className="t-label text-[10px] text-bone-4">◉ {state.viewerCount} spectateur{state.viewerCount !== 1 ? "s" : ""}</span></div></header>
    <section className="arena-hud">
      <SpectatorPlayer player={state.players[0]} score={result?.scoreA ?? state.scoreA} />
      <div className="arena-timer"><div><strong>{state.status === "question" ? seconds : state.status === "reveal" ? "✓" : "…"}</strong><span>{state.question ? `${state.question.index + 1}/${state.question.total}` : "LIVE"}</span></div></div>
      <SpectatorPlayer player={state.players[1]} score={result?.scoreB ?? state.scoreB} opponent />
    </section>
    <main className="arena-stage">
      {result ? <section className="arena-question-card text-center"><Label tone="flare">résultat final</Label><h1 className="t-display mt-5 text-4xl">{result.winnerUsername ? `${result.winnerUsername} gagne` : "Égalité"}</h1><p className="t-display mt-4 text-5xl text-flare">{result.scoreA} – {result.scoreB}</p><button onClick={() => nav("/")} className="t-label mt-8 text-flare">Retour à Jouer</button></section> : state.question ? <section className="arena-question-card">
        <div className="arena-card-kicker"><span>MODE SPECTATEUR</span><span>{state.status === "reveal" ? "RÉPONSE RÉVÉLÉE" : "LES CHOIX RESTENT SECRETS"}</span></div>
        <h1 className="arena-question-text">{state.question.text}</h1>
        <div className="arena-answers">{state.question.options.map((option, index) => <div key={index} className={clsx("arena-answer", reveal && index === reveal.correctPosition && "is-correct", reveal && index !== reveal.correctPosition && "is-dimmed")}><span className="arena-answer-letter">{LETTERS[index]}</span><span className="arena-answer-text">{option}</span>{reveal && (index === reveal.chosenA || index === reveal.chosenB) && <span className="ml-auto text-[10px]">{index === reveal.chosenA ? state.players[0].username : ""}{index === reveal.chosenA && index === reveal.chosenB ? " · " : ""}{index === reveal.chosenB ? state.players[1].username : ""}</span>}</div>)}</div>
      </section> : <section className="arena-question-card text-center"><Label tone="flare">préparation de l’arène</Label><h1 className="t-display mt-5 text-3xl">Les joueurs se préparent…</h1></section>}
    </main>
  </div>;
}

function SpectatorPlayer({ player, score, opponent }) {
  return <div className={clsx("arena-player", opponent && "opponent")}><div className="arena-avatar-wrap"><img src={api.avatarUrl(player.username)} alt="" className="arena-avatar" /><span className={clsx("arena-online", player.connected ? "connected" : "disconnected")} /></div><div className="arena-player-copy"><strong>{player.username}</strong><small>{player.connected ? "en jeu" : "reconnexion…"}</small></div><b className="arena-score">{score}</b></div>;
}
