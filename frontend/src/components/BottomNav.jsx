import { useNavigate, useLocation } from "react-router-dom";
import { Home, Trophy, BarChart2, Wallet, Crown, Users } from "lucide-react";
import { runWithDuelExitGuard } from "../lib/duelNavigation";

// Le statut VIP est une destination à part entière, également sur mobile.
const NAV = [
  { to: "/",            icon: Home,      label: "Accueil"    },
  { to: "/tournaments", icon: Trophy,    label: "Tournois"   },
  { to: "/leaderboard", icon: BarChart2, label: "Classement" },
  { to: "/wallet",      icon: Wallet,    label: "Wallet"     },
  { to: "/vip",         icon: Crown,     label: "VIP"        },
];

function isActive(pathname, to) {
  if (to === "/") return pathname === "/";
  return pathname.startsWith(to);
}

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around glass"
      style={{
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(location.pathname, item.to);
        return (
          <button
            key={item.to}
            onClick={() => runWithDuelExitGuard(() => navigate(item.to), item.label)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition"
            style={{ color: active ? "var(--accent)" : "var(--text-faint)" }}
          >
            <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
            <span className="text-xs font-medium" style={{ fontSize: "10px" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
