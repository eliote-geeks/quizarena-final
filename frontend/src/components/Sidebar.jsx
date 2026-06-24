import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  CATEGORIES, ONLINE_PLAYERS, LIVE_MATCHES, CATEGORY_COLORS,
} from "../data/mockData";
import { getRank } from "../lib/eloEngine";
import { Link } from "react-router-dom";
import {
  Coins, Trophy, BarChart2, Wallet, User, Star, CheckCircle,
  RotateCcw, LogOut, BookOpen,
} from "lucide-react";

const AMBER = "#E5A800";

const BOTTOM_NAV = [
  { to: "/tournaments", icon: Trophy,     label: "Tournois"     },
  { to: "/replays",     icon: RotateCcw,  label: "Replays"      },
  { to: "/leaderboard", icon: BarChart2,  label: "Classement"   },
  { to: "/wallet",      icon: Wallet,     label: "Portefeuille" },
  { to: "/profile",     icon: User,       label: "Profil"       },
  { to: "/rules",       icon: BookOpen,   label: "Règles"       },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { coins, elo, dailyDone, user, logout } = useApp();
  const rank = getRank(elo);

  const roomMatch = location.pathname.match(/^\/room\/(.+)/);
  const activeRoom = roomMatch ? roomMatch[1] : null;

  return (
    <aside
      className="flex flex-col h-full shrink-0 border-r border-white/[0.06] overflow-y-auto no-scrollbar"
      style={{ width: 210, background: "#06060E" }}
    >
      {/* ── Logo ── */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-4 hover:opacity-80 transition w-full text-left"
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center font-pixel text-[8px] text-black flex-shrink-0"
            style={{ background: AMBER }}
          >
            QA
          </div>
          <span className="font-display font-black text-sm tracking-tight">
            Quiz<span style={{ color: AMBER }}>Arena</span>
          </span>
        </button>

        <div className="flex gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-black/40 border border-white/[0.07] flex-1 min-w-0">
            <Coins className="w-3 h-3 flex-shrink-0" style={{ color: AMBER }} />
            <span className="font-medium text-xs text-white truncate">
              {coins.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-black/40 border border-white/[0.07]">
            <span className="text-[10px] leading-none">{rank.emoji}</span>
            <span className="font-arcade text-xs leading-none" style={{ color: rank.color }}>
              {elo}
            </span>
          </div>
        </div>
      </div>

      {/* ── Daily challenge ── */}
      <button
        onClick={() => !dailyDone && navigate("/play/sciences?daily=1")}
        className="mx-3 mt-3 mb-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all"
        style={{
          background: dailyDone ? "rgba(255,255,255,0.02)" : `${AMBER}0C`,
          borderColor: dailyDone ? "rgba(255,255,255,0.06)" : `${AMBER}30`,
          cursor: dailyDone ? "default" : "pointer",
        }}
      >
        <div
          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: dailyDone ? "rgba(255,255,255,0.05)" : `${AMBER}20`,
            color: dailyDone ? "#5DD66E" : AMBER,
          }}
        >
          {dailyDone ? <CheckCircle className="w-3 h-3" /> : <Star className="w-3 h-3" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold text-white/70">Défi du Jour</div>
          <div
            className="text-[9px] font-semibold"
            style={{ color: dailyDone ? "#5DD66E" : AMBER }}
          >
            {dailyDone ? "Complété ✓" : "+500 bonus"}
          </div>
        </div>
      </button>

      {/* ── Rooms label ── */}
      <div className="px-4 pt-4 pb-1.5">
        <span className="text-[9px] uppercase tracking-[0.14em] text-white/20 font-semibold">
          Salles
        </span>
      </div>

      {/* ── Category rooms ── */}
      <div className="flex-1 px-2 space-y-0.5 pb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const color = CATEGORY_COLORS[cat.id] || AMBER;
          const isActive = activeRoom === cat.id;
          const inRoom = ONLINE_PLAYERS.filter(
            (p) => p.room === cat.id && p.status !== "away"
          ).length;
          const hasLive = LIVE_MATCHES.some((m) => m.category === cat.id);

          return (
            <button
              key={cat.id}
              onClick={() => navigate("/room/" + cat.id)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all hover:bg-white/[0.03]"
              style={{
                background: isActive ? `${color}10` : "transparent",
                borderLeft: `2px solid ${isActive ? color : "transparent"}`,
              }}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{
                  background: isActive ? `${color}22` : "rgba(255,255,255,0.05)",
                  color: isActive ? color : "rgba(255,255,255,0.3)",
                }}
              >
                <Icon className="w-3 h-3" />
              </div>
              <span
                className="text-xs font-medium flex-1 truncate"
                style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.45)" }}
              >
                {cat.name.fr}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {hasLive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#FF5555] animate-pulse"
                  />
                )}
                {inRoom > 0 && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded leading-none"
                    style={{ background: `${color}18`, color }}
                  >
                    {inRoom}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Divider ── */}
      <div className="mx-3 border-t border-white/[0.05]" />

      {/* ── Bottom nav ── */}
      <div className="px-2 py-2 space-y-0.5">
        {BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition hover:bg-white/[0.03]"
              style={{
                background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.35)",
              }}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}

        {/* User + logout */}
        <div className="pt-2 mt-1 border-t border-white/[0.05]">
          <div className="flex items-center gap-2 px-2.5 py-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
              style={{ background: `${AMBER}20`, color: AMBER }}
            >
              {user?.avatar || "??"}
            </div>
            <span className="text-[11px] text-white/50 truncate flex-1">{user?.name || "Invité"}</span>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="text-white/20 hover:text-[#FF6B6B] transition flex-shrink-0"
              title="Se déconnecter"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Legal links */}
          <div className="flex items-center justify-center gap-2 px-2.5 pb-3">
            {[["CGU", "/terms"], ["Vie privée", "/privacy"], ["Remb.", "/refund"]].map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className="text-[8px] text-white/15 hover:text-white/35 transition leading-none"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
