import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Share2, X } from "lucide-react";
import { SFX } from "../../lib/soundEngine";

/* ─── Modal de partage de lien professionnel ─── */
export default function ShareModal({ link, open, user, onClose }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (open) SFX.modalOpen(); }, [open]);
  const dismiss = () => { SFX.cancel(); onClose?.(); };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      SFX.copy();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papier refusé (contexte non sécurisé, permission) : on
      // sélectionne le lien pour un Ctrl+C manuel — pas un succès, donc
      // pas le son de succès.
      document.getElementById("qa-share-link-input")?.select();
      SFX.error();
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share === "function") {
      await navigator.share({
        title: "Défi QuizArena",
        text: `${user?.name || "Un joueur"} te défie sur QuizArena`,
        url: link,
      }).catch(() => {});
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)" }}
            onClick={dismiss}
          />
          <motion.div
            className="relative w-full max-w-sm rounded-3xl p-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border-md)" }}
            initial={{ y: 48, opacity: 0, scale: .96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 48, opacity: 0, scale: .96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <button
              onClick={dismiss}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full transition"
              style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>
              Partager le défi
            </p>
            <h3 className="font-display text-xl font-extrabold mb-5">
              Envoie ce lien à ton adversaire
            </h3>

            {/* Lien affiché */}
            <div className="rounded-2xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>
                Lien d'invitation
              </p>
              <input
                id="qa-share-link-input"
                readOnly
                value={link}
                className="w-full bg-transparent text-xs outline-none font-mono"
                style={{ color: "var(--text)" }}
                onClick={(e) => e.target.select()}
              />
            </div>

            {/* Bouton copier */}
            <motion.button
              onClick={handleCopy}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold transition-colors"
              style={{
                background: copied ? "rgba(16,185,129,.15)" : "var(--accent)",
                color: copied ? "var(--success)" : "#000",
                border: copied ? "1px solid var(--success)" : "1px solid transparent",
              }}
              animate={copied ? { scale: [1, 1.03, 1] } : {}}
              transition={{ duration: .25 }}
            >
              {copied ? <><Check className="h-4 w-4" />Lien copié</> : <><Copy className="h-4 w-4" />Copier le lien</>}
            </motion.button>

            {/* Partage natif — affiché seulement si l'API est disponible */}
            {typeof navigator.share === "function" && (
              <button
                onClick={handleNativeShare}
                className="btn-secondary mt-2 w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold"
              >
                <Share2 className="h-4 w-4" />Partager via…
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
