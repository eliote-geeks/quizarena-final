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

          {/* Back */}
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
          </Link>

          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-8">
                  <h1 className="text-xl font-bold text-white mb-1">Mot de passe oublié ?</h1>
                  <p className="text-sm text-white/40">
                    Saisis ton email et on t'envoie un lien de réinitialisation.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                          border: `1px solid ${error ? "rgba(255,107,107,0.4)" : "rgba(255,255,255,0.09)"}`,
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = `${AMBER}60`)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = error ? "rgba(255,107,107,0.4)" : "rgba(255,255,255,0.09)")}
                      />
                    </div>
                    {error && <p className="text-[11px] mt-1.5" style={{ color: "#FF6B6B" }}>{error}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: AMBER, color: "#07070F" }}
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : "Envoyer le lien"}
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
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: "rgba(93,214,110,0.12)", border: "1px solid rgba(93,214,110,0.25)" }}
                >
                  <CheckCircle className="w-8 h-8 text-[#5DD66E]" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Email envoyé !</h2>
                <p className="text-sm text-white/40 mb-1">
                  Si <span className="text-white/70">{email}</span> est associé à un compte,
                </p>
                <p className="text-sm text-white/40 mb-8">
                  tu recevras un lien dans quelques minutes.
                </p>
                <div
                  className="px-4 py-3 rounded-xl text-xs text-white/40 mb-6 text-left"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="font-medium text-white/60 mb-1">Tu ne trouves pas l'email ?</p>
                  <p>Vérifie tes spams ou contacte le support.</p>
                </div>
                <Link
                  to="/login"
                  className="text-sm font-semibold hover:underline transition"
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
