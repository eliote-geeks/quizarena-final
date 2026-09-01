import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Toaster } from "sonner";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import { BrainCircuit, Coins } from "lucide-react";
import DuelChallengePrompt from "./DuelChallengePrompt";
import MobileProfileMenu from "./MobileProfileMenu";
import PushToggleButton from "./PushToggleButton";
import GlobalMatchRedirect from "./GlobalMatchRedirect";
import PushPermissionPrompt from "./PushPermissionPrompt";
import ActiveDuelGuard from "./ActiveDuelGuard";
import { runWithDuelExitGuard } from "../lib/duelNavigation";

export default function Layout() {
  const { coins, currency } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useReducedMotion();

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
          onClick={() => runWithDuelExitGuard(() => navigate("/"), "l’accueil")}
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => runWithDuelExitGuard(() => navigate("/wallet"), "le portefeuille")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition hover:opacity-95"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Coins className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {formatMoney(coins, currency)}
            </span>
          </button>
          <PushToggleButton className="h-8 w-8" />
          <MobileProfileMenu />
        </div>
      </div>

      <main className="relative flex-1 overflow-y-auto min-w-0">
        <div className="lg:hidden" style={{ height: 56 }} />
        <motion.div
          key={`route-progress-${location.pathname}${location.search}`}
          className="pointer-events-none sticky top-0 z-[60] h-0.5 origin-left"
          style={{ background: "var(--accent)" }}
          initial={{ scaleX: 0.05, opacity: 1 }}
          animate={{ scaleX: [0.05, 0.72, 1], opacity: [1, 1, 0] }}
          transition={{ duration: reducedMotion ? .18 : .42, ease: "easeOut" }}
          aria-hidden="true"
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={`${location.pathname}${location.search}`}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? .1 : .18, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <div className="lg:hidden" style={{ height: 72 }} />
      </main>

      <BottomNav />
      <DuelChallengePrompt />
      <GlobalMatchRedirect />
      <PushPermissionPrompt />
      <ActiveDuelGuard />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface)",
            border: "1px solid var(--border-md)",
            color: "var(--text)",
            fontFamily: "var(--font-body)",
            borderRadius: 12,
          },
        }}
      />
    </div>
  );
}
