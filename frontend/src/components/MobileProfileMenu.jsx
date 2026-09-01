import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Moon, Music, Music2, Sun, User } from "lucide-react";
import { useApp } from "../context/AppContext";
import AnimeAvatar from "./AnimeAvatar";
import { runWithDuelExitGuard } from "../lib/duelNavigation";
import * as music from "../lib/musicEngine";

/**
 * Accès au profil sur mobile — absent jusqu'ici (30/08/2026).
 *
 * Sur desktop, le profil, le thème, la musique et la déconnexion vivent
 * tous dans le bloc utilisateur en bas de la Sidebar (§Sidebar.jsx). Cette
 * Sidebar est masquée sur mobile (`hidden lg:flex`), et rien ne la
 * remplaçait : aucun moyen d'atteindre son profil, de couper la musique ou
 * de se déconnecter depuis un téléphone. Ce menu reproduit ce même bloc,
 * ancré sous l'avatar de la barre du haut.
 *
 * Les notifications push ont leur propre icône autonome dans la barre du
 * haut (§Layout.jsx PushToggleButton) depuis le 31/08 — plus dans ce menu
 * déroulant : enterré ici, personne ne le voyait (retour Paul).
 */
export default function MobileProfileMenu() {
  const { user, theme, toggleTheme, logout } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [musicMuted, setMusicMuted] = useState(music.isMuted());
  const containerRef = useRef(null);

  useEffect(() => music.subscribe((s) => setMusicMuted(s.muted)), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const go = (path, label) => {
    setOpen(false);
    runWithDuelExitGuard(() => navigate(path), label);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-full transition"
        style={{ border: "1px solid var(--border)" }}
        aria-label="Menu profil"
        aria-expanded={open}
      >
        <AnimeAvatar seed={user?.username || user?.name} src={user?.avatarUrl} alt="" size={32} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: .96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: .96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border-md)" }}
          >
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--divider)" }}>
              <AnimeAvatar seed={user?.username || user?.name} src={user?.avatarUrl} alt="" size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>{user?.name || "Invité"}</p>
                <p className="truncate text-xs" style={{ color: "var(--text-faint)" }}>{user?.email || "Compte local"}</p>
              </div>
            </div>

            <button
              onClick={() => go("/profile", "le profil")}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition"
              style={{ color: "var(--text)" }}
            >
              <User className="h-4 w-4" style={{ color: "var(--text-faint)" }} />Voir mon profil
            </button>

            <button
              onClick={() => { toggleTheme(); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition"
              style={{ color: "var(--text)" }}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" style={{ color: "var(--text-faint)" }} /> : <Moon className="h-4 w-4" style={{ color: "var(--text-faint)" }} />}
              {theme === "dark" ? "Mode clair" : "Mode sombre"}
            </button>

            <button
              onClick={() => setMusicMuted(music.toggleMute())}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition"
              style={{ color: "var(--text)" }}
            >
              {musicMuted ? <Music2 className="h-4 w-4" style={{ color: "var(--text-faint)" }} /> : <Music className="h-4 w-4" style={{ color: "var(--accent)" }} />}
              {musicMuted ? "Activer la musique" : "Couper la musique"}
            </button>

            <button
              onClick={() => go("/wallet", "le portefeuille")}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition"
              style={{ color: "var(--text)", borderTop: "1px solid var(--divider)" }}
            >
              Portefeuille
            </button>

            <button
              onClick={() => { setOpen(false); runWithDuelExitGuard(() => { logout(); navigate("/login"); }, "la déconnexion"); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition"
              style={{ color: "var(--danger)", borderTop: "1px solid var(--divider)" }}
            >
              <LogOut className="h-4 w-4" />Se déconnecter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
