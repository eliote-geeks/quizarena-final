import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthLeft from "../../components/AuthLeft";
import { Mail, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

const AMBER = "#E5A800";

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("L'adresse email est requise."); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Adresse email invalide."); return; }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1400);
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

          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm font-semibold mb-8 hover:opacity-70"
            style={{ color: "var(--qa-text-sub)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>

          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-8">
                  <h1 className="font-display font-bold text-3xl mb-1" style={{ color: "var(--qa-text)" }}>
                    Mot de passe oublié ?
                  </h1>
                  <p className="text-sm" style={{ color: "var(--qa-text-sub)" }}>
                    Saisis ton email et on t'envoie un lien de réinitialisation.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--qa-text-sub)" }}>
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--qa-text-faint)" }} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        placeholder="ton@email.com"
                        autoComplete="email"
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
                    {error && <p className="text-xs font-semibold mt-1.5" style={{ color: "#FF6B6B" }}>{error}</p>}
                  </div>

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
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Envoi…</> : "Envoyer le lien"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ background: "rgba(93,214,110,0.15)", border: "1px solid rgba(93,214,110,0.35)" }}
                >
                  <CheckCircle className="w-10 h-10" style={{ color: "#5DD66E" }} />
                </div>
                <h2 className="font-display font-bold text-2xl mb-2" style={{ color: "var(--qa-text)" }}>Email envoyé !</h2>
                <p className="text-sm mb-1" style={{ color: "var(--qa-text-sub)" }}>
                  Si <span className="font-bold" style={{ color: "var(--qa-text)" }}>{email}</span> est associé à un compte,
                </p>
                <p className="text-sm mb-8" style={{ color: "var(--qa-text-sub)" }}>
                  tu recevras un lien dans quelques minutes.
                </p>
                <div
                  className="p-4 rounded-2xl text-sm text-left mb-6"
                  style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)", color: "var(--qa-text-sub)" }}
                >
                  <p className="font-bold mb-1" style={{ color: "var(--qa-text)" }}>Tu ne trouves pas l'email ?</p>
                  <p>Vérifie tes spams ou contacte le support.</p>
                </div>
                <Link
                  to="/login"
                  className="text-sm font-bold hover:underline"
                  style={{ color: AMBER }}
                >
                  Retour à la connexion
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
