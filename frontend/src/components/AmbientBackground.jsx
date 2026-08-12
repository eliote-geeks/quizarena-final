import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Ambient background — cycles through curated calming photos.
 * Dark overlay + mesh gradient so foreground text stays legible.
 *
 * - Rotates every `intervalMs` (default 20s)
 * - Preloads next image
 * - CSS gradient fallback if a photo fails to load
 */
const IMAGES = [
  // Curated calm nature (Unsplash direct URLs, w=1600 q=60)
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=60", // brume forêt
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=60", // forêt lumière
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1600&q=60", // forêt verte
  "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?auto=format&fit=crop&w=1600&q=60", // montagne aurore
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1600&q=60", // forêt haute
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=60", // lac miroir
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1600&q=60", // route forêt
  "https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=1600&q=60", // ciel étoilé
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=60", // champ lavande
  "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=1600&q=60", // montagne brume
];

function preload(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = reject;
    img.src = url;
  });
}

function randomIdx(exclude = -1) {
  let n = Math.floor(Math.random() * IMAGES.length);
  if (IMAGES.length > 1 && n === exclude) n = (n + 1) % IMAGES.length;
  return n;
}

export default function AmbientBackground({ intervalMs = 20000, intensity = "calm" }) {
  const [current, setCurrent] = useState(null);      // { url, id }
  const idxRef = useRef(-1);
  const idRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const swap = async () => {
      const next = randomIdx(idxRef.current);
      idxRef.current = next;
      try {
        await preload(IMAGES[next]);
        if (!cancelled) {
          idRef.current += 1;
          setCurrent({ url: IMAGES[next], id: idRef.current });
        }
      } catch (_) {
        // silent fallback — mesh gradient covers
      }
    };

    swap();
    timerRef.current = setInterval(swap, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  const urgent = intensity === "urgent";

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {/* Base color layer always visible even before first image */}
      <div className="absolute inset-0" style={{ background: "var(--bg)" }} />

      {/* Photo layer with slow ken-burns */}
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 0.28, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.8, ease: "easeInOut" }, scale: { duration: intervalMs / 1000, ease: "linear" } }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url("${current.url}")`,
              filter: "saturate(0.85) contrast(0.98)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Dark gradient overlay for text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,8,12,0.62) 0%, rgba(8,8,12,0.72) 55%, rgba(8,8,12,0.92) 100%)",
        }}
      />

      {/* Ambient mesh light (indigo/violet) */}
      <div
        className="absolute inset-0"
        style={{
          background: urgent
            ? `radial-gradient(ellipse 50% 40% at 20% 20%, rgba(244,63,94,0.22), transparent 60%),
               radial-gradient(ellipse 40% 40% at 80% 30%, rgba(168,85,247,0.18), transparent 60%)`
            : `radial-gradient(ellipse 50% 40% at 20% 20%, rgba(99,102,241,0.20), transparent 60%),
               radial-gradient(ellipse 40% 40% at 80% 30%, rgba(168,85,247,0.14), transparent 60%),
               radial-gradient(ellipse 60% 50% at 50% 100%, rgba(79,70,229,0.16), transparent 60%)`,
        }}
      />

      {/* Fine grain / dots */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.28) 0 1px, transparent 1px), radial-gradient(circle at 82% 22%, rgba(255,255,255,0.18) 0 1px, transparent 1px)",
          backgroundSize: "120px 120px, 180px 180px",
        }}
      />

      {/* Light bottom vignette to fade into page content */}
      <div
        className="absolute inset-x-0 bottom-0 h-[30%]"
        style={{ background: "linear-gradient(to top, var(--bg) 0%, transparent 100%)" }}
      />
    </div>
  );
}
