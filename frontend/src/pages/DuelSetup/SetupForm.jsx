import { Minus, Plus, Search, Swords, UserPlus } from "lucide-react";
import { formatMoney } from "../../lib/currency";
import StakeConfirmModal from "../../components/StakeConfirmModal";
import Shell from "./Shell";
import ErrorMessage from "./ErrorMessage";

const STAKES = [100, 250, 500, 1000, 2500, 5000];
const MODES = [
  ["queue", Search, "Aléatoire"],
  ["open", Swords, "Duel ouvert"],
  ["private", UserPlus, "Lien privé"],
];

export default function SetupForm({ navigate, mode, setMode, stake, setStake, directTarget, coins, currency, error, launch, confirmation, setConfirmation, confirmLaunch }) {
  return (
    <Shell back={() => navigate("/")} eyebrow="Nouveau duel" title="Configure ton défi">
      <div className="grid grid-cols-3 gap-2">
        {MODES.map(([id, Icon, label]) => (
          <button key={id} onClick={() => setMode(id)} className={`rounded-2xl p-3 text-center text-xs font-bold ${mode === id ? "btn-primary" : "card"}`}>
            <Icon className="mx-auto mb-2 h-5 w-5" />{id === "private" && directTarget ? directTarget : label}
          </button>
        ))}
      </div>

      <section className="mt-6">
        <label className="mb-2 block text-xs font-bold" style={{ color: "var(--text-sub)" }}>Mise par joueur</label>
        <div className="card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <button onClick={() => setStake((value) => Math.max(100, value - 50))} className="btn-secondary grid h-11 w-11 place-items-center rounded-xl"><Minus className="h-4 w-4" /></button>
            <input
              type="number" min="100" max="50000" value={stake}
              onChange={(event) => setStake(Math.max(0, Number(event.target.value) || 0))}
              className="min-w-0 flex-1 bg-transparent text-center font-display text-3xl font-bold outline-none"
              style={{ color: "var(--accent)" }}
            />
            <button onClick={() => setStake((value) => Math.min(50000, value + 50))} className="btn-secondary grid h-11 w-11 place-items-center rounded-xl"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {STAKES.map((amount) => (
              <button key={amount} onClick={() => setStake(amount)} className={stake === amount ? "btn-primary rounded-lg py-2 text-xs" : "btn-secondary rounded-lg py-2 text-xs"}>
                {amount.toLocaleString("fr-FR")}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t pt-4 text-sm" style={{ borderColor: "var(--divider)" }}>
            <span style={{ color: "var(--text-sub)" }}>Gain brut vainqueur</span>
            <strong style={{ color: "var(--success)" }}>{formatMoney(Math.round(stake * 1.8), currency)}</strong>
          </div>
        </div>
      </section>

      {error && <ErrorMessage text={error} />}
      <button onClick={launch} disabled={stake > coins || stake < 100} className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 disabled:opacity-40">
        <Swords className="h-5 w-5" />{mode === "queue" ? "Trouver un adversaire" : mode === "open" ? "Publier le duel" : directTarget ? `Défier ${directTarget}` : "Créer le lien privé"}
      </button>
      <p className="mt-3 text-center text-xs" style={{ color: "var(--text-faint)" }}>Le serveur vérifie les deux soldes, le score et le paiement.</p>

      <StakeConfirmModal
        open={confirmation?.type === "launch"}
        title={mode === "queue" ? "Lancer la recherche" : mode === "open" ? "Publier ce duel" : "Créer le défi privé"}
        amount={formatMoney(stake, currency)}
        message="Cette mise est indiquée pour chaque joueur. Le serveur confirme les soldes puis ne débite que lorsqu’un match valide est formé."
        confirmLabel={mode === "queue" ? "Rechercher" : mode === "open" ? "Publier" : "Créer le défi"}
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmLaunch}
      />
    </Shell>
  );
}
