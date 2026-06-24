import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TRANSACTIONS } from "../data/mockData";
import { Coins, ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, Trophy, Wallet as WalletIcon } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";
import { toast } from "sonner";

const AMBER = "#E5A800";

const typeMeta = {
  win: { icon: TrendingUp, color: "#5DD66E" },
  loss: { icon: TrendingDown, color: "#E67373" },
  deposit: { icon: ArrowDownToLine, color: AMBER },
  entry: { icon: Trophy, color: AMBER },
};

export default function Wallet() {
  const { t, coins, addCoins } = useApp();

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        <div>
          <h1 className="text-sm font-semibold text-white">{t.wallet.title}</h1>
        </div>

        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 border border-white/[0.07] bg-[#0B0B14] relative overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-white/40 mb-1">{t.wallet.balance}</div>
              <div className="flex items-center gap-2">
                <span className="font-arcade text-4xl leading-none" style={{ color: AMBER }}>
                  {coins.toLocaleString()}
                </span>
                <Coins className="w-5 h-5" style={{ color: AMBER }} />
              </div>
              <div className="mt-1 text-xs text-white/25">≈ {(coins * 0.01).toFixed(2)} USD (demo)</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { addCoins(1000); toast.success("+1000 jetons crédités (demo)"); }}
                data-testid="wallet-deposit-btn"
                className="flex items-center gap-1.5 px-3 py-2 text-black text-xs font-semibold rounded-md transition hover:opacity-90"
                style={{ background: AMBER }}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" /> {t.wallet.deposit}
              </button>
              <button
                onClick={() => toast.info("Démo — retrait simulé")}
                data-testid="wallet-withdraw-btn"
                className="flex items-center gap-1.5 px-3 py-2 text-white/70 text-xs font-semibold rounded-md border border-white/[0.07] hover:border-white/20 hover:text-white transition"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" /> {t.wallet.withdraw}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick stats */}
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, label: "Gains 30j", value: "+18,450", color: "#5DD66E" },
            { icon: TrendingDown, label: "Pertes 30j", value: "-4,200", color: "#E67373" },
            { icon: WalletIcon, label: "ROI", value: "+76%", color: AMBER },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl p-3.5 bg-[#0B0B14] border border-white/[0.07]">
                <Icon className="w-3.5 h-3.5 mb-2" style={{ color: s.color }} />
                <div className="text-[10px] text-white/30 mb-0.5">{s.label}</div>
                <div className="font-arcade text-xl leading-none" style={{ color: s.color }}>{s.value}</div>
              </div>
            );
          })}
        </div>

        {/* Transactions */}
        <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-white/50">{t.wallet.transactions}</span>
          </div>
          <div className="grid grid-cols-[32px_1fr_110px_90px] gap-3 px-4 py-2 border-b border-white/[0.06] text-[10px] text-white/25 uppercase tracking-widest">
            <div />
            <div>{t.wallet.type}</div>
            <div className="text-right">{t.wallet.date}</div>
            <div className="text-right">{t.wallet.amount}</div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {TRANSACTIONS.map((tx) => {
              const m = typeMeta[tx.type];
              const Icon = m.icon;
              return (
                <div
                  key={tx.id}
                  data-testid={`tx-${tx.id}`}
                  className="grid grid-cols-[32px_1fr_110px_90px] gap-3 px-4 py-3 items-center hover:bg-white/[0.02] transition"
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: `${m.color}15`, color: m.color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white/80">{t.wallet.types[tx.type]}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{tx.meta}</div>
                  </div>
                  <div className="text-right text-[10px] text-white/30 font-arcade">{tx.date}</div>
                  <div
                    className="text-right font-arcade text-base leading-none"
                    style={{ color: tx.amount > 0 ? "#5DD66E" : "#E67373" }}
                  >
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
