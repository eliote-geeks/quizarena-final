import clsx from "clsx";
import { useLocation } from "react-router-dom";
import { avatarUrl } from "../lib/api";
import { SwordsLoader } from "./icons";

/** Rejoue l'animation d'entrée (anim-rise) à chaque navigation, pour les
 * écrans hors Shell (Shell.jsx a sa propre version pour ne pas
 * remonter la nav à chaque changement de page). */
export function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="anim-rise">
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Primitives. Six composants + quelques dérivés. Rayon en 3 tailles
   nommées (DESIGN.md §1), jamais une 4e valeur improvisée.
   ══════════════════════════════════════════════════════════════════ */

/**
 * Bloc d'action. Il s'enfonce au tap (§7). `tone` : flare = action
 * primaire (or) · bone = secondaire · ghost = tertiaire.
 */
export function Block({
  as: As = "button",
  tone = "flare",
  size = "md",
  full,
  loading,
  icon,
  className,
  children,
  disabled,
  ...rest
}) {
  const tones = {
    /* gacha-btn gère le fond (gradient or) + bordures relief + box-shadow —
       pas de bg-* Tailwind concurrent, sinon il écraserait le dégradé. */
    flare: "gacha-btn text-ink",
    bone: "bg-bone text-ink hover:bg-bone-2",
    ghost: "bg-ink-3 text-bone hover:bg-ink-4",
    outline: "bg-transparent text-bone border-2 border-bone-4 hover:border-bone hover:bg-ink-3",
  };
  const dotTones = { flare: "bg-ink", bone: "bg-ink", ghost: "bg-bone", outline: "bg-bone" };
  const sizes = {
    sm: "px-3 py-1.5 text-[12px]",
    md: "px-4 py-2 text-[13px]",
    lg: "px-5 py-2.5 text-[14px]",
  };
  return (
    <As
      disabled={disabled || loading}
      className={clsx(
        "t-label press inline-flex items-center justify-center gap-2 select-none rounded-(--radius-card)",
        tones[tone],
        sizes[size],
        full && "w-full",
        "disabled:opacity-35 disabled:pointer-events-none",
        loading && "disabled:opacity-100",
        className
      )}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={clsx("anim-pulse h-1.5 w-1.5 rounded-full", dotTones[tone])} style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </span>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </As>
  );
}

/** Petite capitale espacée du tableau de score. Cliquable si `onClick`
 * est fourni — bug réel trouvé le 20/08 : le composant ignorait
 * silencieusement `onClick` (span sans gestionnaire ni accessibilité),
 * ce qui rendait plusieurs liens de l'accueil ("toutes les catégories",
 * "tous les tournois", "classement complet", "duels ouverts") inertes
 * malgré leur apparence cliquable. */
export function Label({ children, tone = "dim", className, onClick }) {
  const As = onClick ? "button" : "span";
  return (
    <As
      onClick={onClick}
      type={onClick ? "button" : undefined}
      className={clsx(
        "t-label block",
        onClick && "border-0 bg-transparent p-0 text-left",
        tone === "dim" && "text-bone-3",
        tone === "flare" && "text-flare",
        tone === "live" && "text-live",
        tone === "bone" && "text-bone",
        className
      )}
    >
      {children}
    </As>
  );
}

/** Pastille de statut — "Ouvert", "En live", "Victoire"… fond plein,
 * rayon --radius-tag. Toujours accompagnée du texte, jamais couleur
 * seule pour juste/faux (§4). */
export function Tag({ children, tone = "ghost", className }) {
  const tones = {
    flare: "bg-flare text-ink",
    live: "bg-live text-ink",
    danger: "bg-danger text-ink",
    ghost: "bg-ink-4 text-bone-2",
  };
  return (
    <span className={clsx("t-label inline-flex items-center rounded-(--radius-tag) px-2.5 py-1", tones[tone], className)}>
      {children}
    </span>
  );
}

