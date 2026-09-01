import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import CurrencyBadge from "../../components/CurrencyBadge";
import * as api from "../../lib/api";
import { Wallet as WalletIcon } from "lucide-react";
import ArenaLoader from "../../components/ArenaLoader";
import BalanceCard from "./BalanceCard";
import TransactionHistory from "./TransactionHistory";

export default function Wallet() {
  const { coins, currency } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  // Message de retour après un dépôt/retrait — chaque opération a
  // maintenant sa propre page (§WalletTransaction.jsx, retour Paul du
  // 31/08 : "ça doit être comme google... ça renvoie sur sa page"), le
  // résultat revient donc via l'état de navigation plutôt qu'un state local.
  const [message, setMessage] = useState(location.state?.walletMessage || "");

  const load = useCallback(async (nextPage = 1) => {
    const [result, wallet] = await Promise.all([api.getWalletTransactions(nextPage, 5), api.getWallet()]);
    setData(result);
    setSummary(wallet);
    setPage(nextPage);
  }, []);
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);
  // Nettoie l'état de navigation pour qu'un retour arrière ne réaffiche pas
  // indéfiniment le même message de succès.
  useEffect(() => { if (location.state?.walletMessage) navigate(".", { replace: true, state: {} }); }, [location.state, navigate]);

  const transactions = data?.transactions || [];
  if (!summary && !message) {
    return (
      <div className="min-h-full px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl"><ArenaLoader label="Chargement du portefeuille" /></div>
      </div>
    );
  }
  const playableCoins = summary?.balanceCoins ?? coins;
  const withdrawableCoins = summary?.withdrawableCoins ?? 0;
  const bonusCoins = summary?.bonusCoins ?? 0;

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-3xl mx-auto space-y-8">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-faint)" }}><WalletIcon className="h-4 w-4" />Portefeuille sécurisé</div>
          <h1 className="mt-3 font-display text-4xl font-bold">Votre solde</h1>
        </div>
        <CurrencyBadge />
      </motion.header>

      <BalanceCard
        playableCoins={playableCoins}
        withdrawableCoins={withdrawableCoins}
        bonusCoins={bonusCoins}
        currency={currency}
        onDeposit={() => navigate("/wallet/deposit")}
        onWithdraw={() => navigate("/wallet/withdraw")}
      />

      {message && (
        <p className="rounded-xl p-4 text-sm" style={{ background: "var(--surface)", color: message.includes("succès") || message.includes("envoyée") ? "var(--success)" : "var(--danger)" }}>
          {message}
        </p>
      )}

      <TransactionHistory transactions={transactions} currency={currency} page={page} totalPages={data?.pages || 1} onPageChange={load} />
    </div>
  );
}
