import { formatMoney } from "../../lib/currency";
import { formatDateTime, formatTransactionStatus } from "../../lib/dateTime";

const LABELS = { DEPOSIT: "Dépôt", WITHDRAWAL: "Retrait", STAKE: "Mise", PAYOUT: "Gain", REFUND: "Remboursement", BONUS: "Bonus" };

export default function TransactionHistory({ transactions, currency, page, totalPages, onPageChange }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-bold">Historique</h2>
      <div className="card overflow-hidden rounded-2xl">
        {transactions.length ? transactions.map((transaction) => {
          const positive = transaction.amountCoins > 0;
          const bonus = Math.abs(transaction.bonusAmountCoins || 0);
          const real = Math.max(0, Math.abs(transaction.amountCoins) - bonus);
          return (
            <div key={transaction.id} className="grid grid-cols-[1fr_auto] gap-3 border-b px-4 py-3 last:border-0" style={{ borderColor: "var(--divider)" }}>
              <div>
                <strong className="text-sm">{LABELS[transaction.type] || transaction.type}</strong>
                <p className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>{formatDateTime(transaction.createdAt)} · {formatTransactionStatus(transaction.status)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {real > 0 && <span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: "var(--success-soft)", color: "var(--success)" }}>Réel {formatMoney(real, currency)}</span>}
                  {bonus > 0 && <span className="rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>Bonus {formatMoney(bonus, currency)}</span>}
                </div>
              </div>
              <strong style={{ color: positive ? "var(--success)" : "var(--danger)" }}>{formatMoney(transaction.amountCoins, currency, { showPlus: true })}</strong>
            </div>
          );
        }) : <p className="p-6 text-center text-sm" style={{ color: "var(--text-sub)" }}>Aucune transaction.</p>}
      </div>
      {transactions.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="btn-secondary rounded-lg px-4 py-2 disabled:opacity-30">Précédent</button>
          <span className="text-xs">Page {page}/{totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="btn-secondary rounded-lg px-4 py-2 disabled:opacity-30">Suivant</button>
        </div>
      )}
    </section>
  );
}
