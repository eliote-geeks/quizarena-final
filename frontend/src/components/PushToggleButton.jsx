import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import * as push from "../lib/push";
import NotificationBlockedModal from "./NotificationBlockedModal";

/**
 * Bouton d'activation des notifications — réutilisé partout où il doit
 * être visible d'un coup d'œil (retour Paul du 31/08 : "n'est pas visible
 * sur mobile", "doit bien être mis en évidence car c'est important").
 * Avant, la seule entrée sur mobile était une ligne dans le menu profil
 * déroulant — jamais vue sans l'ouvrir. Ici : icône autonome, fond plein
 * amber tant que ce n'est PAS activé pour vraiment attirer l'œil (l'état
 * "à faire" doit ressortir, pas l'état "déjà fait").
 */
export default function PushToggleButton({ className = "" }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);

  useEffect(() => {
    push.getSubscription().then((s) => setEnabled(Boolean(s))).catch(() => {});
  }, []);

  if (!push.isPushSupported()) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (enabled) {
        await push.unsubscribe();
        setEnabled(false);
      } else {
        await push.subscribe();
        setEnabled(true);
        toast.success("Notifications activées");
      }
    } catch (err) {
      // "Permission refusée" ET déjà "denied" : le navigateur ne
      // redemandera plus jamais tout seul — guide pas à pas plutôt qu'un
      // toast qui renvoie vers "les réglages" sans dire lesquels (retour
      // Paul du 31/08 : "les utilisateurs ne pourront pas activer ça
      // eux-mêmes").
      if (err.message === "Permission refusée" && push.getPermission() === "denied") setShowBlocked(true);
      else toast.error(err.message === "Permission refusée" ? "Autorise les notifications pour continuer" : "Notifications indisponibles sur cet appareil");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={toggle}
        disabled={busy}
        className={`grid place-items-center rounded-full transition disabled:opacity-50 ${className}`}
        style={{
          background: enabled ? "var(--surface)" : "var(--accent)",
          color: enabled ? "var(--accent)" : "var(--accent-fg)",
          border: enabled ? "1px solid var(--border)" : "none",
        }}
        title={enabled ? "Désactiver les notifications" : "Activer les notifications"}
        aria-label={enabled ? "Désactiver les notifications" : "Activer les notifications"}
      >
        {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      </button>
      <NotificationBlockedModal open={showBlocked} onClose={() => setShowBlocked(false)} />
    </>
  );
}
