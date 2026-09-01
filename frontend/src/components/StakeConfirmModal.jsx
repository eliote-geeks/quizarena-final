import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, Swords } from "lucide-react";
import { SFX } from "../lib/soundEngine";

export default function StakeConfirmModal({ open, title = "Confirmer la mise", amount, message, confirmLabel = "Confirmer", onCancel, onConfirm, zIndex = 90 }) {
  // Tout ce qui engage une mise s'annonce : ouverture, validation, abandon.
  useEffect(() => { if (open) SFX.modalOpen(); }, [open]);
  const cancel = () => { SFX.cancel(); onCancel?.(); };
  const confirm = () => { SFX.confirm(); onConfirm?.(); };

  return <AnimatePresence>{open && <motion.div className="fixed inset-0 grid place-items-center bg-black/75 p-4" style={{ zIndex }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="stake-confirm-title">
    <motion.section initial={{ opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .97 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} className="w-full max-w-sm overflow-hidden rounded-3xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--divider)" }}>
      <div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><Swords className="h-6 w-6" /></span><span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: "var(--success)" }}><ShieldCheck className="h-3.5 w-3.5" /> Vérifié serveur</span></div>
      <h2 id="stake-confirm-title" className="mt-6 font-display text-2xl font-extrabold">{title}</h2>
      {amount && <div className="mt-4 rounded-2xl p-4" style={{ background: "var(--surface-2)" }}><p className="text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: "var(--text-sub)" }}>Mise</p><strong className="mt-1 block font-display text-3xl" style={{ color: "var(--accent)" }}>{amount}</strong></div>}
      <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-sub)" }}>{message}</p>
      <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={cancel} className="btn-secondary rounded-xl py-3">Annuler</button><button onClick={confirm} className="btn-primary rounded-xl py-3">{confirmLabel}</button></div>
    </motion.section>
  </motion.div>}</AnimatePresence>;
}
