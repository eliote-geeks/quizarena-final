import { Eye, Radio, X } from "lucide-react";
import { formatMoney } from "../../lib/currency";

const LABELS = ["A", "B", "C", "D"];

export default function SpectatorView({ state, banner, onQuit, currency }) {
  if (!state) return <div className="flex min-h-screen items-center justify-center">Connexion au direct…</div>;
  const question = state.question;
  return (
    <div className="min-h-screen px-4 py-5">
      <header className="mx-auto flex max-w-4xl items-center justify-between">
        <button onClick={onQuit} className="btn-ghost inline-flex items-center gap-2"><X className="h-4 w-4" />Quitter</button>
        <span className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--danger)" }}><Radio className="h-4 w-4" />EN DIRECT</span>
        <span className="inline-flex items-center gap-1 text-xs"><Eye className="h-4 w-4" />{state.viewerCount || 0}</span>
      </header>
      {banner && <p className="mt-6 text-center">{banner}</p>}
      <div className="mx-auto mt-16 max-w-4xl text-center">
        <p className="text-sm" style={{ color: "var(--text-sub)" }}>Mise {formatMoney(state.stakeCoins || 0, currency)}</p>
        <h1 className="mt-4 font-display text-4xl font-bold">{state.players?.[0]?.username} {state.scoreA} — {state.scoreB} {state.players?.[1]?.username}</h1>
        {state.status === "done" ? (
          <p className="mt-10 text-2xl font-bold">Match terminé · vainqueur {state.winnerUsername || "non départagé"}</p>
        ) : question ? (
          <div className="card mt-10 rounded-3xl p-6 text-left">
            <p className="text-xs uppercase">Question {question.index + 1}/{question.total}</p>
            <h2 className="my-5 text-2xl font-bold">{question.text}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {question.options.map((option, index) => (
                <div key={index} className="rounded-xl border p-4" style={{ borderColor: state.reveal?.correctPosition === index ? "var(--success)" : "var(--border)" }}>
                  {LABELS[index]}. {option}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-10">Les joueurs se préparent…</p>
        )}
      </div>
    </div>
  );
}
