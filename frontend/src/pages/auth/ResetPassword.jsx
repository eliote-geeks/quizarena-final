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
      className="min-h-screen grid lg:grid-cols-[5fr_7fr] font-body"
      style={{ background: "#05050A" }}
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
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 rounded-md flex items-center justify-center font-pixel text-[8px] text-black" style={{ background: AMBER }}>QA</div>
            <span className="font-display font-black text-sm text-white">Quiz<span style={{ color: AMBER }}>Arena</span></span>
          </div>

          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Link to="/login" className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition mb-8">
                  <ArrowLeft className="w-3.5 h-3.5" /> Retour
                </Link>

                <div className="mb-8">
                  <h1 className="text-xl font-bold text-white mb-1">Nouveau mot de passe</h1>
                  <p className="text-sm text-white/40">Choisis un mot de passe solide.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New password */}
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Nouveau mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors(o => ({ ...o, password: "" })); }}
                        placeholder="Min. 8 caractères"
                        autoComplete="new-password"
                        className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${errors.password ? "rgba(255,107,107,0.4)" : "rgba(255,255,255,0.09)"}`,
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = `${AMBER}60`)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = errors.password ? "rgba(255,107,107,0.4)" : "rgba(255,255,255,0.09)")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition"
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
                              style={{ background: i <= strength ? STRENGTH_COLOR[strength] : "rgba(255,255,255,0.07)" }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px]" style={{ color: STRENGTH_COLOR[strength] }}>
                          {STRENGTH_LABEL[strength]}
                        </span>
                      </div>
                    )}
                    {errors.password && <p className="text-[11px] mt-1.5" style={{ color: "#FF6B6B" }}>{errors.password}</p>}
                  </div>

                  {/* Confirm */}
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5">Confirmer</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => { setConfirm(e.target.value); setErrors(o => ({ ...o, confirm: "" })); }}
                        placeholder="Répète ton mot de passe"
                        autoComplete="new-password"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${errors.confirm ? "rgba(255,107,107,0.4)" : confirm && confirm === password ? "rgba(93,214,110,0.4)" : "rgba(255,255,255,0.09)"}`,
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = `${AMBER}60`)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = errors.confirm ? "rgba(255,107,107,0.4)" : "rgba(255,255,255,0.09)")}
                      />
                    </div>
                    {errors.confirm && <p className="text-[11px] mt-1.5" style={{ color: "#FF6B6B" }}>{errors.confirm}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                    style={{ background: AMBER, color: "#07070F" }}
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : "Réinitialiser le mot de passe"}
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
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: "rgba(93,214,110,0.12)", border: "1px solid rgba(93,214,110,0.25)" }}
                >
                  <CheckCircle className="w-8 h-8 text-[#5DD66E]" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Mot de passe mis à jour !</h2>
                <p className="text-sm text-white/40 mb-8">
                  Tu peux maintenant te connecter avec ton nouveau mot de passe.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition hover:opacity-90"
                  style={{ background: AMBER, color: "#07070F" }}
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
