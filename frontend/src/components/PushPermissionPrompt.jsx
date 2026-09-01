import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import * as push from "../lib/push";

const SNOOZE_KEY = "qa_push_snoozed_session";

/**
 * Notifications push présentées d'office, pas cachées dans un réglage
 * (retour Paul du 31/08 : "c'est primordial" puis "toujours demander leur
 * activation... peut-être même obligé"). Redemande à CHAQUE session tant
 * que ce n'est pas activé — "Plus tard" ne le tait que pour l'onglet en
 * cours (sessionStorage, pas localStorage) : au prochain chargement de
 * l'app, ça redemande. Se tait pour de bon seulement une fois activé, ou
 * après un vrai refus navigateur (qu'on ne peut de toute façon plus
 * re-proposer soi-même).
 */
export default function PushPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!push.isPushSupported()) return;
    if (push.getPermission() !== "default") return;
    if (sessionStorage.getItem(SNOOZE_KEY)) return;
    push.getSubscription().then((sub) => {
      if (!sub) setShow(true);
    }).catch(() => {});
  }, []);

  const activate = async () => {
    setBusy(true);
    try {
      await push.subscribe();
      setShow(false);
      toast.success("Notifications activées");
    } catch {
      // Permission refusée ou indisponible : on ne réessaiera plus tout
      // seul, le bouton reste dans Profil/menu pour un essai plus tard.
      setShow(false);
    } finally {
      setBusy(false);
    }
  };

  const later = () => {
    sessionStorage.setItem(SNOOZE_KEY, "1");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md rounded-2xl p-4 lg:bottom-6 lg:left-6 lg:right-auto"
          style={{ background: "var(--surface)", border: "1px solid var(--border-md)", boxShadow: "0 20px 40px -16px rgba(0,0,0,.5)" }}
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <Bell className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Ne rate plus un défi</p>
              <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--text-sub)" }}>
                Active les notifications pour être prévenu dès qu'on te défie ou qu'un duel se termine.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={activate}
                  disabled={busy}
                  className="btn-primary rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
                >
                  {busy ? "…" : "Activer"}
                </button>
                <button onClick={later} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ color: "var(--text-faint)" }}>
                  Plus tard
                </button>
              </div>
            </div>
            <button onClick={later} className="shrink-0 rounded-lg p-1 transition hover:opacity-70" style={{ color: "var(--text-faint)" }} aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
