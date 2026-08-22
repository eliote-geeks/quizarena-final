import { useNavigate, useLocation, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import CurrencyBadge from "./CurrencyBadge";
import {
  Home, Trophy, BarChart2, Wallet, User, Crown, BrainCircuit,
  LogOut, Sun, Moon, ChevronRight,
} from "lucide-react";

const NAV = [
  { to: "/",            icon: Home,      label: "Accueil"    },
  { to: "/tournaments", icon: Trophy,    label: "Tournois"   },
  { to: "/leaderboard", icon: BarChart2, label: "Classement" },
  { to: "/wallet",      icon: Wallet,    label: "Wallet"     },
  { to: "/profile",     icon: User,      label: "Profil"     },
  { to: "/vip",         icon: Crown,     label: "VIP"        },
];

function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { coins, user, logout, currency, theme, toggleTheme } = useApp();

  return (
    <aside
      className="flex flex-col h-full shrink-0"
      style={{
        width: 248,
        background: "var(--sidebar)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-6">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 w-full text-left transition hover:opacity-90"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "0 8px 24px -6px var(--accent-glow)",
            }}
          >
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-extrabold text-base leading-none" style={{ color: "var(--text)" }}>
              QuizArena
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
              Culture · Skill
            </div>
          </div>
        </button>
      </div>

      {/* Balance */}
      <div className="mx-3 mb-5">
        <button
          onClick={() => navigate("/wallet")}
          className="w-full rounded-2xl p-4 text-left transition hover:opacity-95"
          style={{
            background: "linear-gradient(180deg, var(--surface), var(--surface-2))",
            border: "1px solid var(--border)",
          }}
        >
          <div className="text-xs font-medium mb-1" style={{ color: "var(--text-faint)" }}>
            Solde
          </div>
          <div className="animate-balance font-display font-extrabold text-2xl leading-none tracking-tight" style={{ color: "var(--text)" }}>
            {formatMoney(coins, currency)}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--text-sub)" }}>
              Solde disponible
            </span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: "var(--text-faint)" }} />
          </div>
        </button>
        <div className="mt-2">
          <CurrencyBadge />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(location.pathname, item.to);
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
              style={{
                background: active ? "var(--active)" : "transparent",
                color: active ? "var(--text)" : "var(--text-sub)",
              }}
              onMouseEnter={(e) => !active && (e.currentTarget.style.background = "var(--hover)")}
              onMouseLeave={(e) => !active && (e.currentTarget.style.background = "transparent")}
            >
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-sm font-medium">{item.label}</span>
              {active && (
                <span
                  className="ml-auto w-1 h-1 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3" style={{ borderTop: "1px solid var(--divider)" }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
            style={{
              background: "var(--surface-2)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            {user?.avatar || "??"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
              {user?.name || "Invité"}
            </div>
            <div className="text-xs truncate" style={{ color: "var(--text-faint)" }}>
              {user?.email || "Compte local"}
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition"
            style={{ color: "var(--text-faint)" }}
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="p-2 rounded-lg transition"
            style={{ color: "var(--text-faint)" }}
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          {[["CGU", "/terms"], ["Vie privée", "/privacy"], ["Remb.", "/refund"]].map(([label, to]) => (
            <Link
              key={to}
              to={to}
              className="text-xs transition hover:opacity-80"
              style={{ color: "var(--text-faint)" }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
