import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { translations } from "../i18n/translations";
import { CURRENCY_ORDER } from "../lib/currency";
import * as api from "../lib/api";

const AppContext = createContext(null);
// L'édition Classic possède son propre backend et sa propre base. Ses données
// de session navigateur ne doivent donc jamais réutiliser celles de l'autre
// QuizArena, même lorsque les deux applications partagent le même domaine.
const USER_CACHE_KEY = "qa_classic_user";

function normalizeUser(raw) {
  if (!raw) return null;
  const name = raw.username || raw.name || "Joueur";
  return { ...raw, name, username: name, avatar: name.substring(0, 2).toUpperCase(), elo: raw.eloRating ?? raw.elo ?? 1000 };
}

function readCachedUser() {
  try { return normalizeUser(JSON.parse(localStorage.getItem(USER_CACHE_KEY))); }
  catch { return null; }
}

export function AppProvider({ children }) {
  const [lang, setLang] = useState("fr");
  const [coins, setCoins] = useState(0);
  const [elo, setElo] = useState(1000);
  const [dailyDone, setDailyDone] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(() => Boolean(api.getToken()));
  const [user, setUser] = useState(readCachedUser);
  const [stats, setStats] = useState(null);
  const [theme, setThemeState] = useState(() => localStorage.getItem("qa_classic_theme") || "dark");
  const [currency, setCurrencyState] = useState(() => localStorage.getItem("qa_classic_currency") || "XAF");
  const [onboardingSeen, setOnboardingSeen] = useState(() => localStorage.getItem("qa_classic_onboarding_seen") === "1");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  const cacheUser = useCallback((raw) => {
    const normalized = normalizeUser(raw);
    if (normalized) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(normalized));
    else localStorage.removeItem(USER_CACHE_KEY);
    setUser(normalized);
    setElo(normalized?.elo ?? 1000);
    return normalized;
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!api.getToken()) { setCoins(0); return null; }
    const wallet = await api.getWallet();
    setCoins(wallet.balanceCoins ?? 0);
    return wallet;
  }, []);

  const refreshSession = useCallback(async () => {
    if (!api.getToken()) {
      cacheUser(null); setStats(null); setCoins(0); setSessionLoading(false); return null;
    }
    try {
      const [identity, wallet] = await Promise.all([api.getMe(), api.getWallet()]);
      const normalized = cacheUser(identity.user);
      setStats(identity.stats ?? null);
      setCoins(wallet.balanceCoins ?? 0);
      return normalized;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        api.setToken(null); cacheUser(null); setStats(null); setCoins(0);
      }
      throw error;
    } finally { setSessionLoading(false); }
  }, [cacheUser]);

  useEffect(() => {
    if (api.getToken()) refreshSession().catch(() => {});
    else setSessionLoading(false);
  }, [refreshSession]);

  const login = useCallback(async (identifier, password) => {
    const result = await api.loginAccount({ identifier, password });
    api.setToken(result.token); cacheUser(result.user); localStorage.setItem("qa_classic_onboarding_seen", "1"); setOnboardingSeen(true);
    await Promise.all([refreshWallet(), refreshSession()]);
    return result.user;
  }, [cacheUser, refreshWallet, refreshSession]);

  const register = useCallback(async (username, email, phone, password) => {
    const result = await api.registerAccount({ username, email, phone, password });
    api.setToken(result.token); cacheUser(result.user); localStorage.setItem("qa_classic_onboarding_seen", "1"); setOnboardingSeen(true);
    await Promise.all([refreshWallet(), refreshSession()]);
    return result.user;
  }, [cacheUser, refreshWallet, refreshSession]);

  const logout = useCallback(() => {
    api.setToken(null); cacheUser(null); setStats(null); setCoins(0);
  }, [cacheUser]);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("qa_classic_theme", next); return next;
    });
  }, []);
  const setCurrency = useCallback((code) => {
    if (!CURRENCY_ORDER.includes(code)) return;
    localStorage.setItem("qa_classic_currency", code); setCurrencyState(code);
  }, []);
  const markOnboardingSeen = useCallback(() => {
    localStorage.setItem("qa_classic_onboarding_seen", "1"); setOnboardingSeen(true);
  }, []);
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem("qa_classic_onboarding_seen"); setOnboardingSeen(false);
  }, []);

  // Victoires en duel sur les 30 derniers jours — renvoyées par /api/auth/me
  // (calculées sur le serveur, jamais modifiables côté client).
  const wins = stats?.duelsWon30d ?? 0;
  const isVip = Boolean(user?.isVip || wins >= 30);
  const vipSource = user?.vipSource || (wins >= 30 ? "PERFORMANCE" : null);
  const canCreateTournament = Boolean(user?.canCreateTournament || user?.isAdmin || isVip);
  const value = useMemo(() => ({
    lang, setLang, toggleLang: () => setLang((value) => value === "fr" ? "en" : "fr"), t: translations[lang],
    coins, setCoins, addCoins: refreshWallet, refreshWallet,
    elo, updateElo: setElo, dailyDone, setDailyDone,
    currency, setCurrency, theme, toggleTheme,
    user, stats, sessionLoading, login, register, logout, refreshSession,
    wins, addWin: refreshSession, referrals: 0, addReferral: refreshSession,
    isVip, vipSource, canCreateTournament, vipTargets: { wins: 30 }, onboardingSeen, markOnboardingSeen, resetOnboarding,
  }), [lang, coins, refreshWallet, elo, dailyDone, currency, setCurrency, theme, toggleTheme,
    user, stats, sessionLoading, login, register, logout, refreshSession, wins, isVip, vipSource, canCreateTournament,
    onboardingSeen, markOnboardingSeen, resetOnboarding]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
