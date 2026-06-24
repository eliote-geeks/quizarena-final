import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import AuthLeft from "../../components/AuthLeft";
import { Eye, EyeOff, Mail, Lock, User, Loader2, Check } from "lucide-react";

const AMBER = "#E5A800";

function pwStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABEL = ["", "Faible", "Moyen", "Bon", "Fort"];
const STRENGTH_COLOR = ["", "#FF6B6B", "#FDCB6E", AMBER, "#5DD66E"];

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();

  const [username, setUsername]     = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [terms, setTerms]           = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState({});

  const strength = pwStrength(password);

  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = "Le pseudo est requis.";
    else if (username.trim().length < 3) e.username = "Min. 3 caractères.";
    else if (username.trim().length > 20) e.username = "Max. 20 caractères.";
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) e.username = "Lettres, chiffres et _ uniquement.";

    if (!email.trim()) e.email = "L'email est requis.";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email invalide.";

    if (!password) e.password = "Le mot de passe est requis.";
    else if (password.length < 8) e.password = "Min. 8 caractères.";

    if (!confirm) e.confirm = "Confirme ton mot de passe.";
    else if (confirm !== password) e.confirm = "Les mots de passe ne correspondent pas.";

    if (!terms) e.terms = "Tu dois accepter les conditions.";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      register(username.trim(), email);
      navigate("/room/histoire", { replace: true });
    }, 1300);
  };

  const field = (id) => ({
    onFocus: (e) => (e.currentTarget.style.borderColor = `${AMBER}60`),
    onBlur:  (e) => (e.currentTarget.style.borderColor = errors[id] ? "rgba(255,107,107,0.4)" : "rgba(255,255,255,0.09)"),
  });

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
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center font-pixel text-[8px] text-black"
              style={{ background: AMBER }}
            >QA</div>
            <span className="font-display font-black text-sm text-white">
              Quiz<span style={{ color: AMBER }}>Arena</span>
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-xl font-bold text-white mb-1">Créer un compte</h1>
            <p className="text-sm text-white/40">Rejoins l'arène. Gratuitement.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Pseudo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrors(o => ({ ...o, username: "" })); }}
                  placeholder="TonPseudo"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${errors.username ? "rgba(255,107,107,0.4)" : "rgba(255,255,255,0.09)"}`,
                  }}
                  {...field("username")}
                />
              </div>
              {errors.username && <FieldError msg={errors.username} />}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(o => ({ ...o, email: "" })); }}
                  placeholder="ton@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${errors.email ? "rgba(255,107,107,0.4)" : "rgba(255,255,255,0.09)"}`,
                  }}
                  {...field("email")}
                />
              </div>
              {errors.email && <FieldError msg={errors.email} />}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Mot de passe</label>
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
                  {...field("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{ background: i <= strength ? STRENGTH_COLOR[strength] : "rgba(255,255,255,0.07)" }}
                      />
                    ))}
                  </div>
                  <div className="text-[10px]" style={{ color: STRENGTH_COLOR[strength] }}>
                    {STRENGTH_LABEL[strength]}
                  </div>
                </div>
              )}
              {errors.password && <FieldError msg={errors.password} />}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErrors(o => ({ ...o, confirm: "" })); }}
                  placeholder="Répète ton mot de passe"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${errors.confirm ? "rgba(255,107,107,0.4)" : confirm && confirm === password ? "rgba(93,214,110,0.4)" : "rgba(255,255,255,0.09)"}`,
                  }}
                  {...field("confirm")}
                />
                {confirm && confirm === password && (
                  <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5DD66E]" />
                )}
              </div>
              {errors.confirm && <FieldError msg={errors.confirm} />}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => { setTerms(v => !v); setErrors(o => ({ ...o, terms: "" })); }}
                  className="w-4 h-4 rounded flex items-center justify-center border transition cursor-pointer flex-shrink-0 mt-0.5"
                  style={{
                    background: terms ? AMBER : "transparent",
                    borderColor: errors.terms ? "rgba(255,107,107,0.5)" : terms ? AMBER : "rgba(255,255,255,0.2)",
                  }}
                >
                  {terms && (
                    <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-white/40 leading-relaxed">
                  J'accepte les{" "}
                  <span className="underline cursor-pointer" style={{ color: AMBER }}>
                    conditions d'utilisation
                  </span>{" "}
                  et la{" "}
                  <span className="underline cursor-pointer" style={{ color: AMBER }}>
                    politique de confidentialité
                  </span>.
                </span>
              </label>
              {errors.terms && <FieldError msg={errors.terms} />}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              style={{ background: AMBER, color: "#07070F" }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Création du compte…</>
              ) : "Rejoindre l'arène"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-white/[0.07]" />
            <span className="text-[11px] text-white/20">ou</span>
            <div className="flex-1 border-t border-white/[0.07]" />
          </div>

          <p className="text-center text-sm text-white/35">
            Déjà un compte ?{" "}
            <Link to="/login" className="font-semibold hover:underline transition" style={{ color: AMBER }}>
              Se connecter
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function FieldError({ msg }) {
  return (
    <p className="text-[11px] mt-1.5" style={{ color: "#FF6B6B" }}>{msg}</p>
  );
}
