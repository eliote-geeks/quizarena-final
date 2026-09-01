import { Swords } from "lucide-react";
import { formatMoney } from "../../lib/currency";
import StakeConfirmModal from "../../components/StakeConfirmModal";
import Shell from "./Shell";
import ErrorMessage from "./ErrorMessage";

export default function InvitedScreen({ navigate, inviteHost, stake, currency, error, confirmation, acceptInvite, confirmAcceptInvite, setConfirmation }) {
  return (
    <Shell back={() => navigate("/")} eyebrow="Invitation privée" title="Un joueur t’attend dans l’arène">
      <div className="card rounded-3xl p-6 text-center">
        <Swords className="mx-auto h-12 w-12" style={{ color: "var(--accent)" }} />
        {inviteHost ? (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
            <span className="text-sm" style={{ color: "var(--text-sub)" }}>{inviteHost.hostUsername} te défie pour</span>
            <strong className="text-sm" style={{ color: "var(--accent)" }}>{formatMoney(inviteHost.stakeCoins, currency)}</strong>
          </div>
        ) : (
          <p className="mt-5 text-xs" style={{ color: "var(--text-faint)" }}>Vérification du lien…</p>
        )}
        <p className="mt-4 text-sm" style={{ color: "var(--text-sub)" }}>La mise exacte et le solde des deux joueurs seront vérifiés par le serveur avant le débit.</p>
        {error && <ErrorMessage text={error} />}
        <button onClick={acceptInvite} disabled={!inviteHost} className="btn-primary mt-6 w-full rounded-2xl py-4 disabled:opacity-40">Vérifier et accepter</button>
        <button onClick={() => navigate("/")} className="btn-ghost mt-3 w-full py-3">Refuser</button>
      </div>
      <StakeConfirmModal
        open={confirmation?.type === "accept"}
        title="Accepter le défi"
        amount={formatMoney(stake, currency)}
        message="Le serveur vérifiera les deux soldes. Le débit n’est finalisé que lorsqu’un duel valide démarre."
        confirmLabel="Accepter le défi"
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmAcceptInvite}
      />
    </Shell>
  );
}
