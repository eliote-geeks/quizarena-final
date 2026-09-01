import { ArrowDownToLine, ArrowUpFromLine, BadgeCheck, CircleDollarSign, ShieldCheck } from "lucide-react";
import { MoneyDisplay } from "../../components/CurrencyBadge";
import { formatMoney } from "../../lib/currency";

export default function BalanceCard({ playableCoins, withdrawableCoins, bonusCoins, currency, onDeposit, onWithdraw }) {
  return (
    <section className="card rounded-3xl p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em]" style={{ color: "var(--text-sub)" }}>Total disponible pour jouer</p>
          <div className="mt-2"><MoneyDisplay amountXAF={playableCoins} /></div>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
          <ShieldCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <BalanceTile icon={BadgeCheck} label="Argent réel · retirable" value={formatMoney(withdrawableCoins, currency)} detail="Dépôts réels et gains financés par de l’argent réel" tone="real" />
        <BalanceTile icon={CircleDollarSign} label="Bonus de jeu · non retirable" value={formatMoney(bonusCoins, currency)} detail="Jouable, mais impossible à retirer ou convertir" tone="bonus" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold" style={{ background: "var(--surface-2)", borderColor: "var(--divider)", color: "var(--text-sub)" }}>
        <span>{formatMoney(withdrawableCoins, currency)} réel</span>
        <span aria-hidden="true" style={{ color: "var(--text-faint)" }}>+</span>
        <span>{formatMoney(bonusCoins, currency)} bonus</span>
        <span aria-hidden="true" style={{ color: "var(--text-faint)" }}>=</span>
        <span style={{ color: "var(--text)" }}>{formatMoney(playableCoins, currency)} jouable</span>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={onDeposit} className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3">
          <ArrowDownToLine className="h-4 w-4" />Ajouter des fonds
        </button>
        <button
          disabled={withdrawableCoins < 100}
          title={withdrawableCoins < 100 ? "Aucun solde réel retirable" : "Retirer votre argent réel"}
          onClick={onWithdraw}
          className="btn-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUpFromLine className="h-4 w-4" />Retirer
        </button>
      </div>
    </section>
  );
}

function BalanceTile({ icon: Icon, label, value, detail, tone }) {
  const color = tone === "real" ? "var(--success)" : "var(--accent)";
  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--surface-2)", borderColor: color }}>
      <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--text-sub)" }}>
        <Icon className="h-4 w-4" style={{ color }} />{label}
      </div>
      <strong className="mt-2 block font-display text-xl" style={{ color }}>{value}</strong>
      {detail && <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-sub)" }}>{detail}</p>}
    </div>
  );
}
