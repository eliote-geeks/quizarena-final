import { useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import AnimeAvatar from "../../components/AnimeAvatar";
import * as api from "../../lib/api";

/** Photo de profil : clic sur le petit appareil photo, upload direct — pas
 * d'étape de recadrage/validation manuelle, la contrainte de taille/format
 * est déjà côté serveur (§lib/uploads.ts backend). */
export default function AvatarUpload({ user, refreshSession }) {
  const [uploading, setUploading] = useState(false);

  const pick = () => document.getElementById("qa-avatar-input")?.click();

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de reprendre le même fichier plus tard si l'upload échoue
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadAvatar(file);
      await refreshSession();
      toast.success("Photo de profil mise à jour");
    } catch (err) {
      toast.error(err.message || "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <AnimeAvatar seed={user?.username || user?.name} src={user?.avatarUrl} alt="Votre avatar" size={80} className="border" />
      <input id="qa-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} hidden />
      <button
        onClick={pick}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 transition hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--accent)", color: "#09080a", borderColor: "var(--surface)" }}
        aria-label="Changer la photo de profil"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
