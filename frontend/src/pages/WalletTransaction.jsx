import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, HelpCircle, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import * as api from "../lib/api";
import { formatMoney } from "../lib/currency";
import AuthInput from "../components/AuthInput";
import WalletConfirmModal from "../components/WalletConfirmModal";
import { validateCmPhone, detectCmOperator } from "../lib/cameroonPhone";
import { SFX } from "../lib/soundEngine";

const METHODS = [{ id: "ORANGE_MONEY_CM", label: "Orange Money" }, { id: "MTN_MOMO_CM", label: "MTN MoMo" }];

/**
 * Dépôt et retrait ont chacun leur propre page (retour Paul du 31/08 :
 * "ça doit être comme google aussi quand on clique ça renvoie sur sa
 * page") — avant, les deux partageaient un panneau qui s'ouvrait/fermait
 * en place sur /wallet. Composant partagé + deux exports nommés, même
 * schéma que §PaymentCallback.jsx.
 */
function WalletTransaction({ mode }) {
  const navigate = useNavigate();
  const { currency, refreshWallet } = useApp();
  const isDeposit = mode === "deposit";

  const [summary, setSummary] = useState(null);
  const [amount, setAmount] = useState(1000);
  const [method, setMethod] = useState("ORANGE_MONEY_CM");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => { api.getWallet().then(setSummary).catch(() => {}); }, []);

  const withdrawableCoins = summary?.withdrawableCoins ?? 0;

  // Vérifie et ouvre la confirmation — le vrai débit/appel SharePay
  // n'a lieu qu'après validation dans WalletConfirmModal (retour Paul du
  // 31/08 : "après avoir cliqué demande confirmation... ça ne valide même
  // pas tous les champs ni ne vérifie pas si tout est okay"). Avant, un
  // numéro vide ou mal formé — voire associé au mauvais opérateur — passait
  // sans le moindre contrôle jusqu'à SharePay.
  const askConfirm = () => {
    setError("");
    if (amount < 100 || amount > 500000) { SFX.error(); setError("Le montant doit être compris entre 100 F et 500 000 F."); return; }
    if (!isDeposit && amount > withdrawableCoins) { SFX.error(); setError("Ce montant dépasse ton solde réel retirable. Les crédits bonus ne peuvent pas être retirés."); return; }
    const phoneCheck = validateCmPhone(phone);
    if (!phoneCheck.valid) { SFX.error(); setError(phoneCheck.error); return; }
    const detected = detectCmOperator(phoneCheck.digits);
    if (detected && detected !== method) {
      SFX.error();
      setError(`Ce numéro ressemble à un numéro ${detected === "MTN_MOMO_CM" ? "MTN" : "Orange"} — corrige l'opérateur sélectionné ou vérifie le numéro.`);
      return;
    }
    setConfirming(true);
  };

  const submit = async () => {
    setConfirming(false);
    setBusy(true);
    try {
      const payload = { amountCoins: Number(amount), method, ...(phone ? { phone } : {}) };
      const result = isDeposit ? await api.deposit(payload) : await api.withdraw(payload);
      SFX.cashOut();
      await refreshWallet();
      navigate("/wallet", {
        state: {
          walletMessage: result.transaction?.status === "PENDING"
            ? "Demande envoyée. Confirme l’opération sur ton téléphone."
            : "Opération enregistrée avec succès.",
        },
      });
    } catch (err) {
      SFX.error();
      setError(err.message || "L’opération a échoué");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-xl mx-auto">
      <button onClick={() => navigate("/wallet")} className="btn-ghost inline-flex items-center gap-2 text-xs">
        <X className="h-4 w-4" />Retour au portefeuille
      </button>

      <header className="mt-6 flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
          {isDeposit ? <ArrowDownToLine className="h-5 w-5" /> : <ArrowUpFromLine className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>{isDeposit ? "Ajouter des fonds" : "Demande de retrait"}</p>
          <h1 className="font-display text-3xl font-extrabold">{isDeposit ? "Nouveau dépôt" : "Retirer tes gains"}</h1>
        </div>
      </header>

      {!isDeposit && (
        <p className="mt-4 text-xs" style={{ color: "var(--text-sub)" }}>
          Solde réel retirable : <strong style={{ color: "var(--success)" }}>{formatMoney(withdrawableCoins, currency)}</strong>
        </p>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }} className="card mt-6 rounded-3xl p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthInput type="number" label="Montant (FCFA)" value={amount} onChange={(v) => setAmount(Number(v) || 0)} min="100" max="500000" inputMode="numeric" />
          <div className="qa-gfield">
            <select value={method} onChange={(event) => setMethod(event.target.value)} className="qa-ginput appearance-none">
              {METHODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <label className="qa-glabel" style={{ top: 0, fontSize: ".72rem", transform: "translateY(-50%)" }}>Opérateur de paiement</label>
          </div>
        </div>

        <AuthInput
          className="mt-4"
          type="tel"
          label={`Numéro ${METHODS.find((item) => item.id === method)?.label || "de paiement"}`}
          value={phone}
          onChange={(v) => setPhone(v.replace(/[^0-9+ ]/g, ""))}
          placeholder="Ex. 6 90 12 34 56"
          inputMode="tel"
          autoComplete="tel"
        />
        <p className="mt-3 text-xs" style={{ color: "var(--text-sub)" }}>
          Saisis le numéro {METHODS.find((item) => item.id === method)?.label} à utiliser pour cette opération. Aucun numéro n’est prérempli.
        </p>

        {error && <p className="mt-3 text-xs font-semibold" style={{ color: "var(--danger)" }}>{error}</p>}

        {isDeposit && (
          <div className="mt-5 rounded-2xl border" style={{ borderColor: "var(--divider)" }}>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-xs font-bold"
              style={{ color: "var(--text-sub)" }}
            >
              <HelpCircle className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
              <span className="flex-1">Tu ne reçois rien sur ton téléphone ?</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform" style={{ transform: showHelp ? "rotate(180deg)" : "none" }} />
            </button>
            {showHelp && (
              <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
                <HelpCard operator="MTN Mobile Money" steps={[
                  "Compose *126# depuis le téléphone qui possède ce numéro.",
                  "Ouvre la demande de paiement en attente dans le menu.",
                  "Entre ton code secret MoMo pour valider.",
                ]} />
                <HelpCard operator="Orange Money" steps={[
                  "Compose #150# depuis le téléphone qui possède ce numéro.",
                  "Confirme la demande de paiement Orange Money affichée.",
                  "Entre ton code secret à 4 chiffres pour valider.",
                ]} />
                <p className="sm:col-span-2 text-[11px] leading-relaxed" style={{ color: "var(--text-faint)" }}>
                  Toujours rien après quelques minutes ? Vérifie que le téléphone capte le réseau et que c'est bien la ligne enregistrée pour le Mobile Money, puis contacte <span style={{ color: "var(--text-sub)" }}>support@quizarenaworld.com</span>.
                </p>
              </div>
            )}
          </div>
        )}

        <button disabled={busy} onClick={askConfirm} className="btn-primary mt-6 w-full rounded-xl py-3.5 font-bold disabled:opacity-50">
          {busy ? "Traitement sécurisé…" : `Confirmer ${formatMoney(amount, currency)}`}
        </button>
      </motion.div>

      <WalletConfirmModal
        open={confirming}
        isDeposit={isDeposit}
        amountLabel={formatMoney(amount, currency)}
        methodLabel={METHODS.find((item) => item.id === method)?.label || "Mobile Money"}
        phone={phone}
        onCancel={() => setConfirming(false)}
        onConfirm={submit}
      />
    </div>
  );
}

function HelpCard({ operator, steps }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--surface-2)" }}>
      <p className="text-xs font-bold" style={{ color: "var(--text)" }}>{operator}</p>
      <ol className="mt-2 space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-[11px] leading-relaxed" style={{ color: "var(--text-sub)" }}>
            <span className="shrink-0 font-bold" style={{ color: "var(--accent)" }}>{i + 1}.</span>{step}
          </li>
        ))}
      </ol>
    </div>
  );
}

export const WalletDeposit = () => <WalletTransaction mode="deposit" />;
export const WalletWithdraw = () => <WalletTransaction mode="withdraw" />;
