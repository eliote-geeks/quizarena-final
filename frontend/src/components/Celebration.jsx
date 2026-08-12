import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Confetti pastel subtil (indigo / lavande / rose) qui explose au centre
 * puis retombe. Vraiment doux, pas kitsch. Se déclenche via prop `show`.
 */
const COLORS = ["#6366F1", "#A78BFA", "#F9A8D4", "#38BDF8", "#34D399"];
const COUNT = 22;

function makePieces() {
  return Array.from({ length: COUNT }, (_, i) => {
    const angle = (i / COUNT) * Math.PI * 2 + (Math.random() * 0.4);
    const dist = 90 + Math.random() * 120;
    return {
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 30,
      rot: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      size: 4 + Math.random() * 5,
    };
  });
}

export default function Celebration({ show }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (show) {
      setPieces(makePieces());
      const t = setTimeout(() => setPieces([]), 900);
      return () => clearTimeout(t);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute rounded-full"
              initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
              animate={{
                x: p.x,
                y: p.y + 60,
                opacity: [0, 1, 1, 0],
                rotate: p.rot,
                scale: [0.5, 1.1, 0.9],
              }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 8px ${p.color}88`,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
