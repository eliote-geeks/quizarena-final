import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import AuthLeft from "../../components/AuthLeft";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";

const AMBER = "#E5A800";

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/room/histoire";

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [remember, setRemember]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const validate = () => {
    if (!email.trim()) return "L'adresse email est requise.";
    if (!/\S+@\S+\.\S+/.test(email)) return "Adresse email invalide.";
    if (!password) return "Le mot de passe est requis.";
    return "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    setTimeout(() => {
      login(email, null);
      navigate(from, { replace: true });
    }, 1100);
  };

  return (
    <div
      className="min-h-screen grid lg:grid-cols-[5fr_7fr] font-body"
      style={{ background: "#05050A" }}
    >
      <AuthLeft />

      {/* Right — form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm mx-auto"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center font-pixel text-[8px] text-black"
              style={{ background: AMBER }}
            >QA</div>
            <span className="font-display font-black text-sm text-white">
              Quiz<span style={{ color: AMBER }}>Arena</span>
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-xl font-bold text-white mb-1">Connexion</h1>
            <p className="text-sm text-white/40">
              Content de te revoir dans l'arène.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="ton@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${error && !email ? "rgba(255,107,107,0.5)" : "rgba(255,255,255,0.09)"}`,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `${AMBER}60`)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = `${AMBER}60`)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setRemember((v) => !v)}
                  className="w-4 h-4 rounded flex items-center justify-center border transition cursor-pointer"
                  style={{
                    background: remember ? AMBER : "transparent",
                    borderColor: remember ? AMBER : "rgba(255,255,255,0.2)",
                  }}
                >
                  {remember && (
                    <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-white/40">Se souvenir de moi</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs transition hover:underline"
                style={{ color: AMBER }}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-3 py-2.5 rounded-lg text-xs text-[#FF6B6B] border border-[#FF6B6B]/20"
                style={{ background: "rgba(255,107,107,0.06)" }}
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: AMBER, color: "#07070F" }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Connexion…</>
              ) : "Se connecter"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-white/[0.07]" />
            <span className="text-[11px] text-white/20">ou</span>
            <div className="flex-1 border-t border-white/[0.07]" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-white/35">
            Pas encore de compte ?{" "}
            <Link
              to="/register"
              className="font-semibold transition hover:underline"
              style={{ color: AMBER }}
            >
              Créer un compte
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
