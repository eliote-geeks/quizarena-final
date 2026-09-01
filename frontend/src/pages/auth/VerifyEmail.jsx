import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AuthLeft from "../../components/AuthLeft";
import * as api from "../../lib/api";
import { useApp } from "../../context/AppContext";
import { Loader2, Mail } from "lucide-react";

const AMBER = "#E5A800";
const RESEND_COOLDOWN_S = 60;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, sessionLoading, refreshSession } = useApp();
  const from = location.state?.from || "/";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_S);
  const inputsRef = useRef([]);

  // Page accessible seulement avec une session valide (elle appelle des
  // routes authentifiées) — déjà vérifié ou pas connecté : rien à faire ici.
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) navigate("/login", { replace: true });
    else if (user.emailVerified) navigate(from, { replace: true });
  }, [user, sessionLoading, from, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const submit = async (code) => {
    setLoading(true);
    setError("");
    try {
      await api.verifyEmail(code);
      await refreshSession();
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Code incorrect.");
      setDigits(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, value) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) inputsRef.current[index + 1]?.focus();
    if (next.every((d) => d !== "")) submit(next.join(""));
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split("");
    while (next.length < 6) next.push("");
    setDigits(next);
    if (pasted.length === 6) submit(pasted);
    else inputsRef.current[pasted.length]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputsRef.current[index - 1]?.focus();
  };

  const resend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await api.resendVerification();
      setResendCooldown(RESEND_COOLDOWN_S);
    } catch (requestError) {
      setError(requestError.message || "Impossible de renvoyer le code pour l'instant.");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[5fr_7fr]" style={{ background: "var(--qa-page)", color: "var(--qa-text)" }}>
      <AuthLeft />

      <div className="auth-form-panel flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto w-full max-w-sm text-center"
        >
          <div
            className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl"
            style={{ background: "rgba(229,168,0,.12)" }}
          >
            <Mail className="h-7 w-7" style={{ color: AMBER }} />
          </div>

          <h1 className="font-display text-2xl font-extrabold" style={{ color: "var(--qa-text)" }}>
            Vérifie ton adresse
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--qa-text-sub)" }}>
            {user?.email
              ? <>On a envoyé un code à 6 chiffres à <strong style={{ color: "var(--qa-text)" }}>{user.email}</strong>.</>
              : "On a envoyé un code à 6 chiffres à ton adresse e-mail."}
          </p>

          <div className="mt-8 flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                inputMode="numeric"
                maxLength={1}
                className="h-14 w-11 rounded-xl text-center font-display text-2xl font-bold outline-none transition disabled:opacity-50"
                style={{ background: "var(--qa-active)", border: "1px solid var(--qa-border)", color: "var(--qa-text)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = AMBER)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--qa-border)")}
              />
            ))}
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs" style={{ color: "var(--qa-text-faint)" }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />Vérification…
            </div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl px-4 py-2.5 text-xs font-medium"
              style={{ background: "rgba(255,107,107,.1)", color: "#FF6B6B" }}
            >
              {error}
            </motion.p>
          )}

          <button
            onClick={resend}
            disabled={resendCooldown > 0}
            className="mt-6 text-xs font-bold hover:underline disabled:no-underline disabled:opacity-50"
            style={{ color: resendCooldown > 0 ? "var(--qa-text-faint)" : AMBER }}
          >
            {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : "Renvoyer le code"}
          </button>

          <button
            onClick={() => navigate(from, { replace: true })}
            className="mt-8 block w-full text-center text-xs font-semibold hover:underline"
            style={{ color: "var(--qa-text-faint)" }}
          >
            Plus tard — continuer sans vérifier
          </button>
        </motion.div>
      </div>
    </div>
  );
}
