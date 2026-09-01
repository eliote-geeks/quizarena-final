import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import ArenaLoader from "./ArenaLoader";

export default function ProtectedRoute({ children }) {
  const { user, sessionLoading } = useApp();
  const location = useLocation();
  if (sessionLoading) {
    return <ArenaLoader fullScreen label="Connexion sécurisée…" />;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
