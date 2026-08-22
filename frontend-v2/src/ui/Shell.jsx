import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Avatar, Money } from "./index";
import { NavIcon } from "./icons";
import AmbientMusic from "./AmbientMusic";
import * as music from "../lib/musicEngine";
import { useAuth } from "../context/AuthContext";

/* ══════════════════════════════════════════════════════════════════
   Chrome d'application. Sidebar latérale sur desktop (DESIGN.md §8
   révisé 19/08 : « c'est une plateforme de jeu », pas un site — les
   plateformes de jeu (Discord, Steam, clients esport) ont une colonne
   persistante, pas une barre du haut), barre du bas sur mobile.
   ══════════════════════════════════════════════════════════════════ */

// Catégories retiré de la nav persistante (14/08) : les duels n'en ont
// plus besoin (questions mélangées) et le solo y accède déjà depuis le
// bouton "Solo" du Lobby. L'écran /categories existe toujours.
//
// "Duels ouverts" ajouté à la nav le 20/08 (retour direct de Paul :
// "on doit voir le lien de cette page sur la sidebar" — avant, seul un
// petit lien texte au fond de DuelSetup.jsx y menait). La sidebar
// affiche tout NAV sans troncature ; la barre du bas mobile n'a de la
// place que pour 6 — `mobile: false` sur VIP (page la moins urgente,
// "bientôt disponible") lui laisse la place plutôt que de tronquer
// bêtement au 6e élément du tableau.
const NAV = [
  { to: "/", label: "Jouer", end: true, icon: "home" },
  { to: "/tournaments", label: "Tournois", icon: "trophy" },
  { to: "/duels-ouverts", label: "Duels ouverts", icon: "megaphone" },
  { to: "/players", label: "Joueurs", icon: "users", mobile: false },
  { to: "/clans", label: "Clans", icon: "shield", mobile: false },
  { to: "/leaderboard", label: "Classement", icon: "chart" },
  { to: "/wallet", label: "Portefeuille", icon: "wallet" },
  { to: "/profile", label: "Profil", icon: "user" },
];

// Cinq entrées directes restent réellement lisibles sur un téléphone.
// Les autres destinations ne disparaissent plus : elles vivent dans le
// panneau « Plus », au lieu d'être masquées ou tronquées dans la barre.
const MOBILE_PRIMARY = [
  { to: "/", label: "Jouer", end: true, icon: "home" },
  { to: "/duels-ouverts", label: "Duels", icon: "megaphone" },
  { to: "/tournaments", label: "Tournois", icon: "trophy" },
  { to: "/clans", label: "Clans", icon: "shield" },
];

const MOBILE_MORE = [
  { to: "/players", label: "Joueurs", icon: "users" },
  { to: "/leaderboard", label: "Classement", icon: "chart" },
  { to: "/wallet", label: "Portefeuille", icon: "wallet" },
  { to: "/profile", label: "Mon profil", icon: "user" },
  { to: "/categories", label: "Catégories", icon: "home" },
  { to: "/clan-wars", label: "Guerres de clans", icon: "swords" },
];

export default function Shell({ children }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const needsBack = ["/categories", "/clan-wars", "/leaderboard", "/players", "/profile", "/replays", "/tournaments"].includes(pathname);
  return (
    <div className="grain flex min-h-dvh flex-col sm:flex-row">
      <AmbientMusic />
      <SidebarNav />
      <div className="fixed top-4 right-4 z-40 sm:hidden">
        <MuteButton />
      </div>
      {/* La clé sur le chemin force un remontage à chaque navigation —
          l'animation d'entrée (anim-rise) rejoue à chaque écran. */}
      <div
        key={pathname}
        className="anim-rise min-w-0 flex-1 sm:pb-0"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {needsBack && <div className="px-5 pt-4 sm:px-8"><button onClick={() => nav(-1)} className="t-label rounded-lg border border-ink-5 bg-ink-2/80 px-3 py-2 text-[11px] text-bone-4 backdrop-blur hover:border-flare/30 hover:text-flare">← retour</button></div>}
        {children}
      </div>
      <BottomBar />
    </div>
  );
}

/** Coupe/réactive le fond sonore de navigation (§AmbientMusic.jsx) —
 * visible partout, contrairement à l'ancienne musique de la v1 dont le
 * bouton mute ne coupait en réalité rien (leçon du projet). */
function MuteButton() {
  const [muted, setMutedState] = useState(music.isMuted());
  const toggle = () => {
    const next = !muted;
    music.setMuted(next);
    setMutedState(next);
  };
  return (
    <button
      onClick={toggle}
      aria-label={muted ? "Réactiver la musique" : "Couper la musique"}
      className="press flex h-9 w-9 items-center justify-center rounded-(--radius-tag) bg-ink-3 text-bone-3 hover:bg-ink-4 hover:text-bone"
    >
      <NavIcon type={muted ? "speakerMuted" : "speaker"} className="h-4 w-4" />
    </button>
  );
}

