import clsx from "clsx";

/* ══════════════════════════════════════════════════════════════════
   Icônes de catégorie — formes SVG simples dessinées à la main, pas de
   librairie d'icônes (budget perf, DESIGN.md). Même vocabulaire que
   les pastilles construites sur le Figma de référence.
   `fill="currentColor"` : hérite la couleur du texte du parent.
   ══════════════════════════════════════════════════════════════════ */

const ICON_BY_TYPE = {
  football: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="15" cy="15" r="2" fill="var(--color-ink-3)" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <rect x="11" y="16" width="2" height="4" />
      <rect x="7.5" y="20" width="9" height="1.5" />
    </>
  ),
  landmark: (
    <>
      <polygon points="12,3 21,9 3,9" />
      <rect x="5" y="10.5" width="2.4" height="7" />
      <rect x="10.8" y="10.5" width="2.4" height="7" />
      <rect x="16.6" y="10.5" width="2.4" height="7" />
      <rect x="3.5" y="18.5" width="17" height="2" />
    </>
  ),
  houses: (
    <>
      <polygon points="12,3 21,10 3,10" />
      <rect x="5.5" y="10" width="13" height="10" />
      <rect x="10.5" y="14.5" width="3" height="5.5" fill="var(--color-ink-3)" />
    </>
  ),
  bowl: (
    <>
      <path d="M3 13a9 9 0 0 0 18 0z" />
      <rect x="8" y="4" width="1.6" height="5" />
      <rect x="11.2" y="2.5" width="1.6" height="6.5" />
      <rect x="14.4" y="4.5" width="1.6" height="4.5" />
    </>
  ),
  gradcap: (
    <>
      <polygon points="12,4 22,9.5 12,15 2,9.5" />
      <rect x="17.2" y="9.5" width="1.6" height="7" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="11.1" y="3" width="1.8" height="18" />
      <rect x="3" y="11.1" width="18" height="1.8" />
    </>
  ),
  flask: (
    <>
      <rect x="10.2" y="2.5" width="3.6" height="5" />
      <polygon points="10.2,7.5 13.8,7.5 20,21 4,21" />
    </>
  ),
  trophy: (
    <>
      <polygon points="7,3 17,3 15.5,15 8.5,15" />
      <circle cx="4.5" cy="6" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="19.5" cy="6" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10.5" y="15" width="3" height="4" />
      <rect x="7" y="19.5" width="10" height="2" />
    </>
  ),
  pawprint: (
    <>
      <ellipse cx="12" cy="16" rx="7" ry="5.5" />
      <circle cx="4.5" cy="9" r="2.6" />
      <circle cx="9.5" cy="4.5" r="2.6" />
      <circle cx="14.5" cy="4.5" r="2.6" />
      <circle cx="19.5" cy="9" r="2.6" />
    </>
  ),
  clapper: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="1.5" />
      <rect x="3" y="3" width="18" height="5.5" rx="1.5" />
      <rect x="7" y="3" width="2.2" height="5.5" fill="var(--color-ink-3)" />
      <rect x="14" y="3" width="2.2" height="5.5" fill="var(--color-ink-3)" />
    </>
  ),
  musicnote: (
    <>
      <ellipse cx="7" cy="18" rx="4" ry="3" />
      <rect x="10" y="3" width="1.8" height="15.5" />
      <polygon points="11.8,3 18,5.2 18,9 11.8,7" />
    </>
  ),
  star: <polygon points="12,2.5 14.9,9.2 22.3,9.9 16.7,14.8 18.4,22 12,18.1 5.6,22 7.3,14.8 1.7,9.9 9.1,9.2" />,
  laptop: (
    <>
      <rect x="4" y="4.5" width="16" height="11" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="2" y="17.5" width="20" height="2.2" rx="1.1" />
    </>
  ),
  leaf: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="6.5" />
      <rect x="11.1" y="6" width="1.8" height="12" fill="var(--color-ink-3)" />
    </>
  ),
  fork: (
    <>
      <rect x="5" y="2.5" width="2" height="9" />
      <rect x="9" y="2.5" width="2" height="9" />
      <rect x="13" y="2.5" width="2" height="9" />
      <rect x="8" y="11.5" width="4" height="10" />
      <rect x="17" y="2.5" width="3" height="12" rx="1.5" />
      <rect x="17.75" y="14.5" width="1.5" height="7" />
    </>
  ),
  book: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.2" />
      <rect x="11.2" y="3" width="1.6" height="18" fill="var(--color-ink-3)" />
      <polygon points="15,3 20,3 20,8" fill="var(--color-ink-3)" />
    </>
  ),
  flag: (
    <>
      <rect x="4" y="2" width="1.8" height="20" />
      <polygon points="5.8,3 20,7 5.8,12" />
    </>
  ),
};

