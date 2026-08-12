import { useEffect, useRef, useState } from "react";

/**
 * Compteur animé façon Duolingo — anime la transition vers `to` en `duration` ms.
 * Formatting optionnel via `format` (fonction number → string).
 */
export default function CountUp({ to = 0, duration = 700, format }) {
  const [value, setValue] = useState(to);
  const fromRef = useRef(to);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === to) return;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      setValue(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [to, duration]);

  return <>{format ? format(value) : value}</>;
}
