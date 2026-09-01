import { motion } from "framer-motion";
import { BookOpen, Lightbulb, ShieldCheck, Sparkles } from "lucide-react";

/**
 * Carte affichée entre deux questions.
 *
 * Elle remplace l'ancien tip d'une ligne en doré pâle, qui se perdait sous
 * le résultat et que personne ne lisait. Ici la carte occupe vraiment le
 * temps mort : une image quand il y en a une, un intitulé de rubrique, un
 * titre, un texte court et la source.
 *
 * L'image est décorative au sens strict — elle illustre le fait, elle ne
 * porte aucune information nécessaire pour continuer à jouer. Si elle ne
 * charge pas, la carte reste parfaitement lisible.
 */

const RUBRICS = {
  fait: { Icon: Sparkles, tint: "var(--accent)" },
  plateforme: { Icon: ShieldCheck, tint: "var(--success)" },
  conseil: { Icon: Lightbulb, tint: "var(--accent)" },
  default: { Icon: BookOpen, tint: "var(--accent)" },
};

export default function InterstitialCard({ card, compact = false, className = "" }) {
  if (!card) return null;
  const { Icon, tint } = RUBRICS[card.kind] ?? RUBRICS.default;

  return (
    <motion.article
      key={card.title}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{ background: "var(--surface-2)", border: "1px solid var(--border-md)" }}
    >
      {card.image && !compact && (
        <div className="relative aspect-[16/7] w-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
          <img
            src={card.image}
            alt={card.imageAlt || ""}
            loading="lazy"
            className="h-full w-full object-cover"
            /* Une image manquante ne doit pas laisser un cadre vide au milieu
               de la carte : on la retire purement et simplement. */
            onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{ background: "linear-gradient(to top, var(--surface-2), transparent)" }}
          />
        </div>
      )}

      <div className={compact ? "p-3.5" : "p-4 sm:p-5"}>
        <p
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em]"
          style={{ color: tint }}
        >
          <Icon className="h-3.5 w-3.5" />
          {card.label}
        </p>

        <h3
          className={`font-display mt-2 font-extrabold leading-snug ${compact ? "text-[15px]" : "text-lg sm:text-xl"}`}
          style={{ color: "var(--text)" }}
        >
          {card.title}
        </h3>

        <p
          className={`mt-2 leading-relaxed ${compact ? "text-[13px]" : "text-sm"}`}
          style={{ color: "var(--text-sub)" }}
        >
          {card.body}
        </p>

        {card.source && (
          <p className="mt-3 text-[10px]" style={{ color: "var(--text-faint)" }}>
            Source : {card.source}
          </p>
        )}
      </div>
    </motion.article>
  );
}