function SidebarNav() {
  const { user, balanceCoins, logout } = useAuth();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r-2 border-ink-4 bg-ink-2 sm:flex">
      <div className="flex items-center justify-between px-5 pt-7 pb-6">
        <Link to="/" className="t-display text-lg text-flare">
          QuizArena
        </Link>
        <MuteButton />
      </div>

      <Link to="/wallet" className="press mx-3 mb-6 rounded-(--radius-card) bg-ink-3 px-4 py-4 hover:bg-ink-4">
        <span className="t-label mb-2 block text-bone-4">solde</span>
        <Money value={balanceCoins} size="md" tone="flare" />
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                "t-label flex items-center gap-3 rounded-(--radius-tag) px-3 py-3 transition-colors",
                isActive ? "bg-flare/15 text-flare" : "text-bone-3 hover:bg-ink-3 hover:text-bone"
              )
            }
          >
            {({ isActive }) => (
              <>
                <NavIcon type={item.icon} className={clsx("h-5 w-5 shrink-0", isActive ? "text-flare" : "text-bone-4")} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}

        {/* Lien Admin — visible uniquement pour les comptes isAdmin */}
        {user?.isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              clsx(
                "t-label mt-2 flex items-center gap-3 rounded-(--radius-tag) px-3 py-3 transition-colors",
                "border border-flare/20",
                isActive ? "bg-flare/15 text-flare" : "text-flare/70 hover:bg-flare/10 hover:text-flare"
              )
            }
          >
            {({ isActive }) => (
              <>
                <NavIcon type="crown" className={clsx("h-5 w-5 shrink-0", isActive ? "text-flare" : "text-flare/60")} />
                Admin
              </>
            )}
          </NavLink>
        )}
      </nav>

      <div className="flex items-center gap-3 border-t-2 border-ink-4 px-4 py-5">
        <Avatar name={user?.username ?? "?"} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="t-title truncate text-sm">{user?.username ?? "—"}</div>
          <button onClick={logout} className="t-label text-bone-4 hover:text-flare">
            déconnexion
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 px-5 pb-2">
        <Link to="/terms" className="t-label text-bone-4 hover:text-flare">
          cgu
        </Link>
        <Link to="/privacy" className="t-label text-bone-4 hover:text-flare">
          confidentialité
        </Link>
      </div>
      {/* Attribution requise par les licences Creative Commons des
          morceaux de §musicEngine.js — musique de Kevin MacLeod
          (incompetech.com), pas composée pour le projet. */}
      <p className="px-5 pb-6 text-[10px] leading-snug text-bone-4/70">
        Musique : Kevin MacLeod (incompetech.com), licences{" "}
        <a
          href="https://creativecommons.org/licenses/by/3.0/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-flare"
        >
          CC BY 3.0
        </a>
        {" / "}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline hover:text-flare">CC BY 4.0</a>
        .
      </p>
    </aside>
  );
}

function BottomBar() {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-[9890] sm:hidden" role="presentation">
          <button className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" aria-label="Fermer le menu" onClick={() => setMoreOpen(false)} />
          <section
            className="absolute inset-x-3 rounded-2xl border border-ink-5 bg-ink-2 p-4 shadow-2xl"
            style={{ bottom: "calc(4.6rem + env(safe-area-inset-bottom, 0px))" }}
            aria-label="Navigation supplémentaire"
          >
            <div className="mb-3 flex items-center justify-between">
              <div><span className="t-label text-flare">navigation</span><h2 className="t-title mt-1 text-lg">Toutes les sections</h2></div>
              <button onClick={() => setMoreOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-4 text-bone-3" aria-label="Fermer">×</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_MORE.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => clsx("flex min-h-14 items-center gap-3 rounded-xl border px-3 py-3", isActive ? "border-flare/40 bg-flare/10 text-flare" : "border-ink-5 bg-ink-3 text-bone-2")}
                >
                  <NavIcon type={item.icon} className="h-5 w-5 shrink-0" />
                  <span className="text-xs font-semibold leading-tight">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </section>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-[9900] border-t border-ink-5 bg-ink/95 shadow-[0_-12px_30px_rgba(0,0,0,.35)] backdrop-blur-xl sm:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} aria-label="Navigation principale">
        <div className="grid min-h-16 grid-cols-5 items-stretch">
          {MOBILE_PRIMARY.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) => clsx("press relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2", isActive ? "text-flare" : "text-bone-4")}
            >
              {({ isActive }) => (
                <>
                  <span className={clsx("absolute inset-x-5 top-0 h-0.5 rounded-full", isActive && "bg-flare")} />
                  <NavIcon type={item.icon} className="h-5 w-5 shrink-0" />
                  <span className="text-center text-[9px] font-semibold leading-none">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={clsx("press relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2", moreOpen || moreActive ? "text-flare" : "text-bone-4")}
            aria-expanded={moreOpen}
            aria-label="Afficher toutes les sections"
          >
            <span className={clsx("absolute inset-x-5 top-0 h-0.5 rounded-full", (moreOpen || moreActive) && "bg-flare")} />
            <NavIcon type="more" className="h-5 w-5" />
            <span className="text-[9px] font-semibold leading-none">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}
