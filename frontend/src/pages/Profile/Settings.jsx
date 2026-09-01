import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Bell, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import AuthInput from "../../components/AuthInput";
import NotificationBlockedModal from "../../components/NotificationBlockedModal";
import * as api from "../../lib/api";
import * as push from "../../lib/push";

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,24}$/;

/** Paramètres du compte — e-mail, téléphone, région, mot de passe,
 * notifications push. Chaque bloc a son propre état de sauvegarde : rien
 * ne dépend d'un submit global, une modif n'affecte jamais les autres. */
export default function Settings({ user, refreshSession }) {
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [region, setRegion] = useState(user?.region || "");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushBlocked, setPushBlocked] = useState(false);
  useEffect(() => { push.getSubscription().then((s) => setPushEnabled(Boolean(s))).catch(() => {}); }, []);

  useEffect(() => { setUsername(user?.username || ""); setEmail(user?.email || ""); setPhone(user?.phone || ""); setRegion(user?.region || ""); }, [user]);

  const infoChanged = username !== (user?.username || "") || email !== (user?.email || "") || phone !== (user?.phone || "") || region !== (user?.region || "");

  const saveInfo = async (e) => {
    e.preventDefault();
    setInfoError("");
    if (!USERNAME_RE.test(username)) { setInfoError("Le pseudo doit faire 3 à 24 caractères : lettres, chiffres, _ et . uniquement."); return; }
    setSavingInfo(true);
    try {
      await api.updateProfile({ username: username.trim(), email: email.trim() || undefined, phone: phone.trim(), region: region.trim() || undefined });
      await refreshSession();
      toast.success("Profil mis à jour");
    } catch (err) {
      setInfoError(err.message || "Impossible d'enregistrer ces modifications.");
    } finally {
      setSavingInfo(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword.length < 8) { setPasswordError("Min. 8 caractères."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Les mots de passe ne correspondent pas."); return; }
    setSavingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast.success("Mot de passe mis à jour");
    } catch (err) {
      setPasswordError(err.message || "Mot de passe actuel incorrect.");
    } finally {
      setSavingPassword(false);
    }
  };

  const togglePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (pushEnabled) { await push.unsubscribe(); setPushEnabled(false); }
      else { await push.subscribe(); setPushEnabled(true); toast.success("Notifications activées"); }
    } catch (err) {
      if (err.message === "Permission refusée" && push.getPermission() === "denied") setPushBlocked(true);
      else toast.error(err.message === "Permission refusée" ? "Autorise les notifications pour continuer" : "Notifications indisponibles sur cet appareil");
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <section className="card rounded-3xl p-6">
      <h2 className="mb-5 font-display text-2xl font-bold">Paramètres du compte</h2>

      {user?.email && !user?.emailVerified && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl p-3.5" style={{ background: "rgba(255,107,107,.08)", border: "1px solid rgba(255,107,107,.25)" }}>
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#FF6B6B" }} />
          <p className="flex-1 text-xs font-medium" style={{ color: "var(--text-sub)" }}>Ton adresse e-mail n'est pas encore vérifiée.</p>
          <a href="/verify-email" className="shrink-0 text-xs font-bold hover:underline" style={{ color: "var(--accent)" }}>Vérifier</a>
        </div>
      )}

      <form onSubmit={saveInfo} className="space-y-3">
        <div>
          <AuthInput type="text" label="Pseudo" value={username} onChange={setUsername} placeholder="ton_pseudo" />
          <span className="mt-1 block text-[11px]" style={{ color: "var(--text-faint)" }}>Visible de tous, utilisé pour te défier et te retrouver au classement.</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <AuthInput type="email" label="Adresse e-mail" value={email} onChange={setEmail} placeholder="ton@email.com" />
          <AuthInput type="tel" label="Téléphone" value={phone} onChange={setPhone} />
        </div>
        <AuthInput type="text" label="Région" value={region} onChange={setRegion} placeholder="Ex : Littoral" />
        {infoError && <p className="text-xs font-semibold" style={{ color: "#FF6B6B" }}>{infoError}</p>}
        <button type="submit" disabled={!infoChanged || savingInfo} className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-40">
          {savingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Enregistrer
        </button>
      </form>

      <div className="my-6 h-px" style={{ background: "var(--divider)" }} />

      <form onSubmit={savePassword} className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Changer le mot de passe</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <AuthInput type={showPw ? "text" : "password"} label="Mot de passe actuel" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" trailing={<EyeToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />} />
          <AuthInput type={showPw ? "text" : "password"} label="Nouveau mot de passe" value={newPassword} onChange={setNewPassword} autoComplete="new-password" trailing={<EyeToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />} />
          <AuthInput type={showPw ? "text" : "password"} label="Confirmer" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" trailing={<EyeToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />} />
        </div>
        {passwordError && <p className="text-xs font-semibold" style={{ color: "#FF6B6B" }}>{passwordError}</p>}
        <button type="submit" disabled={!currentPassword || !newPassword || savingPassword} className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-40">
          {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mettre à jour"}
        </button>
      </form>

      {push.isPushSupported() && (
        <>
          <div className="my-6 h-px" style={{ background: "var(--divider)" }} />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4" style={{ color: pushEnabled ? "var(--accent)" : "var(--text-faint)" }} />
              <div>
                <p className="text-sm font-bold">Notifications push</p>
                <p className="text-xs" style={{ color: "var(--text-faint)" }}>Défis reçus, résultats de duel</p>
              </div>
            </div>
            <button
              onClick={togglePush}
              disabled={pushBusy}
              className="rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-50"
              style={{ background: pushEnabled ? "var(--accent)" : "var(--active)", color: pushEnabled ? "#09080a" : "var(--text-sub)" }}
            >
              {pushEnabled ? "Activées" : "Désactivées"}
            </button>
          </div>
        </>
      )}
      <NotificationBlockedModal open={pushBlocked} onClose={() => setPushBlocked(false)} />
    </section>
  );
}

function EyeToggle({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle} className="transition hover:opacity-80" style={{ color: "var(--text-faint)" }} tabIndex={-1}>
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
