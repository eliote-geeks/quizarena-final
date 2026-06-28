import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TRANSACTIONS } from "../data/mockData";
import { formatMoney, CURRENCIES } from "../lib/currency";
import CurrencyBadge, { MoneyDisplay } from "../components/CurrencyBadge";
import {
  ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown,
  Trophy, Wallet as WalletIcon, X, Copy, Check, Phone,
} from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";

const AMBER = "#E5A800";
const GREEN = "#5DD66E";
const RED   = "#E67373";

const typeMeta = {
  win:     { icon: TrendingUp,       color: GREEN },
  loss:    { icon: TrendingDown,     color: RED   },
  deposit: { icon: ArrowDownToLine,  color: AMBER },
  entry:   { icon: Trophy,           color: AMBER },
};

// Orange Money & MTN Mobile Money configs
const PAYMENT_METHODS = [
  {
    id:      "orange",
    name:    "Orange Money",
    logo:    "🟠",
    color:   "#FF6600",
    number:  "693 000 000",
    steps: [
      "Composez #150# sur votre téléphone Orange",
      'Choisissez "Transfert d\'argent"',
      `Entrez le numéro : 693 000 000`,
      "Entrez le montant souhaité",
      "Entrez votre code secret",
      "Notez la référence de transaction",
      'Envoyez-nous la référence par email à depot@quizarena.app avec votre pseudo QuizArena',
    ],
  },
  {
    id:      "mtn",
    name:    "MTN Mobile Money",
    logo:    "🟡",
    color:   "#FFCC00",
    number:  "670 000 000",
    steps: [
      "Composez *126# sur votre téléphone MTN",
      'Choisissez "Transfert d\'argent"',
      `Entrez le numéro : 670 000 000`,
      "Entrez le montant souhaité",
      "Confirmez avec votre code PIN",
      "Notez la référence de transaction",
      'Envoyez-nous la référence par email à depot@quizarena.app avec votre pseudo QuizArena',
    ],
  },
];

const AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000];

