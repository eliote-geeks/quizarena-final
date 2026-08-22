import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import CurrencyBadge, { MoneyDisplay } from "../components/CurrencyBadge";
import * as api from "../lib/api";
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon } from "lucide-react";

const METHODS = [{ id: "ORANGE_MONEY_CM", label: "Orange Money" }, { id: "MTN_MOMO_CM", label: "MTN Mobile Money" }];
const LABELS = { DEPOSIT: "Dépôt", WITHDRAWAL: "Retrait", STAKE: "Mise", PAYOUT: "Gain", REFUND: "Remboursement", BONUS: "Bonus" };

export default function Wallet() {
  const { coins, currency, user, refreshWallet } = useApp();
  const [mode, setMode] = useState(null);
  const [amount, setAmount] = useState(1000);
  const [method, setMethod] = useState("ORANGE_MONEY_CM");
  const [phone, setPhone] = useState(user?.phone || "");
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (nextPage = 1) => { const result = await api.getWalletTransactions(nextPage, 15); setData(result); setPage(nextPage); }, []);
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);

  const submit = async () => {
    if (amount < 100 || amount > 500000) { setMessage("Le montant doit être compris entre 100 F et 500 000 F."); return; }
    setBusy(true); setMessage("");
    try {
      const payload = { amountCoins: Number(amount), method, ...(phone ? { phone } : {}) };
      const result = mode === "deposit" ? await api.deposit(payload) : await api.withdraw(payload);
      setMessage(result.transaction?.status === "PENDING" ? "Demande envoyée. Confirme l’opération sur ton téléphone." : "Opération enregistrée avec succès.");
      setMode(null); await refreshWallet(); await load(1);
    } catch (error) { setMessage(error.message || "L’opération a échoué"); }
    finally { setBusy(false); }
  };

  const transactions = data?.transactions || [];
  return <div className="min-h-full px-4 sm:px-6 py-8 max-w-3xl mx-auto space-y-8"><motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between"><div><div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-faint)" }}><WalletIcon className="h-4 w-4" />Portefeuille sécurisé</div><h1 className="mt-3 font-display text-4xl font-bold">Votre solde</h1></div><CurrencyBadge /></motion.header>
    <section className="card mesh-hero rounded-3xl p-7"><MoneyDisplay amountXAF={coins} /><p className="mt-2 text-sm" style={{ color: "var(--text-sub)" }}>Solde calculé depuis le registre de transactions, jamais depuis le navigateur.</p><div className="mt-6 flex gap-2"><button onClick={() => setMode(mode === "deposit" ? null : "deposit")} className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3"><ArrowDownToLine className="h-4 w-4" />Déposer</button><button onClick={() => setMode(mode === "withdraw" ? null : "withdraw")} className="btn-secondary inline-flex items-center gap-2 rounded-xl px-5 py-3"><ArrowUpFromLine className="h-4 w-4" />Retirer</button></div></section>
    {mode && <section className="card rounded-2xl p-5"><h2 className="font-display text-xl font-bold">{mode === "deposit" ? "Nouveau dépôt" : "Nouveau retrait"}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Montant (FCFA)<input type="number" min="100" max="500000" value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="mt-2 w-full rounded-xl border bg-transparent px-4 py-3 text-base outline-none" style={{ borderColor: "var(--border)" }} /></label><label className="text-xs font-bold">Opérateur<select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>{METHODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div><label className="mt-4 block text-xs font-bold">Numéro Mobile Money<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="2376…" className="mt-2 w-full rounded-xl border bg-transparent px-4 py-3 outline-none" style={{ borderColor: "var(--border)" }} /></label><button disabled={busy} onClick={submit} className="btn-primary mt-5 w-full rounded-xl py-3 disabled:opacity-50">{busy ? "Traitement sécurisé…" : `Confirmer ${formatMoney(amount, currency)}`}</button></section>}
    {message && <p className="rounded-xl p-4 text-sm" style={{ background: "var(--surface)", color: message.includes("succès") || message.includes("envoyée") ? "var(--success)" : "var(--danger)" }}>{message}</p>}
    <section><h2 className="mb-4 font-display text-2xl font-bold">Historique</h2><div className="card overflow-hidden rounded-2xl">{transactions.length ? transactions.map((transaction) => { const positive = transaction.amountCoins > 0; return <div key={transaction.id} className="grid grid-cols-[1fr_auto] gap-3 border-b px-4 py-3 last:border-0" style={{ borderColor: "var(--divider)" }}><div><strong className="text-sm">{LABELS[transaction.type] || transaction.type}</strong><p className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>{new Date(transaction.createdAt).toLocaleString("fr-FR")} · {transaction.status}</p></div><strong style={{ color: positive ? "var(--success)" : "var(--danger)" }}>{formatMoney(transaction.amountCoins, currency, { showPlus: true })}</strong></div>; }) : <p className="p-6 text-center text-sm" style={{ color: "var(--text-sub)" }}>Aucune transaction.</p>}</div>{(data?.pages || 1) > 1 && <div className="mt-4 flex items-center justify-between"><button disabled={page <= 1} onClick={() => load(page - 1)} className="btn-secondary rounded-lg px-4 py-2 disabled:opacity-30">Précédent</button><span className="text-xs">Page {page}/{data.pages}</span><button disabled={page >= data.pages} onClick={() => load(page + 1)} className="btn-secondary rounded-lg px-4 py-2 disabled:opacity-30">Suivant</button></div>}</section>
  </div>;
}
