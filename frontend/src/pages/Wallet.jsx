import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TRANSACTIONS } from "../data/mockData";
import { formatMoney } from "../lib/currency";
import CurrencyBadge, { MoneyDisplay } from "../components/CurrencyBadge";
import {
  ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown,
  Trophy, X, Copy, Check, Wallet as WalletIcon,
} from "lucide-react";
import { toast } from "sonner";

const AMBER = "var(--accent)";
const GREEN = "var(--success)";
const RED   = "var(--danger)";

const typeMeta = {
  win:     { icon: TrendingUp,       color: GREEN, label: "Gain" },
  loss:    { icon: TrendingDown,     color: RED,   label: "Perte" },
  deposit: { icon: ArrowDownToLine,  color: AMBER, label: "Dépôt" },
  entry:   { icon: Trophy,           color: AMBER, label: "Inscription" },
};

const PAYMENT_METHODS = [
  {
    id: "orange",
    name: "Orange Money",
    brand: "Orange",
    subBrand: "Money",
    color: "#FF6600",
    number: "693 000 000",
    steps: [
      "Composez #150# sur votre téléphone Orange",
      'Choisissez "Transfert d\'argent"',
      "Entrez le numéro : 693 000 000",
      "Entrez le montant souhaité",
      "Entrez votre code secret",
      "Notez la référence de transaction",
      "Envoyez-nous la référence par email à depot@quizarena.app avec votre pseudo QuizArena",
    ],
  },
  {
    id: "mtn",
    name: "MTN Mobile Money",
    brand: "MTN",
    subBrand: "MoMo",
    color: "#FFCC00",
    number: "670 000 000",
    steps: [
      "Composez *126# sur votre téléphone MTN",
      'Choisissez "Transfert d\'argent"',
      "Entrez le numéro : 670 000 000",
      "Entrez le montant souhaité",
      "Confirmez avec votre code PIN",
      "Notez la référence de transaction",
      "Envoyez-nous la référence par email à depot@quizarena.app avec votre pseudo QuizArena",
    ],
  },
];

const AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000];

