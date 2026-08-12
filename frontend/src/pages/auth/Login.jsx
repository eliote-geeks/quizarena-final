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
  const from = location.state?.from?.pathname || "/";

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
    }, 1000);
  };

  return (
    <div
      className="min-h-screen grid lg:grid-cols-[5fr_7fr]"
      style={{ background: "var(--qa-page)", color: "var(--qa-text)" }}
    >
      <AuthLeft />

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm mx-auto"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background: AMBER, color: "#07070F" }}
            >QA</div>
            <span className="font-display font-bold text-lg" style={{ color: "var(--qa-text)" }}>
              Quiz<span style={{ color: AMBER }}>Arena</span>
            </span>
          </div>

          <div className="mb-8">
            <h1 className="font-display font-bold text-3xl mb-1" style={{ color: "var(--qa-text)" }}>
              Connexion
            </h1>
            <p className="text-sm" style={{ color: "var(--qa-text-sub)" }}>
              Content de te revoir dans l'arène.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthInput
              icon={Mail}
              type="email"
              label="Adresse email"
              value={email}
              onChange={(v) => { setEmail(v); setError(""); }}
              placeholder="ton@email.com"
              autoComplete="email"
              hasError={!!(error && !email)}
            />

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--qa-text-sub)" }}>
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--qa-text-faint)" }} />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-sm outline-none transition-colors"
                  style={{
                    background: "var(--qa-active)",
                    border: "1px solid var(--qa-border)",
                    color: "var(--qa-text)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = AMBER)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--qa-border)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition hover:opacity-80"
                  style={{ color: "var(--qa-text-faint)" }}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRemember((v) => !v)}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center border transition"
                  style={{
                    background: remember ? AMBER : "transparent",
                    borderColor: remember ? AMBER : "var(--qa-border-md)",
                  }}
                >
                  {remember && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="#07070F" strokeWidth="2">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--qa-text-sub)" }}>Se souvenir</span>
              </button>
              <Link
                to="/forgot-password"
                className="text-xs font-bold hover:underline"
                style={{ color: AMBER }}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: "rgba(255,107,107,0.10)",
                  border: "1px solid rgba(255,107,107,0.25)",
                  color: "#FF6B6B",
                }}
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-base font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                background: AMBER,
                color: "#07070F",
                boxShadow: !loading ? `0 12px 28px -12px ${AMBER}66` : "none",
              }}
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Connexion…</>
              ) : "Se connecter"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1" style={{ borderTop: "1px solid var(--qa-divider)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--qa-text-faint)" }}>ou</span>
            <div className="flex-1" style={{ borderTop: "1px solid var(--qa-divider)" }} />
          </div>

          <p className="text-center text-sm" style={{ color: "var(--qa-text-sub)" }}>
            Pas encore de compte ?{" "}
            <Link
              to="/register"
              className="font-bold hover:underline"
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

function AuthInput({ icon: Icon, label, hasError, ...props }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--qa-text-sub)" }}>
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--qa-text-faint)" }} />
        <input
          {...props}
          onChange={(e) => props.onChange?.(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-colors"
          style={{
            background: "var(--qa-active)",
            border: `1px solid ${hasError ? "#FF6B6B" : "var(--qa-border)"}`,
            color: "var(--qa-text)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = AMBER)}
          onBlur={(e) => (e.currentTarget.style.borderColor = hasError ? "#FF6B6B" : "var(--qa-border)")}
        />
      </div>
    </div>
  );
}
