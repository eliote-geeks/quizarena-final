import { useEffect, useState } from "react";
import clsx from "clsx";
import { Block, ConfirmModal, Field, Input, Label, Money, Row } from "../ui";
import { NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

const QUICK = [500, 1000, 2500, 5000];

const METHODS = [
  {
    code: "ORANGE_MONEY_CM",
    label: "Orange Money",
    short: "OM",
    color: "#FF7900",
    bg: "rgba(255,121,0,0.12)",
    border: "rgba(255,121,0,0.35)",
    prefix: "237",
    hint: "Numéro Orange (ex: 237690000000)",
  },
  {
    code: "MTN_MOMO_CM",
    label: "MTN Mobile Money",
    short: "MoMo",
    color: "#FFCC00",
    bg: "rgba(255,204,0,0.10)",
    border: "rgba(255,204,0,0.35)",
    prefix: "237",
    hint: "Numéro MTN (ex: 237670000000)",
  },
];

const TX_LABEL = {
  DEPOSIT: "dépôt",
  WITHDRAWAL: "retrait",
  STAKE: "mise",
  PAYOUT: "gain",
  REFUND: "remboursement",
  BONUS: "bonus",
};

const TX_DESC = {
  DEPOSIT: "Dépôt Mobile Money",
  WITHDRAWAL: "Retrait Mobile Money",
  STAKE: "Mise en partie",
  PAYOUT: "Gain de partie",
  REFUND: "Remboursement",
  BONUS: "Bonus",
};

function statusBadge(status) {
  if (status === "PENDING" || status === "QUARANTINED") return "en attente";
  if (status === "FAILED") return "échoué";
  return null;
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/** Notification retrait/dépôt affichée au-dessus de l'historique */
function TxNotif({ notif, onClose }) {
  useEffect(() => {
    if (!notif) return;
    const t = setTimeout(onClose, 10_000);
    return () => clearTimeout(t);
  }, [notif, onClose]);

  if (!notif) return null;

  const styles = {
    success:   { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.4)",  icon: "✓", color: "#4ade80" },
    pending:   { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.35)", icon: "⏳", color: "#fbbf24" },
    refunded:  { bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.4)",  icon: "↩", color: "#fb923c" },
    error:     { bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.35)", icon: "✕", color: "#f87171" },
  };
  const s = styles[notif.kind] ?? styles.error;

  return (
    <div
      className="anim-rise mt-6 flex items-start gap-4 rounded-(--radius-card) px-5 py-4"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="shrink-0 text-xl" style={{ color: s.color }}>{s.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="t-title text-[15px] font-bold" style={{ color: s.color }}>{notif.title}</p>
        {notif.body && <p className="t-body mt-1 text-sm text-bone-3">{notif.body}</p>}
      </div>
      <button onClick={onClose} className="t-label shrink-0 text-bone-4 hover:text-bone-2 text-lg leading-none">×</button>
    </div>
  );
}

export default function Wallet() {
  const { balanceCoins, refreshWallet } = useAuth();
  const [mode, setMode] = useState(null); // null | "deposit" | "withdraw"
  const [notif, setNotif] = useState(null); // { kind, title, body }
  // Transactions paginées (indépendant de AuthContext qui n'a que les 30 dernières)
  const [txData, setTxData] = useState(null); // { transactions, total, page, pages }
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);

  const loadTx = async (p = 1) => {
    setTxLoading(true);
    try {
      const d = await api.getWalletTransactions(p, 15);
      setTxData(d);
      setTxPage(p);
    } catch {
      // silencieux
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => { loadTx(1); }, []);

  const afterTx = async (result) => {
    setMode(null);
    if (result) setNotif(result);
    await refreshWallet();
    await loadTx(1);
  };

  const txs = txData?.transactions ?? [];
  const totalPages = txData?.pages ?? 1;
  const total = txData?.total ?? 0;

  return (
    <div className="mx-auto w-full max-w-[900px] px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
      {/* ── Solde ── */}
      <Label>solde disponible</Label>
      <Money value={balanceCoins} size="xl" className="mt-2" />

      {/* ── Actions ── */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Block
          size="lg"
          className="sm:flex-1"
          tone={mode === "deposit" ? "flare" : "ghost"}
          icon={<NavIcon type="arrowDown" className="h-5 w-5" />}
          onClick={() => setMode(mode === "deposit" ? null : "deposit")}
        >
          Déposer
        </Block>
        <Block
          size="lg"
          className="sm:flex-1"
          tone={mode === "withdraw" ? "flare" : "ghost"}
          icon={<NavIcon type="arrowUp" className="h-5 w-5" />}
          onClick={() => setMode(mode === "withdraw" ? null : "withdraw")}
        >
          Retirer
        </Block>
      </div>

      {mode && <TxPanel mode={mode} onDone={afterTx} />}

      <TxNotif notif={notif} onClose={() => setNotif(null)} />

      {/* ── Historique paginé ── */}
      <section className="mt-12">
        <div className="rule-bone flex items-baseline justify-between pt-5 pb-4">
          <h2 className="t-display text-2xl">Historique</h2>
          {total > 0 && <Label tone="flare">{total} transaction{total !== 1 ? "s" : ""}</Label>}
        </div>

        {txLoading && txData === null && (
          <div className="py-8 text-center">
            <span className="t-body text-sm text-bone-4">Chargement…</span>
          </div>
        )}

        {!txLoading && txs.length === 0 && (
          <p className="t-body py-6 text-sm text-bone-4">Aucune transaction pour l'instant.</p>
        )}

        <div className="-mx-4">
          {txs.map((tx) => {
            const positive = tx.amountCoins > 0;
            const badge = statusBadge(tx.status);
            const typeLabel = TX_LABEL[tx.type] ?? tx.type.toLowerCase();
            const desc = TX_DESC[tx.type] ?? tx.type;
            return (
              <Row key={tx.id}>
                {/* Type — largeur auto, jamais tronquée */}
                <span className="t-label shrink-0 text-[10px] uppercase tracking-wider text-bone-4 w-[88px]">
                  {typeLabel}
                </span>
                {/* Description */}
                <span className="t-title min-w-0 flex-1 truncate text-[14px]">
                  {tx.provider === "sharepay"
                    ? tx.type === "DEPOSIT"
                      ? "Dépôt Mobile Money"
                      : tx.type === "WITHDRAWAL"
                      ? "Retrait Mobile Money"
                      : desc
                    : desc}
                </span>
                {/* Badge statut */}
                {badge && (
                  <Label tone={badge === "échoué" ? "dim" : "flare"} className="shrink-0">
                    {badge}
                  </Label>
                )}
                {/* Date */}
                <span className="t-label hidden shrink-0 text-bone-4 sm:inline">
                  {formatDate(tx.createdAt)}
                </span>
                {/* Montant */}
                <span className="flex shrink-0 items-baseline gap-1">
                  {!positive && <span className="t-display text-bone-4">−</span>}
                  <Money value={Math.abs(tx.amountCoins)} size="sm" tone={positive ? "live" : "dim"} />
                </span>
              </Row>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <span className="t-body text-sm text-bone-4">
              Page {txPage} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={txPage <= 1 || txLoading}
                onClick={() => loadTx(txPage - 1)}
                className={clsx(
                  "t-label press px-4 py-2 text-sm",
                  txPage <= 1 ? "cursor-not-allowed opacity-30 bg-ink-2" : "bg-ink-2 text-bone-2 hover:bg-ink-3"
                )}
              >
                ← Précédent
              </button>
              {/* Pages numérotées (fenêtre glissante) */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - txPage) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && arr[i - 1] !== p - 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`e${i}`} className="t-body px-2 py-2 text-bone-4">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => loadTx(p)}
                      disabled={txLoading}
                      className={clsx(
                        "t-label press min-w-[36px] px-3 py-2 text-sm",
                        p === txPage ? "bg-flare text-ink" : "bg-ink-2 text-bone-2 hover:bg-ink-3"
                      )}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                disabled={txPage >= totalPages || txLoading}
                onClick={() => loadTx(txPage + 1)}
                className={clsx(
                  "t-label press px-4 py-2 text-sm",
                  txPage >= totalPages ? "cursor-not-allowed opacity-30 bg-ink-2" : "bg-ink-2 text-bone-2 hover:bg-ink-3"
                )}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ── Panneau dépôt / retrait ── */
function TxPanel({ mode, onDone }) {
  const { user, refreshWallet } = useAuth();
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState(METHODS[0]);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  const isDeposit = mode === "deposit";

  async function doSubmit() {
    setConfirmingWithdraw(false);
    setError("");
    setBusy(true);
    try {
      const call = isDeposit ? api.deposit : api.withdraw;
      const { transaction } = await call({ amountCoins: amount, method: method.code, phone });

      // Resync automatique pour les dépôts (webhook peut tarder)
      if (isDeposit && transaction.status === "PENDING") {
        setTimeout(async () => {
          await api.resyncTransaction(transaction.id).catch(() => {});
        }, 6000);
      }

      // Message de confirmation adapté à l'opération
      const fmtAmount = amount.toLocaleString("fr-FR");
      const notifResult = isDeposit
        ? {
            kind: "pending",
            title: `Dépôt de ${fmtAmount} F initié`,
            body: `Une demande de paiement ${method.label} a été envoyée au ${phone}. Confirme-la sur ton téléphone pour valider le dépôt.`,
          }
        : {
            kind: "pending",
            title: `Retrait de ${fmtAmount} F en cours`,
            body: `Ton virement ${method.label} est en cours de traitement. Les fonds seront sur le ${phone} dans quelques minutes. Si tu ne reçois rien au bout de 10 min, contacte le support.`,
          };

      onDone(notifResult);
    } catch (err) {
      const msg = err.message || "Opération impossible";
      // Si le backend a remboursé (502 = provider unreachable + refund automatique)
      const isRefunded = msg.toLowerCase().includes("remboursé") || msg.toLowerCase().includes("rembours");
      if (!isDeposit && isRefunded) {
        const fmtAmount = amount.toLocaleString("fr-FR");
        onDone({
          kind: "refunded",
          title: "Retrait échoué — solde remboursé",
          body: `Le fournisseur de paiement n'a pas pu traiter ta demande. Les ${fmtAmount} F ont été immédiatement remboursés sur ton solde QuizArena.`,
        });
      } else {
        setError(msg);
        setBusy(false);
      }
    }
  }

  return (
    <div className="anim-rise rule mt-8 pt-8 flex flex-col gap-8">

      {/* ── Choix de l'opérateur ── */}
      <div>
        <Label className="mb-3">Opérateur Mobile Money</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {METHODS.map((m) => (
            <button
              key={m.code}
              onClick={() => setMethod(m)}
              className={clsx(
                "press flex items-center gap-4 rounded-(--radius-card) border-2 px-4 py-4 text-left transition-all",
                method.code === m.code
                  ? "border-transparent"
                  : "border-transparent bg-ink-2 hover:bg-ink-3"
              )}
              style={
                method.code === m.code
                  ? { background: m.bg, borderColor: m.border }
                  : {}
              }
            >
              {/* Logo opérateur stylisé */}
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-(--radius-tag) text-[11px] font-black"
                style={{
                  background: method.code === m.code ? m.color : "rgba(255,255,255,0.06)",
                  color: method.code === m.code ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              >
                {m.short}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="t-title text-[15px] font-bold"
                  style={method.code === m.code ? { color: m.color } : {}}
                >
                  {m.label}
                </p>
                <p className="t-body mt-0.5 text-xs text-bone-4">{m.hint}</p>
              </div>
              {/* Indicateur sélectionné */}
              {method.code === m.code && (
                <span
                  className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: m.color }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <polyline points="1,4 3.5,6.5 9,1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Montant ── */}
      <div>
        <Label className="mb-3">
          {isDeposit ? "Montant à déposer" : "Montant à retirer"}
        </Label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={100}
            step={100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="flex-1"
          />
          <span className="t-label shrink-0 text-bone-4">FCFA</span>
        </div>
        {/* Montants rapides */}
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q)}
              className={clsx(
                "t-label press px-3 py-2 text-sm rounded-(--radius-tag)",
                amount === q ? "bg-flare text-ink" : "bg-ink-2 text-bone-3 hover:bg-ink-3"
              )}
            >
              {q.toLocaleString("fr-FR")} F
            </button>
          ))}
        </div>
      </div>

      {/* ── Numéro ── */}
      <div>
        <Field
          label={`Numéro ${method.label}`}
          error={error || undefined}
        >
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={`237${method.code === "ORANGE_MONEY_CM" ? "690" : "670"}000000`}
          />
        </Field>
        <p className="t-body mt-2 text-xs text-bone-4">
          {isDeposit
            ? `Une demande de paiement ${method.label} sera envoyée sur ce numéro. Confirme-la sur ton téléphone.`
            : `Le montant sera versé sur le numéro ${method.label} indiqué ci-dessus.`}
        </p>
      </div>

      {/* ── Récapitulatif ── */}
      <div
        className="rounded-(--radius-card) px-4 py-4 flex items-center justify-between gap-4"
        style={{ background: method.bg, border: `1px solid ${method.border}` }}
      >
        <div>
          <p className="t-label text-[11px] text-bone-4 uppercase tracking-wider">
            {isDeposit ? "Vous déposez via" : "Vous retirez via"}
          </p>
          <p className="t-title mt-1 text-[15px]" style={{ color: method.color }}>
            {method.label}
          </p>
        </div>
        <div className="text-right">
          <p className="t-label text-[11px] text-bone-4 uppercase tracking-wider">Montant</p>
          <p className="t-display mt-1 text-xl font-black text-bone">
            {amount.toLocaleString("fr-FR")} <span className="text-[13px] font-normal text-bone-4">FCFA</span>
          </p>
        </div>
      </div>

      {/* ── Bouton ── */}
      <Block
        size="lg"
        full
        onClick={isDeposit ? doSubmit : () => setConfirmingWithdraw(true)}
        loading={busy}
        disabled={!phone || amount < 100}
      >
        {isDeposit
          ? `Déposer ${amount.toLocaleString("fr-FR")} F via ${method.label}`
          : `Retirer ${amount.toLocaleString("fr-FR")} F vers ${method.label}`}
      </Block>

      <ConfirmModal
        open={confirmingWithdraw}
        tone="danger"
        title={`Retirer ${amount.toLocaleString("fr-FR")} F ?`}
        message={`Envoi vers le ${phone || "numéro renseigné"} via ${method.label}. Cette action est irréversible une fois confirmée.`}
        confirmLabel={`Confirmer le retrait via ${method.label}`}
        busy={busy}
        onConfirm={doSubmit}
        onCancel={() => setConfirmingWithdraw(false)}
      />
    </div>
  );
}
