import { useState } from "react";
import { motion } from "framer-motion";

/** Image de question avec squelette pendant le chargement, fondu à
 *  l'arrivée — jamais de flash d'image cassée ou à moitié chargée.
 *  N'affecte jamais le chrono : le texte et les options de réponse
 *  s'affichent immédiatement, seul le visuel attend son propre chargement. */
export default function QuestionMedia({ src, alt, onZoom }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onZoom?.({ url: src, alt })}
      className="relative my-5 block h-56 w-full cursor-zoom-in overflow-hidden rounded-2xl"
      style={{ background: "var(--surface-2)" }}
      aria-label="Agrandir l'image"
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse" style={{ background: "linear-gradient(90deg, var(--surface-2), var(--surface-3), var(--surface-2))" }} />
      )}
      <motion.img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="h-full w-full object-cover"
      />
    </button>
  );
}
