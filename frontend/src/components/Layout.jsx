import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import OnboardingModal from "./OnboardingModal";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import { BrainCircuit, Coins } from "lucide-react";

export default function Layout() {
  const { coins, currency } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>

      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 glass"
        style={{ height: 56, borderBottom: "1px solid var(--border)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 transition hover:opacity-90"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            <BrainCircuit className="w-4 h-4" />
          </div>
          <span className="font-display font-semibold text-base" style={{ color: "var(--text)" }}>
            QuizArena
          </span>
        </button>

        <button
          onClick={() => navigate("/wallet")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full transition hover:opacity-95"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <Coins className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {formatMoney(coins, currency)}
          </span>
        </button>
      </div>

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="lg:hidden" style={{ height: 56 }} />
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 18, scale: 0.985, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -14, scale: 0.99, filter: "blur(4px)" }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
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
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
            borderRadius: 12,
          },
        }}
      />
    </div>
  );
}
