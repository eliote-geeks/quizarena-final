import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, ShieldCheck } from "lucide-react";
import { SFX } from "../lib/soundEngine";

/**
 * Confirmation avant dépôt/retrait — retour Paul du 31/08 : "après avoir
 * cliqué demande confirmation et dis lui ce qu'il va se passer ensuite".
 * Le message qui suit (§next) doit dire concrètement ce qui arrive après
 * ce clic, pas juste "es-tu sûr ?" — un joueur qui envoie un vrai
 * paiement a besoin de savoir à quoi s'attendre sur son téléphone.
 */
export default function WalletConfirmModal({ open, isDeposit, amountLabel, methodLabel, phone, onCancel, onConfirm }) {
  useEffect(() => { if (open) SFX.modalOpen(); }, [open]);
  const cancel = () => { SFX.cancel(); onCancel?.(); };
  const confirm = () => { SFX.confirm(); onConfirm?.(); };

  const Icon = isDeposit ? ArrowDownToLine : ArrowUpFromLine;
  const next = isDeposit
    ? `Tu vas recevoir une demande de confirmation ${methodLabel} sur le ${phone || "numéro indiqué"}. Valide-la sur ton téléphone : ton solde QuizArena est crédité automatiquement dès que l'opérateur confirme, sans rien recharger.`
    : `Le montant est débité tout de suite de ton solde disponible. Le virement vers ton compte ${methodLabel} (${phone || "numéro indiqué"}) est ensuite traité par l'opérateur ; s'il échoue pour une raison quelconque, le montant est automatiquement recrédité.`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="wallet-confirm-title">
          <motion.section
            initial={{ opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .97 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="w-full max-w-sm overflow-hidden rounded-3xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--divider)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><Icon className="h-6 w-6" /></span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: "var(--success)" }}><ShieldCheck className="h-3.5 w-3.5" /> Paiement sécurisé</span>
            </div>
            <h2 id="wallet-confirm-title" className="mt-6 font-display text-2xl font-extrabold">{isDeposit ? "Confirmer le dépôt" : "Confirmer le retrait"}</h2>
            <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--surface-2)" }}>
              <p className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: "var(--text-sub)" }}>Montant</p>
              <strong className="mt-1 block font-display text-3xl" style={{ color: "var(--accent)" }}>{amountLabel}</strong>
              <p className="mt-1 text-xs" style={{ color: "var(--text-faint)" }}>{methodLabel} · {phone || "numéro non renseigné"}</p>
            </div>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-sub)" }}>{next}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={cancel} className="btn-secondary rounded-xl py-3">Annuler</button>
              <button onClick={confirm} className="btn-primary rounded-xl py-3">Confirmer</button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
