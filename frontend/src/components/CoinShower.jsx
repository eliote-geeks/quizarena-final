import { motion, AnimatePresence } from "framer-motion";

/**
 * CoinShower — pixel coin particles raining down when player gets a correct answer.
 * Each coin is a small amber square that falls + rotates + fades.
 */
export default function CoinShower({ trigger }) {
  return (
    <AnimatePresence>
      {trigger && (
        <div className="fixed inset-0 pointer-events-none z-40" key="shower">
          {[...Array(28)].map((_, i) => {
            const x = 5 + Math.random() * 90; // vw %
            const delay = Math.random() * 0.35;
            const duration = 1 + Math.random() * 0.8;
            const drift = (Math.random() - 0.5) * 80;
            const size = 8 + Math.floor(Math.random() * 8);
            return (
              <motion.div
                key={`${trigger}-${i}`}
                initial={{ y: -50, x: 0, opacity: 1, rotate: 0 }}
                animate={{ y: "110vh", x: drift, opacity: [1, 1, 0.9, 0], rotate: 720 }}
                exit={{ opacity: 0 }}
                transition={{ duration, delay, ease: [0.4, 0, 0.6, 1] }}
                className="pixel-block absolute"
                style={{
                  left: `${x}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  background: "#E5A800",
                  boxShadow: "0 0 8px rgba(229,168,0,0.7), inset -2px -2px 0 rgba(0,0,0,0.4)",
                  imageRendering: "pixelated",
                }}
              />
            );
          })}
          {/* Big central flash */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.4, 0], scale: [0.4, 2.4, 3] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(229,168,0,0.6), transparent 70%)" }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
