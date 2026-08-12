import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Trophy, Gift, Zap } from "lucide-react";

const SLIDES = [
  {
    id: "promo",
    tag: "Promotion",
    icon: Gift,
    title: "1er dépôt doublé",
    text: "Dépose ton premier montant, on égale à 100% jusqu'à 25 000 FCFA.",
    cta: "En profiter",
    to: "/wallet",
    hue: "from-indigo-500/25 via-indigo-500/10 to-transparent",
  },
  {
    id: "tournament",
    tag: "Tournoi",
    icon: Trophy,
    title: "Néon Showdown",
    text: "32 000 FCFA à gagner. Finale vendredi. 28 / 32 places prises.",
    cta: "Voir le tournoi",
    to: "/tournaments",
    hue: "from-violet-500/25 via-violet-500/10 to-transparent",
  },
  {
    id: "new",
    tag: "Nouveau",
    icon: Sparkles,
    title: "8 nouveaux thèmes",
    text: "Anime, Culture, Tech, Afrique et plus. À découvrir en solo rapide.",
    cta: "Découvrir",
    to: "/",
    hue: "from-emerald-500/25 via-emerald-500/10 to-transparent",
  },
  {
    id: "concours",
    tag: "Jeu-concours",
    icon: Zap,
    title: "Défi du jour",
    text: "10 questions Sciences · +500 FCFA bonus. Sans mise.",
    cta: "Jouer maintenant",
    to: "/play/sciences?daily=1",
    hue: "from-rose-500/25 via-rose-500/10 to-transparent",
  },
];

const AUTO_MS = 6000;

export default function HomeCarousel() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  const goTo = useCallback((i) => {
    setIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);
  const next = useCallback(() => goTo(index + 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1), [index, goTo]);

  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(next, AUTO_MS);
    return () => clearTimeout(timer.current);
  }, [index, paused, next]);

  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <div
      className="relative rounded-3xl overflow-hidden card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Static mesh background per slide */}
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.hue} pointer-events-none transition-all duration-700`} />

      <AnimatePresence mode="wait">
        <motion.button
          key={slide.id}
          onClick={() => navigate(slide.to)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="relative w-full text-left"
        >
          <div className="relative p-6 sm:p-8 flex flex-col gap-6 min-h-[220px]">
            <div className="flex items-center justify-between">
              <span
                className="chip"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent-hover)",
                  border: "1px solid var(--border-md)",
                }}
              >
                <Icon className="w-3 h-3" />
                {slide.tag}
              </span>
              <span className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>
                {index + 1} / {SLIDES.length}
              </span>
            </div>

            <div className="max-w-lg">
              <h2 className="font-display font-semibold text-3xl sm:text-4xl leading-tight tracking-tight" style={{ color: "var(--text)" }}>
                {slide.title}
              </h2>
              <p className="mt-2 text-base" style={{ color: "var(--text-sub)" }}>
                {slide.text}
              </p>
            </div>

            <div className="mt-auto inline-flex items-center gap-2 self-start btn-primary px-4 py-2.5 rounded-xl text-sm">
              {slide.cta}
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.button>
      </AnimatePresence>

      {/* Prev / Next */}
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full items-center justify-center transition hover:opacity-100"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border-md)",
          color: "var(--text-sub)",
          opacity: 0.85,
        }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full items-center justify-center transition hover:opacity-100"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border-md)",
          color: "var(--text-sub)",
          opacity: 0.85,
        }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
            className="rounded-full transition-all"
            style={{
              width: i === index ? 20 : 6,
              height: 6,
              background: i === index ? "var(--accent)" : "var(--border-strong)",
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
