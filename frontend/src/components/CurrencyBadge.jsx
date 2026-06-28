import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { CURRENCIES, nextCurrency, formatMoney } from "../lib/currency";

const AMBER = "#E5A800";

// Animated currency amount — flips when currency changes
export function MoneyDisplay({ amountXAF, className = "", showPlus = false, style = {} }) {
  const { currency } = useApp();
  const str = formatMoney(amountXAF, currency, { showPlus });
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={currency + amountXAF}
        initial={{ rotateX: 90, opacity: 0 }}
        animate={{ rotateX: 0,  opacity: 1 }}
        exit={{    rotateX: -90, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={className}
        style={{ display: "inline-block", ...style }}
      >
        {str}
      </motion.span>
    </AnimatePresence>
  );
}

// Clickable pill to cycle currencies — put in Sidebar or Wallet
export default function CurrencyBadge({ compact = false }) {
  const { currency, setCurrency } = useApp();
  const cur = CURRENCIES[currency];

  return (
    <motion.button
      onClick={() => setCurrency(nextCurrency(currency))}
      whileTap={{ scale: 0.92 }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold transition select-none"
      style={{
        background: `${AMBER}0C`,
        borderColor: `${AMBER}28`,
        color: AMBER,
      }}
      title="Changer de devise"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={currency}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{    y:  8, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="leading-none"
        >
          {cur.flag}
        </motion.span>
      </AnimatePresence>
      {!compact && (
        <span className="leading-none">{cur.code}</span>
      )}
    </motion.button>
  );
}