function DepositModal({ onClose }) {
  const { currency } = useApp();
  const [method, setMethod] = useState(null);
  const [amount, setAmount] = useState(2500);
  const [custom, setCustom] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState("choose");

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
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border-md)" }}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--qa-divider)" }}>
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--qa-text)" }}>
            Déposer
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg transition hover:opacity-70" style={{ color: "var(--qa-text-faint)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {step === "choose" && (
            <>
              <div>
                <p className="text-sm font-bold mb-3" style={{ color: "var(--qa-text)" }}>Montant</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {AMOUNTS.map(a => (
                    <button
                      key={a}
                      onClick={() => { setAmount(a); setCustom(""); }}
                      className="py-3 rounded-xl text-sm font-bold transition"
                      style={{
                        background: amount === a && !custom ? `${AMBER}18` : "var(--qa-active)",
                        border: `1px solid ${amount === a && !custom ? `${AMBER}50` : "transparent"}`,
                        color: amount === a && !custom ? AMBER : "var(--qa-text)",
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
                  className="w-full px-4 py-3 rounded-xl text-sm bg-transparent placeholder-current focus:outline-none"
                  style={{
                    border: `1px solid ${custom ? `${AMBER}50` : "var(--qa-border)"}`,
                    color: "var(--qa-text)",
                  }}
                />
                {finalAmount > 0 && (
                  <p className="text-xs mt-2 text-center" style={{ color: "var(--qa-text-sub)" }}>
                    ≈ {formatMoney(finalAmount, currency)} crédité sur ton solde
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-bold mb-3" style={{ color: "var(--qa-text)" }}>Mode de paiement</p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => setMethod(pm.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition"
                      style={{
                        background: method === pm.id ? `${pm.color}12` : "var(--qa-active)",
                        border: `1px solid ${method === pm.id ? `${pm.color}50` : "transparent"}`,
                      }}
                    >
                      <PaymentLogo method={pm} />
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: "var(--qa-text)" }}>{pm.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--qa-text-sub)" }}>Cameroun · 30 min</p>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: method === pm.id ? pm.color : "var(--qa-text-faint)" }}>
                        {method === pm.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: pm.color }} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => method && finalAmount >= 100 && setStep("method")}
                disabled={!method || finalAmount < 100}
                className="w-full py-4 rounded-xl text-sm font-bold transition disabled:opacity-30"
                style={{ background: AMBER, color: "#07070F" }}
              >
                Continuer
              </button>
              {finalAmount > 0 && finalAmount < 100 && (
                <p className="text-center text-xs" style={{ color: "#FF6B6B" }}>Minimum 100 FCFA</p>
              )}
            </>
          )}

          {step === "method" && pm && (
            <>
              <div className="flex items-center gap-3">
                <PaymentLogo method={pm} large />
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--qa-text)" }}>{pm.name}</p>
                  <p className="text-lg font-bold" style={{ color: AMBER }}>{formatMoney(finalAmount, "XAF")}</p>
                </div>
              </div>

              <div
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: `${pm.color}10`, border: `1px solid ${pm.color}30` }}
              >
                <div>
                  <p className="text-xs" style={{ color: "var(--qa-text-sub)" }}>Numéro</p>
                  <p className="font-display font-bold text-lg leading-tight mt-0.5" style={{ color: pm.color }}>{pm.number}</p>
                </div>
                <button
                  onClick={copyNumber}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition"
                  style={{ background: `${pm.color}22`, color: pm.color }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copié" : "Copier"}
                </button>
              </div>

              <div className="space-y-2.5">
                {pm.steps.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: `${pm.color}22`, color: pm.color }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--qa-text-sub)" }}>{s}</p>
                  </div>
                ))}
              </div>

              <div
                className="p-3.5 rounded-xl text-xs leading-relaxed"
                style={{ background: `${AMBER}0C`, border: `1px solid ${AMBER}22`, color: "var(--qa-text-sub)" }}
              >
                Crédité sous <strong style={{ color: "var(--qa-text)" }}>30 minutes</strong> après réception. Support : support@quizarena.app
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep("choose")}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition"
                  style={{ background: "var(--qa-active)", color: "var(--qa-text-sub)" }}
                >
                  Retour
                </button>
                <button
                  onClick={onClose}
                  className="flex-[2] py-3 rounded-xl text-sm font-bold transition"
                  style={{ background: AMBER, color: "#07070F" }}
                >
                  J'ai envoyé
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
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: "var(--text-faint)" }}>
            <WalletIcon className="w-3.5 h-3.5" />
            <span>Portefeuille</span>
          </div>
          <h1 className="font-display font-semibold text-4xl sm:text-5xl leading-[1.05] tracking-tight" style={{ color: "var(--text)" }}>
            Votre <span className="serif-italic" style={{ color: "var(--accent)" }}>solde</span>
          </h1>
        </div>
        <CurrencyBadge />
      </motion.header>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card rounded-3xl p-8 relative overflow-hidden mesh-hero"
      >
        <div className="relative">
          <p className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>Solde disponible</p>
          <div className="font-display font-semibold leading-none mt-2 mb-2 tracking-tight" style={{ fontSize: "clamp(44px, 10vw, 72px)", color: "var(--text)" }}>
            <MoneyDisplay amountXAF={coins} />
          </div>
          <p className="text-sm" style={{ color: "var(--text-sub)" }}>
            {currency !== "XAF" && `≈ ${formatMoney(coins, "XAF")} · `}
            Crédité en FCFA
          </p>

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setShowDeposit(true)}
              className="btn-primary inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm"
            >
              <ArrowDownToLine className="w-4 h-4" /> Déposer
            </button>
            <button
              onClick={() => toast.info("Retrait disponible bientôt")}
              className="btn-secondary inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm"
            >
              <ArrowUpFromLine className="w-4 h-4" /> Retirer
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { icon: TrendingUp,   label: "Gains 30j",  value: +18450, color: GREEN },
          { icon: TrendingDown, label: "Pertes 30j", value: -4200,  color: RED   },
          { icon: WalletIcon,   label: "ROI",        value: null,   color: AMBER, text: "+76%" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card rounded-2xl p-4">
              <Icon className="w-4 h-4 mb-2" style={{ color: s.color }} strokeWidth={2} />
              <div className="text-xs font-medium" style={{ color: "var(--text-sub)" }}>{s.label}</div>
              <div className="font-display font-semibold text-lg mt-1 tracking-tight" style={{ color: s.color }}>
                {s.text || formatMoney(s.value, currency, { showPlus: true })}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Accepted */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.13 }}
        className="flex items-center gap-2"
      >
        <span className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>Acceptés :</span>
        {PAYMENT_METHODS.map(pm => (
          <div
            key={pm.id}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium card"
          >
            <PaymentLogo method={pm} compact />
            <span style={{ color: "var(--text)" }}>{pm.name}</span>
          </div>
        ))}
      </motion.div>

      {/* Transactions */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <h2 className="font-display font-semibold text-2xl tracking-tight mb-4" style={{ color: "var(--text)" }}>
          Historique
        </h2>
        <div className="card rounded-2xl overflow-hidden divide-y" style={{ borderColor: "var(--divider)" }}>
          {TRANSACTIONS.map((tx) => {
            const m = typeMeta[tx.type] || typeMeta.deposit;
            const Icon = m.icon;
            return (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface-2)", color: m.color, border: "1px solid var(--border)" }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                    {tx.meta}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-sub)" }}>
                    {m.label} · {tx.date}
                  </div>
                </div>
                <div className="font-display font-semibold text-base tabular-nums" style={{ color: tx.amount > 0 ? GREEN : RED }}>
                  {formatMoney(tx.amount, currency, { showPlus: true })}
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      <p className="text-center text-xs" style={{ color: "var(--text-faint)" }}>
        Les fonds sont en FCFA (XAF). Voir{" "}
        <a href="/refund" className="underline hover:opacity-80">politique de remboursement</a>.
      </p>

      <AnimatePresence>
        {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
      </AnimatePresence>
    </div>
  );
}

function PaymentLogo({ method, large = false, compact = false }) {
  const sizeClass = compact ? "h-6 min-w-14 px-1.5" : large ? "h-14 min-w-24 px-3" : "h-10 min-w-20 px-2.5";
  const isMtn = method.id === "mtn";
  return (
    <span
      className={`${sizeClass} rounded-lg flex flex-col items-center justify-center overflow-hidden flex-shrink-0 font-black leading-none`}
      style={{
        background: isMtn ? "#FFCC00" : "#FF6600",
        color: isMtn ? "#111111" : "#FFFFFF",
        border: `1px solid ${isMtn ? "#D6A900" : "#FF8A3D"}`,
        boxShadow: `inset 0 -10px 18px ${isMtn ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.14)"}`,
      }}
    >
      <span className={compact ? "text-[10px]" : large ? "text-base" : "text-xs"}>{method.brand}</span>
      {!compact && <span className={large ? "text-xs mt-1" : "text-[9px] mt-0.5"}>{method.subBrand}</span>}
    </span>
  );
}
