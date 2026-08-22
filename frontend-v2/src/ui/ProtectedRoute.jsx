import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader } from "./index";
import GlobalDuelWatcher from "./GlobalDuelWatcher";
import { useAuth } from "../context/AuthContext";

/** Bloque l'accès aux écrans qui ont besoin d'un compte réel (solde,
 * parties, profil). Le temps de l'hydratation initiale (`!ready`), un
 * chargement animé plutôt qu'un écran vide ou un flash de redirect.
 *
 * Garde l'URL visée (`state.from`) pour y revenir après connexion — sans
 * ça, un lien d'invitation à un duel (/duel/join/CODE) ouvert sans être
 * connecté renverrait vers le lobby après le login, pas vers le duel. */
export default function ProtectedRoute() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loader full />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return (
    <>
      <GlobalDuelWatcher />
      <Outlet />
    </>
  );
}
