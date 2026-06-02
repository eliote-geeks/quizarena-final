import { motion } from "framer-motion";

const ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
  ["W", "X", "C", "V", "B", "N", "BACK"],
];

export default function PixelKeyboard({ onKey, disabled, accent = "#E5A800" }) {
  return (
    <div className="select-none w-full">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
          {row.map((k) => (
            <motion.button
              key={k}
              type="button"
              onClick={() => !disabled && onKey(k)}
              data-testid={`pkey-${k}`}
              disabled={disabled}
              whileTap={disabled ? {} : { scale: 0.9, y: 2 }}
              className={`pixel-block font-pixel uppercase rounded-sm transition-colors border-2 ${
                k === "BACK"
                  ? "px-3 sm:px-4 text-[8px] sm:text-[9px]"
                  : "w-7 h-7 sm:w-10 sm:h-10 text-[10px] sm:text-xs"
              } flex items-center justify-center`}
              style={{
                background: disabled ? "#1a1a24" : "#12121E",
                borderColor: disabled ? "rgba(255,255,255,0.05)" : `${accent}40`,
                color: disabled ? "#3a3a44" : accent,
                boxShadow: disabled ? "none" : `inset -2px -2px 0 rgba(0,0,0,0.4), 0 0 0 1px ${accent}10`,
              }}
            >
              {k === "BACK" ? "←" : k}
            </motion.button>
          ))}
        </div>
      ))}
    </div>
  );
}