/** id de catégorie backend → type d'icône. */
export const CATEGORY_ICON = {
  culture: "gradcap",
  histoire: "landmark",
  geographie: "globe",
  sciences: "flask",
  sport: "trophy",
  afrique: "pawprint",
  cinema: "clapper",
  musique: "musicnote",
  celebrites: "star",
  technologie: "laptop",
  nature: "leaf",
  gastronomie: "fork",
  litterature: "book",
  anime: "flag",
  animaux: "pawprint",
  environnement: "leaf",
  television: "clapper",
  "jeux-video": "laptop",
  automobile: "trophy",
  sante: "flask",
  arts: "star",
  societe: "houses",
  voyages: "globe",
  "bandes-dessinees": "book",
  "football-cm": "football",
  "musique-cm": "mic",
  "histoire-cm": "landmark",
  "societe-cm": "houses",
  "gastronomie-cm": "bowl",
};

/** Photo réelle (WebP auto-hébergée, Wikimedia Commons) pour chaque
 * catégorie — DESIGN.md §6 : sujet spécifique et réel, jamais du stock
 * générique interchangeable. */
export const CATEGORY_PHOTO = {
  "football-cm": "/categories/football-cm.webp",
  "musique-cm": "/categories/musique-cm.webp",
  "histoire-cm": "/categories/histoire-cm.webp",
  "societe-cm": "/categories/societe-cm.webp",
  "gastronomie-cm": "/categories/gastronomie-cm.webp",
  culture: "/categories/culture.webp",
  histoire: "/categories/histoire.webp",
  geographie: "/categories/geographie.webp",
  sciences: "/categories/sciences.webp",
  sport: "/categories/sport.webp",
  afrique: "/categories/afrique.webp",
  cinema: "/categories/cinema.webp",
  musique: "/categories/musique.webp",
  celebrites: "/categories/celebrites.webp",
  technologie: "/categories/technologie.webp",
  nature: "/categories/nature.webp",
  gastronomie: "/categories/gastronomie.webp",
  litterature: "/categories/litterature.webp",
  anime: "/categories/anime.webp",
  animaux: "/categories/nature.webp",
  environnement: "/categories/nature.webp",
  television: "/categories/cinema.webp",
  "jeux-video": "/categories/technologie.webp",
  automobile: "/categories/sport.webp",
  sante: "/categories/sciences.webp",
  arts: "/categories/culture.webp",
  societe: "/categories/afrique.webp",
  voyages: "/categories/geographie.webp",
  "bandes-dessinees": "/categories/anime.webp",
};

/** 6 tons chauds fixes pour le fond de pastille — exception cadrée du
 * §2/§6, jamais utilisés ailleurs qu'ici. Classes écrites en toutes
 * lettres (pas de nom de couleur interpolé dans un template string) :
 * le scanner Tailwind ne détecte que les classes littérales du source. */
const ACCENT_CYCLE = [
  { chip: "bg-flare/22", icon: "text-flare" },
  { chip: "bg-live/22", icon: "text-live" },
  { chip: "bg-terracotta/22", icon: "text-terracotta" },
  { chip: "bg-flare-deep/22", icon: "text-flare-deep" },
  { chip: "bg-teal/22", icon: "text-teal" },
  { chip: "bg-rose/22", icon: "text-rose" },
];
export function accentForIndex(i) {
  return ACCENT_CYCLE[i % ACCENT_CYCLE.length];
}

