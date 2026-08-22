import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function ProtectedRoute({ children }) {
  const { user, sessionLoading } = useApp();
  const location = useLocation();
  if (sessionLoading) {
    return <div className="min-h-screen grid place-items-center" style={{ background: "var(--qa-page)", color: "var(--qa-text-sub)" }}>Vérification de la session…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
