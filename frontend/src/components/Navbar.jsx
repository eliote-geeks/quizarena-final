import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getRank } from "../lib/eloEngine";
import { Coins, Globe, Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { to: "/categories", key: "categories" },
  { to: "/tournaments", key: "tournaments" },
  { to: "/replays", label: "Replays" },
  { to: "/leaderboard", key: "leaderboard" },
  { to: "/wallet", key: "wallet" },
  { to: "/profile", key: "profile" },
];

export default function Navbar() {
  const { t, lang, toggleLang, coins, elo } = useApp();
  const rank = getRank(elo);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0B0B14]/90 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 group flex-shrink-0"
          data-testid="nav-home-link"
        >
          <div
            className="w-7 h-7 rounded-md text-black flex items-center justify-center font-pixel text-[8px] group-hover:opacity-90 transition"
            style={{ background: "#E5A800" }}
          >
            QA
          </div>
          <span className="font-display font-black uppercase tracking-tight text-sm hidden sm:block">
            Quiz<span style={{ color: "#E5A800" }}>Arena</span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-0.5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.key}-link`}
              className={({ isActive }) =>
                `px-3 py-1.5 text-xs font-medium tracking-wide transition-colors rounded-md ${
                  isActive
                    ? "text-white bg-white/[0.08]"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`
              }
            >
              {l.label ?? t.nav[l.key]}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/40 border border-white/[0.08]"
            data-testid="wallet-balance-display"
          >
            <Coins className="w-3.5 h-3.5" style={{ color: "#E5A800" }} />
            <span className="font-medium text-sm text-white">
              {coins.toLocaleString()}
            </span>
          </div>
          <div
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-black/40 border border-white/[0.08]"
            title={rank.name}
          >
            <span className="text-xs leading-none">{rank.emoji}</span>
            <span className="font-arcade text-sm leading-none" style={{ color: rank.color }}>
              {elo}
            </span>
          </div>
          <button
            onClick={toggleLang}
            data-testid="lang-toggle-btn"
            className="px-2.5 py-1.5 rounded-md bg-black/40 border border-white/[0.08] hover:border-white/20 transition flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-medium text-white/50 hover:text-white/80"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang.toUpperCase()}
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="lg:hidden p-1.5 rounded-md border border-white/10 text-white/50"
            data-testid="nav-mobile-toggle"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/[0.06] bg-[#0B0B14]/98 px-4 py-3 flex flex-col gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2.5 text-xs tracking-wide rounded-md ${
                  isActive ? "text-white bg-white/[0.08]" : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`
              }
            >
              {l.label ?? t.nav[l.key]}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
