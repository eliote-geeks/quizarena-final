import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CirclePause, ShieldCheck } from "lucide-react";

export default function DuelPauseOverlay({ pause, online, presenceSent, onConfirm }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!pause?.expiresAt) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [pause?.expiresAt]);
  if (!pause) return null;

  const seconds = pause.expiresAt ? Math.max(0, Math.ceil((pause.expiresAt - now) / 1000)) : null;
  const missing = pause.missingPlayers?.map((player) => player.username).join(" et ");
  const copy = pause.localOnly
    ? "La liaison avec l’arène a été interrompue. Le serveur resynchronise ton duel."
    : pause.reason === "missing_answer"
      ? `${missing || "Un joueur"} n’a pas répondu à la manche. Le duel attend sa confirmation de présence.`
      : pause.reason === "visibility_lost"
        ? "L’écran de jeu a été quitté trop longtemps. La réponse a été annulée et une confirmation est requise."
        : `${missing || "Un joueur"} a perdu la connexion. Le chrono est totalement gelé pour les deux joueurs.`;
  const canConfirm = online && pause.requiresYourConfirmation && !presenceSent;

  return (
    <AnimatePresence>
      <motion.div key="duel-pause" className="fixed inset-0 z-[95] grid place-items-center bg-black/85 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alertdialog" aria-modal="true" aria-label="Duel en pause">
        <motion.section initial={{ opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="w-full max-w-md overflow-hidden rounded-3xl border p-6 text-center" style={{ background: "var(--surface)", borderColor: "var(--accent)" }}>
          <motion.span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }} animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
            <CirclePause className="h-8 w-8" />
          </motion.span>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.18em]" style={{ color: "var(--accent)" }}>Arène sécurisée</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">Duel en pause</h2>
          <p className="mt-4 text-sm leading-6" style={{ color: "var(--text-sub)" }}>{copy}</p>
          {seconds !== null && (
            <div className="mx-auto mt-5 w-fit rounded-full px-4 py-2 text-sm font-extrabold" style={{ background: "var(--surface-2)", color: seconds <= 8 ? "var(--danger)" : "var(--accent)" }}>
              {seconds}s avant décision serveur
            </div>
          )}
          {canConfirm ? (
            <button onClick={onConfirm} className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4">
              <ShieldCheck className="h-5 w-5" />Je suis présent, reprendre
            </button>
          ) : (
            <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl p-4 text-sm font-bold" style={{ background: "var(--surface-2)" }}>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: online ? "var(--accent)" : "var(--danger)" }} />
              {presenceSent ? "Présence confirmée · attente de l’adversaire" : online ? "Attente de la confirmation requise" : "Reconnexion au serveur…"}
            </div>
          )}
          <p className="mt-4 text-xs" style={{ color: "var(--text-faint)" }}>La mise et le score restent verrouillés côté serveur.</p>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}
