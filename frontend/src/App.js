/* v2.1 - QuestionIntro, real money, 8s duel timer */
import "@/App.css";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import OnboardingModal from "./components/OnboardingModal";
import PageLoadingScreen from "./components/PageLoadingScreen";
import DuelErrorBoundary from "./components/DuelErrorBoundary";

// Chaque page est chargée à la demande (30/08/2026) : auparavant les 25
// pages tenaient dans un seul bundle de ~240 Ko, téléchargé en entier avant
// le premier écran. Ici chaque route ne coûte que son propre code, et le
// découpage crée un vrai temps de chargement entre deux pages — exactement
// ce que l'écran ci-dessous (PageLoadingScreen) est fait pour habiller,
// comme un écran de chargement entre deux niveaux dans un jeu vidéo.
const RoomView = lazy(() => import("./pages/RoomView"));
const MainLobby = lazy(() => import("./pages/MainLobby"));
const Categories = lazy(() => import("./pages/Categories"));
const CategoryDetail = lazy(() => import("./pages/CategoryDetail"));
const QuizPlay = lazy(() => import("./pages/QuizPlay"));
const DuelSetup = lazy(() => import("./pages/DuelSetup"));
const DuelPlay = lazy(() => import("./pages/DuelPlay"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));
const TournamentCreate = lazy(() => import("./pages/TournamentCreate"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Profile = lazy(() => import("./pages/Profile"));
const PlayerPage = lazy(() => import("./pages/PlayerPage"));
const Replays = lazy(() => import("./pages/Replays"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));
const Rules = lazy(() => import("./pages/Rules"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Refund = lazy(() => import("./pages/Refund"));
const PaymentSuccess = lazy(() => import("./pages/PaymentCallback").then((m) => ({ default: m.PaymentSuccess })));
const PaymentCancel = lazy(() => import("./pages/PaymentCallback").then((m) => ({ default: m.PaymentCancel })));
const WalletDeposit = lazy(() => import("./pages/WalletTransaction").then((m) => ({ default: m.WalletDeposit })));
const WalletWithdraw = lazy(() => import("./pages/WalletTransaction").then((m) => ({ default: m.WalletWithdraw })));
const VipPage = lazy(() => import("./pages/VipPage"));
const Players = lazy(() => import("./pages/Players"));

// Fenêtre minimale de l'écran de transition, en millisecondes.
//
// Sans elle, une page déjà en cache (déjà visitée cette session) naviguerait
// instantanément et l'écran de chargement ne s'afficherait jamais — alors
// que le rythme "beat de transition" façon jeu vidéo doit rester le même à
// chaque changement de page, cache ou pas (c'est la demande explicite du
// 30/08 : les tips défilent à chaque passage d'une page à l'autre). Bornée
// volontairement courte : c'est une appli d'argent réel, la vitesse perçue
// compte, donc jamais un vrai temps mort artificiel au-delà de ce nécessaire
// pour lire un tip.
const TRANSITION_MS = 650;

/** Affiche l'écran de transition à chaque changement de route, pendant une
 * durée bornée. Si le code de la page suivante n'est pas encore en cache
 * (§Suspense plus bas), le fallback de Suspense prend le relais et prolonge
 * naturellement l'affichage jusqu'à ce que le chunk soit prêt — les deux
 * déclencheurs utilisent le même composant, donc rien ne "saute" visuellement
 * entre les deux cas. */
function RouteTransitionGate() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const firstRender = useRef(true);
  const timerRef = useRef(null);

  useEffect(() => {
    // Ne pas afficher l'écran de chargement sur le tout premier rendu :
    // c'est le chargement initial de l'application, déjà couvert par
    // l'écran de démarrage du navigateur, pas une "transition".
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), TRANSITION_MS);
    return () => clearTimeout(timerRef.current);
  }, [pathname]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return visible ? <PageLoadingScreen /> : null;
}

function App() {
  return (
    <div className="App">
      <AppProvider>
        <BrowserRouter>
          <OnboardingModal />
          <RouteTransitionGate />
          <Suspense fallback={<PageLoadingScreen />}>
            <Routes>
              {/* ── Auth pages (standalone, no sidebar) ── */}
              <Route path="/login"           element={<Login />} />
              <Route path="/register"        element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password"  element={<ResetPassword />} />
              <Route path="/verify-email"    element={<VerifyEmail />} />

              {/* ── Legal pages (public, standalone) ── */}
              <Route path="/terms"   element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refund"  element={<Refund />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancel"  element={<PaymentCancel />} />

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
                <Route path="play/:categoryId"  element={<DuelErrorBoundary><QuizPlay /></DuelErrorBoundary>} />
                <Route path="duel"              element={<DuelSetup />} />
                <Route path="duel/play"         element={<DuelErrorBoundary><DuelPlay /></DuelErrorBoundary>} />
                <Route path="tournaments"           element={<Tournaments />} />
                <Route path="tournaments/new"       element={<TournamentCreate />} />
                <Route path="tournaments/:tournamentId" element={<TournamentDetail />} />
                <Route path="leaderboard"       element={<Leaderboard />} />
                <Route path="wallet"            element={<Wallet />} />
                <Route path="wallet/deposit"    element={<WalletDeposit />} />
                <Route path="wallet/withdraw"   element={<WalletWithdraw />} />
                <Route path="profile"           element={<Profile />} />
                <Route path="player/:username"  element={<PlayerPage />} />
                <Route path="replays"           element={<Replays />} />
                <Route path="vip"               element={<VipPage />} />
                <Route path="players"           element={<Players />} />
                <Route path="rules"            element={<Rules />} />
                <Route path="tutorial"         element={<Tutorial />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </div>
  );
}

export default App;
