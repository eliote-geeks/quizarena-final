import { useEffect, useRef, useState } from "react";

/**
 * Compte vers `to`. Le mouvement dit « cette valeur a changé » — il informe,
 * il ne décore pas (DESIGN.md §7).
 */
export function useCountUp(to, duration = 600) {
  const [value, setValue] = useState(to);
  const from = useRef(to);
  const raf = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    if (origin === to) return;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(origin + (to - origin) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = to;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);

  return value;
}
