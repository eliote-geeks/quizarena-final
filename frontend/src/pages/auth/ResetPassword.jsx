import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthLeft from "../../components/AuthLeft";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

const AMBER = "#E5A800";

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
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [errors, setErrors]       = useState({});

  const strength = pwStrength(password);

  const validate = () => {
    const e = {};
    if (!password) e.password = "Le mot de passe est requis.";
    else if (password.length < 8) e.password = "Min. 8 caractères.";
    if (!confirm) e.confirm = "Confirme ton mot de passe.";
    else if (confirm !== password) e.confirm = "Les mots de passe ne correspondent pas.";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); }, 1300);
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
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: AMBER, color: "#07070F" }}>QA</div>
            <span className="font-display font-bold text-lg" style={{ color: "var(--qa-text)" }}>
              Quiz<span style={{ color: AMBER }}>Arena</span>
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Link
                  to="/login"
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
                    Choisis un mot de passe solide.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New password */}
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--qa-text-sub)" }}>
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--qa-text-faint)" }} />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors(o => ({ ...o, password: "" })); }}
                        placeholder="Min. 8 caractères"
                        autoComplete="new-password"
                        className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-sm outline-none transition-colors"
                        style={{
                          background: "var(--qa-active)",
                          border: `1px solid ${errors.password ? "#FF6B6B" : "var(--qa-border)"}`,
                          color: "var(--qa-text)",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = AMBER)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = errors.password ? "#FF6B6B" : "var(--qa-border)")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-80"
                        style={{ color: "var(--qa-text-faint)" }}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
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
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--qa-text-sub)" }}>
                      Confirmer
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--qa-text-faint)" }} />
                      <input
                        type={showPw ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => { setConfirm(e.target.value); setErrors(o => ({ ...o, confirm: "" })); }}
                        placeholder="Répète ton mot de passe"
                        autoComplete="new-password"
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-colors"
                        style={{
                          background: "var(--qa-active)",
                          border: `1px solid ${errors.confirm ? "#FF6B6B" : confirm && confirm === password ? "#5DD66E" : "var(--qa-border)"}`,
                          color: "var(--qa-text)",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = AMBER)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = errors.confirm ? "#FF6B6B" : confirm && confirm === password ? "#5DD66E" : "var(--qa-border)")}
                      />
                    </div>
                    {errors.confirm && <p className="text-xs font-semibold mt-1.5" style={{ color: "#FF6B6B" }}>{errors.confirm}</p>}
                  </div>

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
