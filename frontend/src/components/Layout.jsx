import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import OnboardingModal from "./OnboardingModal";
import { Outlet, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useApp } from "../context/AppContext";
import { getRank } from "../lib/eloEngine";
import { formatMoney } from "../lib/currency";
import { Coins } from "lucide-react";

export default function Layout() {
  const { coins, elo, currency } = useApp();
  const navigate = useNavigate();
  const rank = getRank(elo);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>

      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 glass"
        style={{
          height: 56,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 transition hover:opacity-90"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow: "0 6px 16px -4px var(--accent-glow)",
            }}
          >
            Q
          </div>
          <span className="font-display font-semibold text-base" style={{ color: "var(--text)" }}>
            QuizArena
          </span>
        </button>

        <button
          onClick={() => navigate("/wallet")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full transition hover:opacity-95"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <Coins className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {formatMoney(coins, currency)}
          </span>
          <span className="text-xs" style={{ color: "var(--text-faint)" }}>
            · {rank.name}
          </span>
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="lg:hidden" style={{ height: 56 }} />
        <Outlet />
        <div className="lg:hidden" style={{ height: 72 }} />
      </main>

      <BottomNav />

      <OnboardingModal />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface)",
            border: "1px solid var(--border-md)",
            color: "var(--text)",
            fontFamily: "Inter, sans-serif",
            borderRadius: 12,
          },
        }}
      />
    </div>
  );
}
