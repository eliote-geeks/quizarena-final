import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TRANSACTIONS } from "../data/mockData";
import { Coins, ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, Trophy, Wallet as WalletIcon } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";
import { toast } from "sonner";

const typeMeta = {
  win: { icon: TrendingUp, color: "#5DD66E" },
  loss: { icon: TrendingDown, color: "#E67373" },
  deposit: { icon: ArrowDownToLine, color: "#E5A800" },
  entry: { icon: Trophy, color: "#E5A800" },
};

export default function Wallet() {
  const { t, coins, addCoins } = useApp();

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">// VAULT</div>
          <h1 className="font-display font-black uppercase tracking-tighter text-4xl sm:text-5xl lg:text-6xl">
            {t.wallet.title}
          </h1>
        </div>

        {/* Balance hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-8 lg:p-12 mb-10 border-2 relative overflow-hidden"
          style={{ borderColor: "rgba(229,168,0,0.35)", background: "linear-gradient(135deg, #161108 0%, #05050A 60%)" }}
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#E5A800]/12 blur-[100px]" />
          <div className="scanline-bar opacity-40" />
          <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#E5A800" }}>{t.wallet.balance}</div>
              <div className="flex items-baseline gap-3">
                <span className="font-arcade text-7xl lg:text-8xl leading-none" style={{ color: "#E5A800", textShadow: "0 0 30px rgba(229,168,0,0.5)" }}>
                  {coins.toLocaleString()}
                </span>
                <Coins className="w-10 h-10" style={{ color: "#E5A800" }} />
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
                className="px-6 py-4 text-black font-bold uppercase tracking-widest rounded-md hover:shadow-[0_0_24px_rgba(229,168,0,0.5)] transition flex items-center gap-2"
                style={{ background: "#E5A800" }}
              >
                <ArrowDownToLine className="w-5 h-5" /> {t.wallet.deposit}
              </button>
              <button
                onClick={() => toast.info("Démo — retrait simulé")}
                data-testid="wallet-withdraw-btn"
                className="px-6 py-4 border text-white font-bold uppercase tracking-widest rounded-md hover:bg-white/5 transition flex items-center gap-2"
                style={{ borderColor: "rgba(229,168,0,0.5)" }}
              >
                <ArrowUpFromLine className="w-5 h-5" /> {t.wallet.withdraw}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: TrendingUp, label: "Gains 30j", value: "+18,450", color: "#5DD66E" },
            { icon: TrendingDown, label: "Pertes 30j", value: "-4,200", color: "#E67373" },
            { icon: WalletIcon, label: "ROI", value: "+76%", color: "#E5A800" },
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
  );
}
