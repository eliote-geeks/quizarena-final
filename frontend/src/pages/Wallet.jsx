import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TRANSACTIONS } from "../data/mockData";
import { Coins, ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, Trophy, Wallet as WalletIcon } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";
import { toast } from "sonner";

const typeMeta = {
  win: { icon: TrendingUp, color: "#39FF14" },
  loss: { icon: TrendingDown, color: "#FF3333" },
  deposit: { icon: ArrowDownToLine, color: "#00FFFF" },
  entry: { icon: Trophy, color: "#FFD700" },
};

export default function Wallet() {
  const { t, coins, addCoins } = useApp();

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-[#39FF14] mb-2">// VAULT</div>
          <h1 className="font-display font-black uppercase tracking-tighter text-4xl sm:text-5xl lg:text-6xl">
            {t.wallet.title}
          </h1>
        </div>

        {/* Balance hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-8 lg:p-12 mb-10 border-2 border-[#FFD700]/40 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a1303 0%, #05050A 60%)" }}
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#FFD700]/20 blur-[100px]" />
          <div className="scanline-bar opacity-60" />
          <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <div className="text-xs uppercase tracking-widest text-[#FFD700] mb-2">{t.wallet.balance}</div>
              <div className="flex items-baseline gap-3">
                <span className="font-arcade text-7xl lg:text-8xl text-[#FFD700] text-glow-yellow leading-none">
                  {coins.toLocaleString()}
                </span>
                <Coins className="w-10 h-10 text-[#FFD700]" />
              </div>
              <div className="mt-2 text-sm text-slate-400">≈ {(coins * 0.01).toFixed(2)} USD (demo)</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  addCoins(1000);
                  toast.success("+1000 jetons crédités (demo)");
                }}
                data-testid="wallet-deposit-btn"
                className="px-6 py-4 bg-[#39FF14] text-black font-bold uppercase tracking-widest rounded-md hover:shadow-[0_0_24px_rgba(57,255,20,0.6)] transition flex items-center gap-2"
              >
                <ArrowDownToLine className="w-5 h-5" /> {t.wallet.deposit}
              </button>
              <button
                onClick={() => toast.info("Démo — retrait simulé")}
                data-testid="wallet-withdraw-btn"
                className="px-6 py-4 border border-[#FFD700]/50 text-[#FFD700] font-bold uppercase tracking-widest rounded-md hover:bg-[#FFD700]/10 transition flex items-center gap-2"
              >
                <ArrowUpFromLine className="w-5 h-5" /> {t.wallet.withdraw}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: TrendingUp, label: "Gains 30j", value: "+18,450", color: "#39FF14" },
            { icon: TrendingDown, label: "Pertes 30j", value: "-4,200", color: "#FF3333" },
            { icon: WalletIcon, label: "ROI", value: "+76%", color: "#FFD700" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl p-5 bg-[#0B0B14] border border-white/10">
                <Icon className="w-5 h-5 mb-3" style={{ color: s.color }} />
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">{s.label}</div>
                <div className="font-arcade text-3xl" style={{ color: s.color }}>{s.value}</div>
              </div>
            );
          })}
        </div>

        {/* Transactions */}
        <div className="rounded-2xl border border-white/10 bg-[#0B0B14] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-display font-bold uppercase tracking-tight text-xl">{t.wallet.transactions}</h2>
          </div>
          <div className="grid grid-cols-[40px_1fr_140px_120px] gap-4 px-6 py-3 border-b border-white/10 text-[10px] uppercase tracking-widest text-slate-500">
            <div></div>
            <div>{t.wallet.type}</div>
            <div className="text-right">{t.wallet.date}</div>
            <div className="text-right">{t.wallet.amount}</div>
          </div>
          {TRANSACTIONS.map((tx) => {
            const m = typeMeta[tx.type];
            const Icon = m.icon;
            return (
              <div
                key={tx.id}
                data-testid={`tx-${tx.id}`}
                className="grid grid-cols-[40px_1fr_140px_120px] gap-4 px-6 py-4 border-b border-white/5 items-center hover:bg-white/[0.02] transition"
              >
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center"
                  style={{ background: `${m.color}15`, color: m.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-white">{t.wallet.types[tx.type]}</div>
                  <div className="text-xs text-slate-500">{tx.meta}</div>
                </div>
                <div className="text-right text-xs text-slate-400 font-arcade text-sm">{tx.date}</div>
                <div
                  className="text-right font-arcade text-xl"
                  style={{ color: tx.amount > 0 ? "#39FF14" : "#FF3333" }}
                >
                  {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
