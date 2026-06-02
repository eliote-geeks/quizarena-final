import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Coins, Globe, Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { to: "/lobby", key: "lobby" },
  { to: "/categories", key: "categories" },
  { to: "/tournaments", key: "tournaments" },
  { to: "/leaderboard", key: "leaderboard" },
  { to: "/wallet", key: "wallet" },
  { to: "/profile", key: "profile" },
];

export default function Navbar() {
  const { t, lang, toggleLang, coins } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0B0B14]/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 group"
          data-testid="nav-home-link"
        >
          <div className="w-9 h-9 rounded-md text-black flex items-center justify-center font-pixel text-[10px] group-hover:rotate-6 transition-transform" style={{ background: "#E5A800" }}>
            QA
          </div>
          <span className="font-display font-black uppercase tracking-tight text-lg">
            Quiz<span style={{ color: "#E5A800" }}>Arena</span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.key}
              to={l.to}
              data-testid={`nav-${l.key}-link`}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium uppercase tracking-wider transition-colors rounded-md ${
                  isActive
                    ? "text-[#E5A800] bg-white/5"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`
              }
            >
              {t.nav[l.key]}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md bg-black/40 border"
            data-testid="wallet-balance-display"
            style={{ borderColor: "rgba(229,168,0,0.3)" }}
          >
            <Coins className="w-4 h-4" style={{ color: "#E5A800" }} />
            <span className="font-arcade text-xl leading-none" style={{ color: "#E5A800" }}>
              {coins.toLocaleString()}
            </span>
          </div>
          <button
            onClick={toggleLang}
            data-testid="lang-toggle-btn"
            className="px-3 py-2 rounded-md bg-black/40 border border-white/10 hover:border-[#E5A800]/50 transition-colors flex items-center gap-2 text-xs uppercase tracking-widest font-medium"
          >
            <Globe className="w-4 h-4" />
            {lang.toUpperCase()}
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden p-2 rounded-md border border-white/10"
            data-testid="nav-mobile-toggle"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-[#0B0B14]/95 px-6 py-4 flex flex-col gap-2">
          {links.map((l) => (
            <NavLink
              key={l.key}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `px-4 py-3 text-sm uppercase tracking-wider rounded-md ${
                  isActive ? "text-[#E5A800] bg-white/5" : "text-slate-300 hover:bg-white/5"
                }`
              }
            >
              {t.nav[l.key]}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
