import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { translations } from "../i18n/translations";
import { CURRENCY_ORDER } from "../lib/currency";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLang]         = useState("fr");
  const [coins, setCoins]       = useState(12450); // 1 coin = 1 XAF
  const [elo, setElo]           = useState(1050);
  const [dailyDone, setDailyDone] = useState(false);

  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("qa_theme") || "dark";
  });

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "light") {
      html.classList.add("light");
    } else {
      html.classList.remove("light");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("qa_theme", next);
      return next;
    });
  }, []);

  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem("qa_currency") || "XAF";
  });

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("qa_user")); }
    catch { return null; }
  });

  // VIP progression — 30 victoires ET 5 parrainages validés
  const [wins, setWins]             = useState(() => Number(localStorage.getItem("qa_wins")) || 12);
  const [referrals, setReferrals]   = useState(() => Number(localStorage.getItem("qa_referrals")) || 2);

  const VIP_WINS_TARGET     = 30;
  const VIP_REFERRAL_TARGET = 5;
  const isVip = wins >= VIP_WINS_TARGET && referrals >= VIP_REFERRAL_TARGET;

  const addWin = useCallback(() => {
    setWins((w) => {
      const next = w + 1;
      localStorage.setItem("qa_wins", String(next));
      return next;
    });
  }, []);

  const addReferral = useCallback(() => {
    setReferrals((r) => {
      const next = r + 1;
      localStorage.setItem("qa_referrals", String(next));
      return next;
    });
  }, []);

  // Onboarding: shown on first login
  const [onboardingSeen, setOnboardingSeen] = useState(() => localStorage.getItem("qa_onboarding_seen") === "1");
  const markOnboardingSeen = useCallback(() => {
    localStorage.setItem("qa_onboarding_seen", "1");
    setOnboardingSeen(true);
  }, []);
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem("qa_onboarding_seen");
    setOnboardingSeen(false);
  }, []);

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

  const setCurrency = useCallback((code) => {
    if (CURRENCY_ORDER.includes(code)) {
      localStorage.setItem("qa_currency", code);
      setCurrencyState(code);
    }
  }, []);

  const value = useMemo(() => {
    const t = translations[lang];
    return {
      lang,
      setLang,
      toggleLang: () => setLang((l) => (l === "fr" ? "en" : "fr")),
      t,
      coins,      // balance in XAF
      setCoins,
      addCoins: (amount) => setCoins((c) => Math.max(0, c + amount)),
      elo,
      updateElo: setElo,
      dailyDone,
      setDailyDone,
      currency,
      setCurrency,
      theme,
      toggleTheme,
      user,
      login,
      register,
      logout,
      wins,
      addWin,
      referrals,
      addReferral,
      isVip,
      vipTargets: { wins: VIP_WINS_TARGET, referrals: VIP_REFERRAL_TARGET },
      onboardingSeen,
      markOnboardingSeen,
      resetOnboarding,
    };
  }, [
    lang, coins, elo, dailyDone, currency, setCurrency, theme, toggleTheme,
    user, login, register, logout,
    wins, addWin, referrals, addReferral, isVip,
    onboardingSeen, markOnboardingSeen, resetOnboarding,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
