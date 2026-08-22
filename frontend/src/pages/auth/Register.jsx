import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../../context/AppContext";
import AuthLeft from "../../components/AuthLeft";
import { Eye, EyeOff, Mail, Lock, User, Loader2, Check, Phone } from "lucide-react";

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

  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [terms, setTerms]       = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  const strength = pwStrength(password);

  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = "Le pseudo est requis.";
    else if (username.trim().length < 3) e.username = "Min. 3 caractères.";
    else if (username.trim().length > 20) e.username = "Max. 20 caractères.";
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) e.username = "Lettres, chiffres et _ uniquement.";

    if (!email.trim()) e.email = "L'email est requis.";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email invalide.";

    const normalizedPhone = phone.replace(/\s+/g, "");
    if (normalizedPhone.length < 8) e.phone = "Numéro de téléphone invalide.";

    if (!password) e.password = "Le mot de passe est requis.";
    else if (password.length < 8) e.password = "Min. 8 caractères.";

    if (!confirm) e.confirm = "Confirme ton mot de passe.";
    else if (confirm !== password) e.confirm = "Les mots de passe ne correspondent pas.";

    if (!terms) e.terms = "Tu dois accepter les conditions.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await register(username.trim(), email.trim(), phone.replace(/\s+/g, ""), password);
      navigate("/", { replace: true });
    } catch (requestError) {
      setErrors((current) => ({ ...current, form: requestError.message || "Inscription impossible." }));
    } finally {
      setLoading(false);
    }
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
              Créer un compte
            </h1>
            <p className="text-sm" style={{ color: "var(--qa-text-sub)" }}>
              Rejoins l'arène. Gratuitement.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              icon={User}
              type="text"
              label="Pseudo"
              value={username}
              onChange={(v) => { setUsername(v); setErrors(o => ({ ...o, username: "" })); }}
              placeholder="TonPseudo"
              autoComplete="username"
              error={errors.username}
            />

            <AuthField
              icon={Mail}
              type="email"
              label="Email"
              value={email}
              onChange={(v) => { setEmail(v); setErrors(o => ({ ...o, email: "" })); }}
              placeholder="ton@email.com"
              autoComplete="email"
              error={errors.email}
            />

            <AuthField
              icon={Phone}
              type="tel"
              label="Téléphone Mobile Money"
              value={phone}
              onChange={(v) => { setPhone(v); setErrors(o => ({ ...o, phone: "", form: "" })); }}
              placeholder="6XXXXXXXX"
              autoComplete="tel"
              error={errors.phone}
            />

            {/* Password */}
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--qa-text-sub)" }}>
                Mot de passe
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition hover:opacity-80"
                  style={{ color: "var(--qa-text-faint)" }}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{
                          background: i <= strength ? STRENGTH_COLOR[strength] : "var(--qa-active)",
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-xs font-bold" style={{ color: STRENGTH_COLOR[strength] || "var(--qa-text-sub)" }}>
                    {STRENGTH_LABEL[strength]}
                  </div>
                </div>
              )}
              {errors.password && <FieldError msg={errors.password} />}
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
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-sm outline-none transition-colors"
                  style={{
                    background: "var(--qa-active)",
                    border: `1px solid ${errors.confirm ? "#FF6B6B" : confirm && confirm === password ? "#5DD66E" : "var(--qa-border)"}`,
                    color: "var(--qa-text)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = AMBER)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = errors.confirm ? "#FF6B6B" : confirm && confirm === password ? "#5DD66E" : "var(--qa-border)")}
                />
                {confirm && confirm === password && (
                  <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#5DD66E" }} />
                )}
              </div>
              {errors.confirm && <FieldError msg={errors.confirm} />}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => { setTerms(v => !v); setErrors(o => ({ ...o, terms: "" })); }}
                  className="w-4 h-4 rounded flex items-center justify-center border transition flex-shrink-0 mt-0.5"
                  style={{
                    background: terms ? AMBER : "transparent",
                    borderColor: errors.terms ? "#FF6B6B" : terms ? AMBER : "var(--qa-border-md)",
                  }}
                >
                  {terms && (
                    <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="#07070F" strokeWidth="2">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  )}
                </button>
                <span className="text-xs leading-relaxed" style={{ color: "var(--qa-text-sub)" }}>
                  J'accepte les{" "}
                  <Link to="/terms" className="underline font-semibold" style={{ color: AMBER }}>
                    conditions
                  </Link>{" "}
                  et la{" "}
                  <Link to="/privacy" className="underline font-semibold" style={{ color: AMBER }}>
                    politique de confidentialité
                  </Link>.
                </span>
              </label>
              {errors.terms && <FieldError msg={errors.terms} />}
            </div>

            {errors.form && <FieldError msg={errors.form} />}
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
                <><Loader2 className="w-5 h-5 animate-spin" /> Création…</>
              ) : "Rejoindre l'arène"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1" style={{ borderTop: "1px solid var(--qa-divider)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--qa-text-faint)" }}>ou</span>
            <div className="flex-1" style={{ borderTop: "1px solid var(--qa-divider)" }} />
          </div>

          <p className="text-center text-sm" style={{ color: "var(--qa-text-sub)" }}>
            Déjà un compte ?{" "}
            <Link to="/login" className="font-bold hover:underline" style={{ color: AMBER }}>
              Se connecter
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function AuthField({ icon: Icon, label, error, onChange, ...props }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--qa-text-sub)" }}>
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--qa-text-faint)" }} />
        <input
          {...props}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-colors"
          style={{
            background: "var(--qa-active)",
            border: `1px solid ${error ? "#FF6B6B" : "var(--qa-border)"}`,
            color: "var(--qa-text)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = AMBER)}
          onBlur={(e) => (e.currentTarget.style.borderColor = error ? "#FF6B6B" : "var(--qa-border)")}
        />
      </div>
      {error && <FieldError msg={error} />}
    </div>
  );
}

function FieldError({ msg }) {
  return (
    <p className="text-xs font-semibold mt-1.5" style={{ color: "#FF6B6B" }}>{msg}</p>
  );
}
