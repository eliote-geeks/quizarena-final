import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [balanceCoins, setBalanceCoins] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [ready, setReady] = useState(false); // true dès que l'hydratation initiale est faite

  const refreshWallet = useCallback(async () => {
    const w = await api.getWallet();
    setBalanceCoins(w.balanceCoins);
    setTransactions(w.transactions);
    return w;
  }, []);

  // Hydratation au chargement si un token existe déjà (session persistée).
  useEffect(() => {
    (async () => {
      if (!api.getToken()) {
        setReady(true);
        return;
      }
      try {
        const [{ user, stats }, wallet] = await Promise.all([api.me(), api.getWallet()]);
        setUser(user);
        setStats(stats);
        setBalanceCoins(wallet.balanceCoins);
        setTransactions(wallet.transactions);
      } catch {
        api.setToken(null); // token expiré/invalide
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { token, user } = await api.login({ identifier, password });
    api.setToken(token);
    setUser(user);
    const { stats } = await api.me();
    setStats(stats);
    await refreshWallet();
    return user;
  }, [refreshWallet]);

  const register = useCallback(async (input) => {
    const { token, user } = await api.registerAccount(input);
    api.setToken(token);
    setUser(user);
    setStats({ totalGames: 0, winRateGlobal: 0, avgScore: 0 });
    setBalanceCoins(0);
    setTransactions([]);
    return user;
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
    setBalanceCoins(0);
    setTransactions([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, stats, balanceCoins, transactions, ready, login, register, logout, refreshWallet, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous AuthProvider");
  return ctx;
}