/**
 * Montant. Toujours tabulaire, la devise toujours plus petite et éteinte —
 * c'est le nombre qui porte l'information, pas l'unité.
 */
export function Money({ value, size = "md", tone = "bone", className }) {
  const sizes = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl",
  };
  const tones = {
    bone: "text-bone",
    flare: "text-flare",
    live: "text-live",
    dim: "text-bone-3",
  };
  return (
    <span className={clsx("t-display inline-flex items-baseline gap-1.5", sizes[size], tones[tone], className)}>
      {value.toLocaleString("fr-FR")}
      <span className="t-label text-bone-4 translate-y-[-0.15em]">F</span>
    </span>
  );
}

/**
 * Ligne de tableau de score. C'est le composant de liste par défaut —
 * il remplace toutes les cartes. Séparation par luminosité au survol (§3),
 * léger rayon --radius-tag sur le fond de survol pour ne pas trancher net
 * sur les bords de l'écran.
 */
export function Row({ rank, children, onClick, active, className }) {
  const As = onClick ? "button" : "div";
  return (
    <As
      onClick={onClick}
      className={clsx(
        "group flex w-full items-center gap-4 rounded-(--radius-tag) px-4 py-3.5 text-left",
        "transition-colors duration-100",
        active ? "bg-ink-3" : "hover:bg-ink-2",
        className
      )}
    >
      {rank != null && (
        <span className="t-display w-8 shrink-0 text-lg text-bone-4 group-hover:text-flare">
          {String(rank).padStart(2, "0")}
        </span>
      )}
      {children}
    </As>
  );
}

/**
 * Ligne de points qui relie un libellé à sa valeur, comme dans un
 * programme de match. Occupe le vide horizontal d'une ligne large.
 */
export function Leader({ className }) {
  return (
    <span
      aria-hidden="true"
      className={clsx("mx-3 hidden h-px min-w-6 flex-1 sm:block", className)}
      style={{
        backgroundImage:
          "repeating-linear-gradient(to right, var(--color-ink-4) 0 3px, transparent 3px 8px)",
      }}
    />
  );
}

/** Barre de progression / chrono. Pleine, sans dégradé. */
export function Bar({ value, tone = "flare", height = 6, className }) {
  const tones = { flare: "bg-flare", bone: "bg-bone", live: "bg-live" };
  return (
    <div className={clsx("w-full overflow-hidden bg-ink-3", className)} style={{ height, borderRadius: height / 2 }}>
      <div
        className={clsx("h-full", tones[tone])}
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          transition: "width .2s linear",
        }}
      />
    </div>
  );
}

/**
 * Bloc de chiffre + étiquette. La brique du tableau de score.
 * Aucune bordure : c'est l'écart de luminosité et le vide qui séparent.
 */
export function Stat({ label, value, tone = "bone", size = "md", className }) {
  const sizes = { sm: "text-xl", md: "text-3xl", lg: "text-5xl" };
  const tones = {
    bone: "text-bone",
    flare: "text-flare",
    live: "text-live",
    dim: "text-bone-3",
  };
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      <span className={clsx("t-display", sizes[size], tones[tone])}>{value}</span>
    </div>
  );
}

/**
 * Champ de formulaire : étiquette + contrôle + aide/erreur.
 */
