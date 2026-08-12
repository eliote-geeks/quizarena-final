import { motion, AnimatePresence } from "framer-motion";
import { extractContext } from "../lib/questionContext";
import { CATEGORY_COLORS } from "../data/mockData";

const LINES = [14, 28, 42, 56, 70, 84];
const _BUILD = "v2.1";

export default function QuestionIntro({ qIdx, total, question, cat, lang = "fr" }) {
  const catColor = CATEGORY_COLORS[cat?.id] || "#E5A800";
  const CatIcon  = cat?.icon;
  const tags     = extractContext(question, cat?.id, lang);
  void _BUILD;

  return (
    <motion.div
      key="question-intro"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ y: "-100%", transition: { duration: 0.32, ease: [0.76, 0, 0.24, 1] } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "#05050A" }}
    >
      {/* Radial glow burst on enter */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        style={{
          background: `radial-gradient(ellipse 75% 55% at 50% 50%, ${catColor}45 0%, transparent 70%)`,
        }}
      />

      {/* Scan lines */}
      {LINES.map((top, i) => (
        <motion.div
          key={top}
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ top: `${top}%`, background: `${catColor}14` }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.05 + i * 0.025 }}
        />
      ))}

      {/* Corner accents */}
      {[
        "top-4 left-4 border-l border-t",
        "top-4 right-4 border-r border-t",
        "bottom-4 left-4 border-l border-b",
        "bottom-4 right-4 border-r border-b",
      ].map((cls, i) => (
        <motion.div
          key={i}
          className={`absolute w-6 h-6 ${cls}`}
          style={{ borderColor: `${catColor}40` }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 + i * 0.04 }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 text-center px-8 max-w-lg mx-auto">

        {/* Category label */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, delay: 0.08 }}
          className="flex items-center justify-center gap-2 mb-5"
        >
          {CatIcon && (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${catColor}18`, color: catColor }}
            >
              <CatIcon className="w-4 h-4" />
            </div>
          )}
          <span
            className="text-xs font-bold uppercase tracking-[0.22em]"
            style={{ color: catColor }}
          >
            {cat?.name?.[lang] || cat?.name?.fr || "Quiz"}
          </span>
        </motion.div>

        {/* Q number — SLAM */}
        <motion.div
          initial={{ scale: 0, rotate: -10, opacity: 0 }}
          animate={{ scale: [0, 1.4, 0.92, 1.04, 1], rotate: [-10, 4, -2, 1, 0], opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.04, ease: "easeOut" }}
          className="leading-none mb-1"
          style={{
            fontFamily: "'VT323', monospace",
            fontSize: "clamp(88px, 22vw, 136px)",
            color: catColor,
            textShadow: `0 0 32px ${catColor}70, 0 0 72px ${catColor}28`,
            lineHeight: 1,
          }}
        >
          Q{qIdx + 1}
        </motion.div>

        {/* Fraction */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.38 }}
          className="font-arcade text-xs tracking-widest mb-8"
          style={{ color: `${catColor}50` }}
        >
          / {total}
        </motion.div>

        {/* Context tags */}
        <div className="flex flex-wrap gap-2 justify-center min-h-[32px]">
          <AnimatePresence>
            {tags.map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ scale: 0, y: 18, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{
                  delay: 0.36 + i * 0.11,
                  type: "spring",
                  stiffness: 420,
                  damping: 22,
                }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider"
                style={{
                  background:  `${catColor}16`,
                  color:        catColor,
                  border:      `1px solid ${catColor}38`,
                  boxShadow:   `0 0 14px ${catColor}18`,
                }}
              >
                {tag}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        {/* "Prêt ?" pulse */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ duration: 1.1, delay: 0.55, times: [0, 0.45, 1] }}
          className="mt-7 text-[10px] uppercase tracking-[0.35em]"
          style={{ color: `${catColor}60` }}
        >
          Prêt ?
        </motion.p>
      </div>

      {/* Bottom progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        initial={{ scaleX: 1, transformOrigin: "right" }}
        animate={{ scaleX: 0, transformOrigin: "right" }}
        transition={{ duration: 1.48, delay: 0.02, ease: "linear" }}
        style={{ background: `linear-gradient(90deg, transparent, ${catColor}80, ${catColor})` }}
      />
    </motion.div>
  );
}
