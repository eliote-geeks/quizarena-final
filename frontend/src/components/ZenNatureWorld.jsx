import { motion } from "framer-motion";

/**
 * Fond ambient léger, purement CSS (mesh gradients + points),
 * sans image externe. Rapide, économe, cohérent avec le design system.
 */
export default function ZenNatureWorld({ intensity = "calm" }) {
  const urgent = intensity === "urgent";

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--bg)" }}
      />

      {/* Ambient mesh */}
      <div
        className="absolute inset-0"
        style={{
          background: urgent
            ? `radial-gradient(ellipse 50% 40% at 20% 20%, rgba(244,63,94,0.20), transparent 60%),
               radial-gradient(ellipse 40% 40% at 80% 30%, rgba(99,102,241,0.18), transparent 60%),
               radial-gradient(ellipse 60% 50% at 50% 100%, rgba(244,63,94,0.14), transparent 60%)`
            : `radial-gradient(ellipse 50% 40% at 20% 20%, rgba(99,102,241,0.18), transparent 60%),
               radial-gradient(ellipse 40% 40% at 80% 30%, rgba(168,85,247,0.14), transparent 60%),
               radial-gradient(ellipse 60% 50% at 50% 100%, rgba(79,70,229,0.14), transparent 60%)`,
        }}
      />

      {/* Slow-moving light band */}
      <motion.div
        className="absolute inset-x-[-18%] top-[8%] h-[34%]"
        animate={{ x: ["-4%", "4%", "-4%"], opacity: urgent ? [0.10, 0.18, 0.10] : [0.10, 0.16, 0.10] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: urgent
            ? "linear-gradient(90deg, transparent, rgba(244,63,94,0.14), rgba(168,85,247,0.10), transparent)"
            : "linear-gradient(90deg, transparent, rgba(99,102,241,0.14), rgba(168,85,247,0.10), transparent)",
          filter: "blur(24px)",
        }}
      />

      {/* Dots pattern */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.28) 0 1px, transparent 1px), radial-gradient(circle at 82% 22%, rgba(255,255,255,0.18) 0 1px, transparent 1px)",
          backgroundSize: "120px 120px, 180px 180px",
        }}
      />

      {/* Vignette bottom */}
      <div className="absolute inset-x-0 bottom-0 h-[35%] pointer-events-none"
        style={{ background: "linear-gradient(to top, var(--bg) 0%, transparent 100%)" }}
      />
    </div>
  );
}