export function Field({ label, hint, error, className, children }) {
  return (
    <label className={clsx("flex flex-col gap-2.5", className)}>
      {label && <Label>{label}</Label>}
      {children}
      {error ? (
        <span className="t-label text-danger">{error}</span>
      ) : hint ? (
        <span className="t-body text-[13px] text-bone-4">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * Saisie texte. Rayon --radius-tag, séparation par fond plutôt que
 * bordure grise générique — un seul filet inférieur assumé dans l'accent
 * au focus (§3).
 */
export function Input({ className, ...rest }) {
  return (
    <input
      className={clsx(
        "t-body w-full rounded-(--radius-tag) bg-ink-2 px-4 py-3.5 text-[15px] text-bone placeholder:text-bone-4",
        "outline-none transition-colors duration-150 focus:bg-ink-3",
        "border-0 border-b-2 border-ink-4 focus:border-flare",
        className
      )}
      {...rest}
    />
  );
}

/**
 * Case à cocher — carré arrondi (§1 : le rond est réservé aux vrais
 * éléments circulaires, pas ici).
 */
export function Toggle({ checked, onChange, children, className }) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={clsx("press inline-flex cursor-pointer items-start gap-3 text-left", className)}
    >
      <span
        className={clsx(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
          checked ? "border-flare bg-flare" : "border-ink-4 bg-transparent"
        )}
      >
        {checked && <span className="h-2 w-2 rounded-[1px] bg-ink" />}
      </span>
      {children && (
        <span className="t-body text-[13px] text-bone-3" onClick={(e) => e.stopPropagation()}>
          {children}
        </span>
      )}
    </div>
  );
}

/**
 * Chargement — trois points qui pulsent en cascade, jamais un écran
 * vide. `full` centre sur toute la hauteur de l'écran.
 */
export function Loader({ full, className }) {
  const swords = <SwordsLoader className={clsx(full ? "h-16 w-16" : "h-7 w-7", className)} />;
  if (!full) return swords;
  return (
    <div className="grain flex min-h-dvh items-center justify-center">
      {swords}
    </div>
  );
}

/**
 * Avatar par défaut style anime (DiceBear, licence MIT/CC0), généré
 * côté SERVEUR à partir du pseudo — jamais dans le bundle client
 * (la lib de génération pèse +110 kB gzip, hors budget §perf DESIGN.md).
 * `/api/avatar/:seed` renvoie un SVG déterministe et le cache navigateur
 * fait le reste (immutable, DESIGN.md §9 révisé 19/08 : le rond reste
 * banni — rayon --radius-tag — seule la définition « avatar = initiales »
 * a changé).
 */
export function Avatar({ name, size = "md", className }) {
  const sizes = { sm: "h-8 w-8", md: "h-11 w-11", lg: "h-16 w-16" };
  return (
    <img
      src={avatarUrl(name || "?")}
      alt=""
      className={clsx("inline-block shrink-0 overflow-hidden rounded-(--radius-tag) bg-ink-3 object-cover", sizes[size], className)}
    />
  );
}

function AlertGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3 22 20H2z" />
      <path d="M12 9.5v5" />
      <circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Modal de confirmation stylée — pour toute action qui engage un vrai
 * enjeu (mise débitée, forfait, retrait d'argent) : jamais une simple
 * `window.confirm()` du navigateur, toujours cohérente avec la charte.
 * `tone="danger"` pour un renoncement (perte de mise) · `"flare"` pour
 * un engagement normal (nouvelle mise). Se ferme au clic hors panneau.
 */
export function ConfirmModal({
  open,
  tone = "flare",
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  busy,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[10001] flex items-end justify-center bg-ink/80 px-0 pb-0 backdrop-blur-[2px] sm:items-center sm:px-5 sm:pb-5"
      onClick={onCancel}
    >
      <div
        className="anim-rise w-full max-w-sm rounded-t-(--radius-panel) bg-ink-2 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:rounded-(--radius-panel) sm:p-6"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <span
          className={clsx(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-(--radius-tag)",
            tone === "danger" ? "bg-danger/20 text-danger" : "bg-flare/20 text-flare"
          )}
        >
          <AlertGlyph className="h-6 w-6" />
        </span>
        <h2 className="t-display text-xl">{title}</h2>
        {message && <p className="t-body mt-2.5 text-sm text-bone-3">{message}</p>}
        <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row">
          <Block tone="ghost" full disabled={busy} onClick={onCancel} className="sm:flex-1">
            {cancelLabel}
          </Block>
          <Block full loading={busy} onClick={onConfirm} className="sm:flex-1">
            {confirmLabel}
          </Block>
        </div>
      </div>
    </div>
  );
}
