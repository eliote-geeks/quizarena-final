import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./ui/ProtectedRoute";
import Shell from "./ui/Shell";
import { PageTransition } from "./ui";

import Lobby from "./screens/Lobby";
import Categories from "./screens/Categories";
import CategoryDetail from "./screens/CategoryDetail";
import DuelSetup from "./screens/DuelSetup";
import DuelJoin from "./screens/DuelJoin";
import OpenDuels from "./screens/OpenDuels";
import Duel from "./screens/Duel";
import DuelSpectator from "./screens/DuelSpectator";
import QuizPlay from "./screens/QuizPlay";
import Result from "./screens/Result";
import Tournaments from "./screens/Tournaments";
import TournamentCreate from "./screens/TournamentCreate";
import TournamentDetail from "./screens/TournamentDetail";
import Leaderboard from "./screens/Leaderboard";
import Wallet from "./screens/Wallet";
import Profile from "./screens/Profile";
import Players from "./screens/Players";
import PlayerProfile from "./screens/PlayerProfile";
import Clans from "./screens/Clans";
import ClanProfile from "./screens/ClanProfile";
import ClanCreate from "./screens/ClanCreate";
import ClanManage from "./screens/ClanManage";
import ClanWars from "./screens/ClanWars";
import ClanWarDetail from "./screens/ClanWarDetail";
import ClanInvite from "./screens/ClanInvite";
import Replays from "./screens/Replays";

import Admin from "./screens/Admin";
import MaintenanceOverlay from "./ui/MaintenanceOverlay";
import Landing from "./screens/Landing";
import Login from "./screens/auth/Login";
import Register from "./screens/auth/Register";
import ForgotPassword from "./screens/auth/ForgotPassword";
import ResetPassword from "./screens/auth/ResetPassword";
import Terms from "./screens/legal/Terms";
import Privacy from "./screens/legal/Privacy";
import Rules from "./screens/legal/Rules";
import Refund from "./screens/legal/Refund";

export default function App() {
  return (
    <AuthProvider>
      <MaintenanceOverlay />
      <BrowserRouter>
        <Routes>
          {/* ── Public, sans chrome (chacun porte son propre grain) ──
              Groupées sous PageTransition pour que la même animation
              d'entrée rejoue à chaque navigation, comme dans Shell. */}
          <Route element={<PageTransition><Outlet /></PageTransition>}>
            <Route path="/landing" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/refund" element={<Refund />} />
          </Route>

          {/* ── Tout le reste a besoin d'un compte réel ── */}
          <Route element={<ProtectedRoute />}>
            {/* Jeu plein écran : le combat n'a pas de nav autour (§ Duel.jsx) */}
            <Route element={<PageTransition><Outlet /></PageTransition>}>
              <Route path="/duel/play" element={<Duel />} />
              <Route path="/duel/spectate/:matchId" element={<DuelSpectator />} />
              <Route path="/duel/join/:code" element={<DuelJoin />} />
              <Route path="/play/:categoryId" element={<QuizPlay />} />
              <Route path="/result" element={<Result />} />
            </Route>

            {/* App, chrome partagé (nav haut desktop / bas mobile) */}
            <Route element={<Shell><Outlet /></Shell>}>
              <Route path="/" element={<Lobby />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/category/:categoryId" element={<CategoryDetail />} />
              <Route path="/duel" element={<DuelSetup />} />
              <Route path="/duels-ouverts" element={<OpenDuels />} />
              <Route path="/tournaments" element={<Tournaments />} />
              <Route path="/tournaments/create" element={<TournamentCreate />} />
              <Route path="/tournaments/:id" element={<TournamentDetail />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/players" element={<Players />} />
              <Route path="/player/:username" element={<PlayerProfile />} />
              <Route path="/clans" element={<Clans />} />
              <Route path="/clans/create" element={<ClanCreate />} />
              <Route path="/clans/:id/manage" element={<ClanManage />} />
              <Route path="/clans/:id" element={<ClanProfile />} />
              <Route path="/clan-invite/:token" element={<ClanInvite />} />
              <Route path="/clan-wars" element={<ClanWars />} />
              <Route path="/clan-wars/:id" element={<ClanWarDetail />} />
              <Route path="/replays" element={<Replays />} />
            </Route>

            {/* Admin — layout propre, hors Shell */}
            <Route element={<PageTransition><Outlet /></PageTransition>}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
