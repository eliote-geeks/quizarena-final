import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { useApp } from "../context/AppContext";
import { getRank } from "../lib/eloEngine";
import { Coins } from "lucide-react";

const AMBER = "#E5A800";

export default function Layout() {
  const { coins, elo } = useApp();
  const rank = getRank(elo);

  return (
    <div
      className="flex h-screen overflow-hidden text-white font-body"
      style={{ background: "#0A0A12" }}
    >
      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>

      {/* ── Mobile top bar ── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 border-b border-white/[0.06]"
        style={{ background: "#06060E", height: 48 }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center font-pixel text-[7px] text-black"
            style={{ background: AMBER }}
          >QA</div>
          <span className="font-display font-black text-sm">
            Quiz<span style={{ color: AMBER }}>Arena</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 border border-white/[0.07]">
            <Coins className="w-3 h-3" style={{ color: AMBER }} />
            <span className="font-medium text-xs text-white">{coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 border border-white/[0.07]">
            <span className="text-[10px]">{rank.emoji}</span>
            <span className="font-arcade text-xs" style={{ color: rank.color }}>{elo}</span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto min-w-0 lg:pt-0 pt-[48px]">
        <Outlet />
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0B0B14",
            border: "1px solid rgba(255,165,0,0.25)",
            color: "#fff",
            fontFamily: "Outfit",
          },
        }}
      />
    </div>
  );
}
