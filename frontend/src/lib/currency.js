// 1 coin = 1 XAF (FCFA). EUR is fixed peg (655.957 XAF = 1 EUR).
export const CURRENCIES = {
  XAF: { code: "XAF", symbol: "FCFA", flag: "🇨🇲", label: "Franc CFA",    decimals: 0, rate: 1        },
  EUR: { code: "EUR", symbol: "€",    flag: "🇪🇺", label: "Euro",          decimals: 2, rate: 655.957  },
  USD: { code: "USD", symbol: "$",    flag: "🇺🇸", label: "Dollar US",     decimals: 2, rate: 610      },
};

export const CURRENCY_ORDER = ["XAF", "EUR", "USD"];

export function convertFromXAF(amountXAF, currency) {
  return amountXAF / CURRENCIES[currency].rate;
}

export function formatMoney(amountXAF, currency = "XAF", opts = {}) {
  const cur  = CURRENCIES[currency];
  const val  = convertFromXAF(amountXAF, currency);
  const sign = amountXAF >= 0 ? (opts.showPlus && amountXAF > 0 ? "+" : "") : "−";
  const abs  = Math.abs(val);

  let str;
  if (currency === "XAF") {
    // No decimals, space separator: "1 250 FCFA"
    str = Math.round(abs).toLocaleString("fr-FR") + " " + cur.symbol;
  } else {
    // 2 decimals: "€1.91" / "$2.05"
    str = (currency === "EUR" ? cur.symbol : "") +
          abs.toFixed(cur.decimals).replace(".", ",") +
          (currency === "USD" ? " " + cur.symbol : "");
  }
  return sign + str;
}

export function nextCurrency(current) {
  const idx = CURRENCY_ORDER.indexOf(current);
  return CURRENCY_ORDER[(idx + 1) % CURRENCY_ORDER.length];
}