export function CategoryIcon({ type, className }) {
  const shape = ICON_BY_TYPE[type] ?? ICON_BY_TYPE.star;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {shape}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Icônes de navigation — même parti pris (formes dessinées à la main,
   pas de librairie), mais trait fin plutôt que silhouette pleine : à la
   taille d'un élément de nav (≈20px) un contour se lit mieux qu'un
   aplat. Ajouté le 19/08 : la nav (sidebar + barre du bas) n'avait que
   du texte, jamais assez repérable d'un coup d'œil sur "une plateforme
   de jeu" (retour utilisateur direct).
   ══════════════════════════════════════════════════════════════════ */
const NAV_ICON_BY_TYPE = {
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5h5V15h2v4.5h5V10" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4.5A2.5 2.5 0 0 0 7 8.5M17 5h2.5A2.5 2.5 0 0 1 17 8.5" />
      <path d="M12 13v3M9 20h6" />
    </>
  ),
  chart: (
    <>
      <rect x="4" y="12" width="4" height="8" fill="currentColor" stroke="none" />
      <rect x="10" y="7" width="4" height="13" fill="currentColor" stroke="none" />
      <rect x="16" y="3" width="4" height="17" fill="currentColor" stroke="none" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 9.5h18" />
      <circle cx="17" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" />
    </>
  ),
  crown: <path d="M4 9l4 3 4-6 4 6 4-3-2 9H6L4 9z" fill="currentColor" stroke="none" />,
  swords: (
    <>
      <path d="M3 21 12 12M21 3l-9 9" />
      <path d="M3 3l4 1 1 4-2 2-4-1-1-4z" fill="currentColor" stroke="none" />
      <path d="M21 21l-4-1-1-4 2-2 4 1 1 4z" fill="currentColor" stroke="none" />
    </>
  ),
  robot: (
    <>
      <rect x="5" y="9" width="14" height="11" rx="2" />
      <path d="M12 5v4M9 3h6" />
      <circle cx="9.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9 18h6" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 10v4h3l6 4V6L6 10H3z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
    </>
  ),
  link: (
    <>
      <path d="M9 15l6-6" />
      <path d="M10.5 6.5 13 4a4 4 0 0 1 6 5.3l-.5.5-2 2" />
      <path d="M13.5 17.5 11 20a4 4 0 0 1-6-5.3l.5-.5 2-2" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 4v14" />
      <path d="M6 12l6 6 6-6" />
    </>
  ),
  arrowUp: (
    <>
      <path d="M12 20V6" />
      <path d="M6 12l6-6 6 6" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  speaker: (
    <>
      <path d="M4 9.5v5h4l5 4V5.5l-5 4H4z" fill="currentColor" stroke="none" />
      <path d="M16.2 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  speakerMuted: (
    <>
      <path d="M4 9.5v5h4l5 4V5.5l-5 4H4z" fill="currentColor" stroke="none" />
      <path d="M16 9l5 6M21 9l-5 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M21 20c0-2.5-1.8-4.2-4-4.7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3L4 7v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </>
  ),
};

/** Une lame simple, dessinée pointe en haut — réutilisée deux fois par
 * SwordsLoader (l'une mise en miroir) pour former les épées croisées. */
function SwordBlade() {
  return (
    <>
      <rect x="11.1" y="2" width="1.8" height="12.5" />
      <polygon points="12,1 13.5,4 10.5,4" />
      <rect x="7.8" y="14.5" width="8.4" height="1.7" rx="0.5" />
      <rect x="11.1" y="16.2" width="1.8" height="3.6" />
      <rect x="9.6" y="19.6" width="4.8" height="1.8" rx="0.9" />
    </>
  );
}

/**
 * Chargement thématique "épées qui s'entrechoquent" — remplace les 3
 * points par défaut là où on veut marquer une vraie transition (chaque
 * écran qui attend ses données au montage, ce qui couvre en pratique
 * chaque changement de page, demande directe de Paul le 19/08). Pur
 * SVG + CSS (§app.css .anim-sword-a/b), aucune librairie d'animation.
 */
export function SwordsLoader({ className }) {
  return (
    <span className={clsx("relative inline-block", className)} role="status" aria-label="Chargement">
      {/* Deux fois la même lame (quasi symétrique gauche/droite, pas
          besoin de miroir), chacune avec sa propre rotation de base et
          sa propre animation — se croisent au milieu du mouvement. */}
      <svg viewBox="0 0 24 24" fill="currentColor" className="anim-sword-a absolute inset-0 h-full w-full text-flare">
        <SwordBlade />
      </svg>
      <svg viewBox="0 0 24 24" fill="currentColor" className="anim-sword-b absolute inset-0 h-full w-full text-bone-3">
        <SwordBlade />
      </svg>
    </span>
  );
}

export function NavIcon({ type, className }) {
  const shape = NAV_ICON_BY_TYPE[type];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}
