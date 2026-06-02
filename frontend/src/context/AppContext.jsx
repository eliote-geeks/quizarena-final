import { createContext, useContext, useState, useMemo } from "react";
import { translations } from "../i18n/translations";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLang] = useState("fr");
  const [coins, setCoins] = useState(12450);

  const value = useMemo(() => {
    const t = translations[lang];
    return {
      lang,
      setLang,
      toggleLang: () => setLang((l) => (l === "fr" ? "en" : "fr")),
      t,
      coins,
      setCoins,
      addCoins: (amount) => setCoins((c) => Math.max(0, c + amount)),
    };
  }, [lang, coins]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