function DepositModal({ onClose }) {
  const { currency } = useApp();
  const [method,   setMethod]   = useState(null);
  const [amount,   setAmount]   = useState(2500);
  const [custom,   setCustom]   = useState("");
  const [copied,   setCopied]   = useState(false);
  const [step,     setStep]     = useState("choose"); // choose | method | confirm

  const finalAmount = custom ? parseInt(custom) || 0 : amount;
  const pm = PAYMENT_METHODS.find(p => p.id === method);

  const copyNumber = () => {
    navigator.clipboard.writeText(pm.number.replace(/ /g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-md rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ background: "#0A0A15" }}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-white">Déposer des fonds</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {step === "choose" && (
            <>
              {/* Amount picker */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold mb-3">Montant à déposer</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {AMOUNTS.map(a => (
                    <button
                      key={a}
                      onClick={() => { setAmount(a); setCustom(""); }}
                      className="py-2.5 rounded-xl text-xs font-bold border transition"
                      style={{
                        background:  amount === a && !custom ? `${AMBER}14` : "rgba(255,255,255,0.03)",
                        borderColor: amount === a && !custom ? `${AMBER}50` : "rgba(255,255,255,0.07)",
                        color:       amount === a && !custom ? AMBER : "rgba(255,255,255,0.55)",
                      }}
                    >
                      {formatMoney(a, "XAF")}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Montant personnalisé (FCFA)"
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs border bg-transparent text-white/70 placeholder-white/20 focus:outline-none focus:border-white/20"
                  style={{ borderColor: custom ? `${AMBER}50` : "rgba(255,255,255,0.08)" }}
                />
                {finalAmount > 0 && (
                  <p className="text-[10px] text-white/30 mt-1.5 text-center">
                    ≈ {formatMoney(finalAmount, currency)} — crédité en FCFA sur votre solde QuizArena
                  </p>
                )}
              </div>

              {/* Method picker */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold mb-3">Mode de paiement</p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => setMethod(pm.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition"
                      style={{
                        background:  method === pm.id ? `${pm.color}10` : "rgba(255,255,255,0.02)",
                        borderColor: method === pm.id ? `${pm.color}50` : "rgba(255,255,255,0.07)",
                      }}
                    >
                      <span className="text-2xl">{pm.logo}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white">{pm.name}</p>
                        <p className="text-[10px] text-white/35 mt-0.5">Cameroun · Dépôt manuel · 30 min</p>
                      </div>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: method === pm.id ? pm.color : "rgba(255,255,255,0.2)" }}>
                        {method === pm.id && <div className="w-2 h-2 rounded-full" style={{ background: pm.color }} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => method && finalAmount >= 100 && setStep("method")}
                disabled={!method || finalAmount < 100}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition disabled:opacity-30"
                style={{ background: AMBER, color: "#07070F" }}
              >
                Continuer → Voir les instructions
              </button>
              {finalAmount > 0 && finalAmount < 100 && (
                <p className="text-center text-[10px] text-red-400">Montant minimum : 100 FCFA</p>
              )}
            </>
          )}

          {step === "method" && pm && (
            <>
              {/* Payment instructions */}
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">{pm.logo}</span>
                <div>
                  <p className="text-sm font-bold text-white">{pm.name}</p>
                  <p className="text-xs font-bold" style={{ color: AMBER }}>{formatMoney(finalAmount, "XAF")}</p>
                </div>
              </div>

              {/* Numero à appeler */}
              <div
                className="flex items-center justify-between p-4 rounded-xl border"
                style={{ background: `${pm.color}0A`, borderColor: `${pm.color}30` }}
              >
                <div>
                  <p className="text-[10px] text-white/30 mb-0.5">Numéro de dépôt</p>
                  <p className="font-arcade text-lg leading-none" style={{ color: pm.color }}>{pm.number}</p>
                </div>
                <button
                  onClick={copyNumber}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition"
                  style={{ background: `${pm.color}20`, color: pm.color }}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copié" : "Copier"}
                </button>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {pm.steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: `${pm.color}20`, color: pm.color }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>

              <div
                className="p-3.5 rounded-xl border text-[11px] text-white/40 leading-relaxed"
                style={{ background: "rgba(229,168,0,0.05)", borderColor: `${AMBER}20` }}
              >
                ⏱ Votre solde sera crédité dans un délai de <strong className="text-white/60">30 minutes</strong> après réception de la référence.
                En cas de problème : <span className="text-white/60">support@quizarena.app</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("choose")}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold border border-white/[0.08] text-white/40 hover:text-white/60 transition"
                >
                  ← Retour
                </button>
                <button
                  onClick={onClose}
                  className="flex-[2] py-3 rounded-xl text-sm font-bold transition"
                  style={{ background: AMBER, color: "#07070F" }}
                >
                  J'ai effectué le transfert
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Wallet() {
  const { coins, currency } = useApp();
  const [showDeposit, setShowDeposit] = useState(false);

  return (
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-white">Portefeuille</h1>
          <CurrencyBadge />
        </div>

        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 border border-white/[0.07] relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0D0D1A 0%, #0A0A14 100%)" }}
        >
          {/* Subtle glow */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${AMBER}08 0%, transparent 70%)` }} />

          <div className="relative">
            <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold mb-1">Solde disponible</p>
            <div className="flex items-end gap-3 mb-1">
              <span className="font-arcade leading-none" style={{ fontSize: "clamp(32px, 8vw, 52px)", color: AMBER }}>
                <MoneyDisplay amountXAF={coins} />
              </span>
            </div>
            <p className="text-[11px] text-white/25">
              {currency !== "XAF" && `= ${formatMoney(coins, "XAF")} · `}
              Argent réel · dépôts via Mobile Money
            </p>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowDeposit(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition hover:opacity-90"
                style={{ background: AMBER, color: "#07070F" }}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" /> Déposer
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-white/[0.08] text-white/50 hover:text-white/70 hover:border-white/20 transition"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" /> Retirer
              </button>
            </div>
          </div>
        </motion.div>

        {/* Accepted payment methods strip */}
        <div className="flex items-center gap-3 px-1">
          <p className="text-[10px] text-white/20 uppercase tracking-widest shrink-0">Acceptés</p>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map(pm => (
              <div
                key={pm.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-semibold"
                style={{ background: `${pm.color}0C`, borderColor: `${pm.color}25`, color: pm.color }}
              >
                <Phone className="w-3 h-3" />
                {pm.name}
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp,   label: "Gains 30j",  value: +18450, color: GREEN },
            { icon: TrendingDown, label: "Pertes 30j",  value: -4200,  color: RED   },
            { icon: WalletIcon,   label: "ROI",         value: null,   color: AMBER, text: "+76%" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl p-3.5 border border-white/[0.07]" style={{ background: "#0B0B14" }}>
                <Icon className="w-3.5 h-3.5 mb-2" style={{ color: s.color }} />
                <div className="text-[10px] text-white/30 mb-0.5">{s.label}</div>
                <div className="font-arcade text-base leading-none" style={{ color: s.color }}>
                  {s.text || formatMoney(s.value, currency, { showPlus: true })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Transactions */}
        <div className="rounded-xl border border-white/[0.07] overflow-hidden" style={{ background: "#0B0B14" }}>
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-white/50">Historique des transactions</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {TRANSACTIONS.map((tx) => {
              const m = typeMeta[tx.type] || typeMeta.deposit;
              const Icon = m.icon;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition"
                >
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}15`, color: m.color }}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white/80 truncate">{tx.meta}</div>
                    <div className="text-[10px] text-white/25 mt-0.5 font-arcade">{tx.date}</div>
                  </div>
                  <div className="font-arcade text-sm leading-none shrink-0" style={{ color: tx.amount > 0 ? GREEN : RED }}>
                    {formatMoney(tx.amount, currency, { showPlus: true })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legal note */}
        <p className="text-center text-[10px] text-white/15 px-4 leading-relaxed">
          Les fonds déposés sont en Francs CFA (XAF). L'affichage en d'autres devises est indicatif.
          Tout dépôt est définitif — voir notre{" "}
          <a href="/refund" className="underline hover:text-white/30 transition">politique de remboursement</a>.
        </p>

      </div>

      <AnimatePresence>
        {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
      </AnimatePresence>
    </div>
  );
}
