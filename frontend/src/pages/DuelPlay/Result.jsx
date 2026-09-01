import { formatMoney } from "../../lib/currency";

export default function Result({ result, match, currency, onLobby, onReplay }) {
  const net = result.payoutCoins - (match?.stakeCoins || 0);
  return (
    <div className="flex min-h-screen items-center justify-center px-5 text-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Résultat officiel</p>
        <h1 className="mt-4 font-display text-6xl font-extrabold sm:text-8xl">
          {result.result === "win" ? "VICTOIRE" : result.result === "draw" ? "ÉGALITÉ" : "DÉFAITE"}
        </h1>
        <p className="mt-8 font-display text-5xl">{result.scoreYou} — {result.scoreOpponent}</p>
        {result.decidedBySpeed && <p className="mt-3 text-xs font-semibold" style={{ color: "var(--text-faint)" }}>Score à égalité · départagé par rapidité de réponse</p>}
        <div className="mx-auto mt-7 w-fit rounded-2xl p-4" style={{ background: "var(--surface-2)" }}>
          <p className="text-xs uppercase" style={{ color: "var(--text-faint)" }}>{net >= 0 ? "Gain net" : "Perte"}</p>
          <strong className="text-2xl" style={{ color: net >= 0 ? "var(--success)" : "var(--danger)" }}>{formatMoney(Math.abs(net), currency)}</strong>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button onClick={onReplay} className="btn-primary rounded-2xl px-8 py-3">Nouveau défi</button>
          <button onClick={onLobby} className="btn-secondary rounded-2xl px-8 py-3">Retour à l’accueil</button>
        </div>
      </div>
    </div>
  );
}
