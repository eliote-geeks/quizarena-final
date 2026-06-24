import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoomView from "./pages/RoomView";
import MainLobby from "./pages/MainLobby";
import Categories from "./pages/Categories";
import CategoryDetail from "./pages/CategoryDetail";
import QuizPlay from "./pages/QuizPlay";
import DuelSetup from "./pages/DuelSetup";
import DuelPlay from "./pages/DuelPlay";
import Tournaments from "./pages/Tournaments";
import Leaderboard from "./pages/Leaderboard";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import PlayerPage from "./pages/PlayerPage";
import Replays from "./pages/Replays";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Rules from "./pages/Rules";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";

function App() {
  return (
    <div className="App">
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Auth pages (standalone, no sidebar) ── */}
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />

            {/* ── Legal pages (public, standalone) ── */}
            <Route path="/terms"   element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund"  element={<Refund />} />

            {/* ── App (protected, with sidebar) ── */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<MainLobby />} />
              <Route path="room/:categoryId"  element={<RoomView />} />
              <Route path="categories"        element={<Categories />} />
              <Route path="category/:categoryId" element={<CategoryDetail />} />
              <Route path="play/:categoryId"  element={<QuizPlay />} />
              <Route path="duel"              element={<DuelSetup />} />
              <Route path="duel/play"         element={<DuelPlay />} />
              <Route path="tournaments"       element={<Tournaments />} />
              <Route path="leaderboard"       element={<Leaderboard />} />
              <Route path="wallet"            element={<Wallet />} />
              <Route path="profile"           element={<Profile />} />
              <Route path="player/:username"  element={<PlayerPage />} />
              <Route path="replays"           element={<Replays />} />
              <Route path="rules"            element={<Rules />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </div>
  );
}

export default App;
