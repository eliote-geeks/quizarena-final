import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { translations } from "../i18n/translations";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLang]         = useState("fr");
  const [coins, setCoins]       = useState(12450);
  const [elo, setElo]           = useState(1050);
  const [dailyDone, setDailyDone] = useState(false);

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("qa_user")); }
    catch { return null; }
  });

  const login = useCallback((email, name) => {
    const n = name || email.split("@")[0];
    const u = { name: n, email, avatar: n.substring(0, 2).toUpperCase() };
    localStorage.setItem("qa_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const register = useCallback((username, email) => {
    const u = { name: username, email, avatar: username.substring(0, 2).toUpperCase() };
    localStorage.setItem("qa_user", JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("qa_user");
    setUser(null);
  }, []);

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
      elo,
      updateElo: setElo,
      dailyDone,
      setDailyDone,
      user,
      login,
      register,
      logout,
    };
  }, [lang, coins, elo, dailyDone, user, login, register, logout]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
