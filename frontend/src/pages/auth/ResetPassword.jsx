import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthLeft from "../../components/AuthLeft";
import * as api from "../../lib/api";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ArrowLeft, Check, BrainCircuit } from "lucide-react";
import AuthInput from "../../components/AuthInput";

const AMBER = "#E5A800";
const RESEND_COOLDOWN_S = 60;

function pwStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const STRENGTH_COLOR = ["", "#FF6B6B", "#FDCB6E", AMBER, "#5DD66E"];
const STRENGTH_LABEL = ["", "Faible", "Moyen", "Bon", "Fort"];

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const identifier = location.state?.identifier || "";

  const [digits, setDigits]       = useState(["", "", "", "", "", ""]);
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [errors, setErrors]       = useState({});
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_S);
  const inputsRef = useRef([]);

  // Cette page n'a de sens qu'en venant de "Mot de passe oublié" (elle a
  // besoin de savoir à qui appartient le code) — un accès direct renvoie
  // sans casser, plutôt qu'un formulaire qui échouera de toute façon.
  useEffect(() => {
    if (!identifier) navigate("/forgot-password", { replace: true });
  }, [identifier, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const strength = pwStrength(password);

  const validate = () => {
    const e = {};
    if (digits.some((d) => !d)) e.code = "Saisis les 6 chiffres du code reçu par e-mail.";
    if (!password) e.password = "Le mot de passe est requis.";
    else if (password.length < 8) e.password = "Min. 8 caractères.";
    if (!confirm) e.confirm = "Confirme ton mot de passe.";
    else if (confirm !== password) e.confirm = "Les mots de passe ne correspondent pas.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await api.resetPassword({ identifier, code: digits.join(""), newPassword: password });
      setDone(true);
    } catch (requestError) {
      setErrors({ code: requestError.message || "Code invalide ou expiré." });
      setDigits(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setErrors((o) => ({ ...o, code: "" }));
    if (clean && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split("");
    while (next.length < 6) next.push("");
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputsRef.current[index - 1]?.focus();
  };

  const resend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.forgotPassword(identifier);
      setResendCooldown(RESEND_COOLDOWN_S);
    } catch { /* réponse toujours générique côté serveur, rien à afficher de plus */ }
  };

  return (
    <div
      className="min-h-screen grid lg:grid-cols-[5fr_7fr]"
      style={{ background: "var(--qa-page)", color: "var(--qa-text)" }}
    >
      <AuthLeft />

      <div className="auth-form-panel flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm mx-auto"
        >
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: AMBER, color: "#07070F" }}><BrainCircuit className="w-4 h-4" /></div>
            <span className="font-display font-bold text-lg" style={{ color: "var(--qa-text)" }}>
              Quiz<span style={{ color: AMBER }}>Arena</span>
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Link
                  to="/forgot-password"
                  className="flex items-center gap-1.5 text-sm font-semibold mb-8 hover:opacity-70"
                  style={{ color: "var(--qa-text-sub)" }}
                >
                  <ArrowLeft className="w-4 h-4" /> Retour
                </Link>

                <div className="mb-8">
                  <h1 className="font-display font-bold text-3xl mb-1" style={{ color: "var(--qa-text)" }}>
                    Nouveau mot de passe
                  </h1>
                  <p className="text-sm" style={{ color: "var(--qa-text-sub)" }}>
                    Code envoyé à <strong style={{ color: "var(--qa-text)" }}>{identifier}</strong>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Code OTP */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--qa-text-sub)" }}>
                      Code reçu par e-mail
                    </label>
                    <div className="flex justify-center gap-2" onPaste={handlePaste}>
                      {digits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => (inputsRef.current[i] = el)}
                          value={d}
                          onChange={(e) => handleDigitChange(i, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(i, e)}
                          disabled={loading}
                          inputMode="numeric"
                          maxLength={1}
                          className="h-12 w-9 rounded-xl text-center font-display text-xl font-bold outline-none transition disabled:opacity-50"
                          style={{
                            background: "var(--qa-active)",
                            border: `1px solid ${errors.code ? "#FF6B6B" : "var(--qa-border)"}`,
                            color: "var(--qa-text)",
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = AMBER)}
                          onBlur={(e) => (e.currentTarget.style.borderColor = errors.code ? "#FF6B6B" : "var(--qa-border)")}
                        />
                      ))}
                    </div>
                    {errors.code && <p className="text-xs font-semibold mt-1.5 text-center" style={{ color: "#FF6B6B" }}>{errors.code}</p>}
                    <button
                      type="button"
                      onClick={resend}
                      disabled={resendCooldown > 0}
                      className="mt-2 block w-full text-center text-xs font-bold hover:underline disabled:no-underline disabled:opacity-50"
                      style={{ color: resendCooldown > 0 ? "var(--qa-text-faint)" : AMBER }}
                    >
                      {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : "Renvoyer le code"}
                    </button>
                  </div>

                  {/* New password */}
                  <div>
                    <AuthInput
                      icon={Lock}
                      type={showPw ? "text" : "password"}
                      label="Nouveau mot de passe"
                      value={password}
                      onChange={(v) => { setPassword(v); setErrors(o => ({ ...o, password: "" })); }}
                      placeholder="Min. 8 caractères"
                      autoComplete="new-password"
                      hasError={!!errors.password}
                      trailing={
                        <button type="button" onClick={() => setShowPw(v => !v)} className="hover:opacity-80" style={{ color: "var(--qa-text-faint)" }} tabIndex={-1}>
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    {password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4].map(i => (
                            <div
                              key={i}
                              className="flex-1 h-1 rounded-full transition-all duration-300"
                              style={{ background: i <= strength ? STRENGTH_COLOR[strength] : "var(--qa-active)" }}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold" style={{ color: STRENGTH_COLOR[strength] || "var(--qa-text-sub)" }}>
                          {STRENGTH_LABEL[strength]}
                        </span>
                      </div>
                    )}
                    {errors.password && <p className="text-xs font-semibold mt-1.5" style={{ color: "#FF6B6B" }}>{errors.password}</p>}
                  </div>

                  {/* Confirm */}
                  <AuthInput
                    icon={Lock}
                    type={showPw ? "text" : "password"}
                    label="Confirmer"
                    value={confirm}
                    onChange={(v) => { setConfirm(v); setErrors(o => ({ ...o, confirm: "" })); }}
                    placeholder="Répète ton mot de passe"
                    autoComplete="new-password"
                    error={errors.confirm}
                    trailing={confirm && confirm === password ? <Check className="w-4 h-4" style={{ color: "#5DD66E" }} /> : undefined}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-2xl text-base font-bold transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                    style={{
                      background: AMBER,
                      color: "#07070F",
                      boxShadow: !loading ? `0 12px 28px -12px ${AMBER}66` : "none",
                    }}
                  >
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement…</> : "Réinitialiser"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: "rgba(93,214,110,0.15)", border: "1px solid rgba(93,214,110,0.35)" }}
                >
                  <CheckCircle className="w-10 h-10" style={{ color: "#5DD66E" }} />
                </div>
                <h2 className="font-display font-bold text-2xl mb-2" style={{ color: "var(--qa-text)" }}>
                  Mot de passe mis à jour !
                </h2>
                <p className="text-sm mb-8" style={{ color: "var(--qa-text-sub)" }}>
                  Tu peux maintenant te connecter avec ton nouveau mot de passe.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-4 rounded-2xl text-base font-bold transition hover:opacity-90"
                  style={{
                    background: AMBER,
                    color: "#07070F",
                    boxShadow: `0 12px 28px -12px ${AMBER}66`,
                  }}
                >
                  Aller à la connexion
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
