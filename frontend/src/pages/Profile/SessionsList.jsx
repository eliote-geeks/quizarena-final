import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Monitor, Smartphone } from "lucide-react";
import * as api from "../../lib/api";
import { formatDateTime } from "../../lib/dateTime";
import { describeBrowser } from "../../lib/browserInfo";

/** Sessions de connexion actives — retour Paul du 31/08 : "affiche aussi
 * les sessions de connexion de l'utilisateur dans son profil". Chaque ligne
 * = un appareil ayant un JWT valide non révoqué (§lib/sessions.ts backend).
 * La session courante ne peut pas s'auto-déconnecter (bouton masqué) : pour
 * ça il y a déjà la déconnexion normale dans le menu. */
export default function SessionsList() {
  const [sessions, setSessions] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  useEffect(() => {
    api.getSessions().then((r) => setSessions(r.sessions || [])).catch(() => setSessions([]));
  }, []);

  const revoke = async (id) => {
    setRevokingId(id);
    try {
      await api.revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session déconnectée");
    } catch (err) {
      toast.error(err.message || "Impossible de déconnecter cette session.");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <section className="card rounded-3xl p-6">
      <h2 className="mb-1 font-display text-2xl font-bold">Sessions de connexion</h2>
      <p className="mb-5 text-xs" style={{ color: "var(--text-faint)" }}>Les appareils actuellement connectés à ton compte.</p>
      {sessions === null ? (
        <p className="text-sm" style={{ color: "var(--text-sub)" }}>Chargement…</p>
      ) : sessions.length ? (
        <div className="space-y-2">
          {sessions.map((s) => {
            const { label, isMobile } = describeBrowser(s.userAgent);
            const Icon = isMobile ? Smartphone : Monitor;
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: "var(--active)" }}>
                <Icon className="h-4 w-4 shrink-0" style={{ color: s.current ? "var(--accent)" : "var(--text-faint)" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {label}
                    {s.current && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider" style={{ background: "var(--accent)", color: "#09080a" }}>Cet appareil</span>}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-faint)" }}>Actif {formatDateTime(s.lastSeenAt)}</p>
                </div>
                {!s.current && (
                  <button
                    onClick={() => revoke(s.id)}
                    disabled={revokingId === s.id}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition hover:opacity-80 disabled:opacity-50"
                    style={{ background: "rgba(255,107,107,.12)", color: "#FF6B6B" }}
                  >
                    {revokingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Déconnecter"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-sub)" }}>Aucune session active.</p>
      )}
    </section>
  );
}
