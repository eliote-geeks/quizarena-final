import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthLeft from "../../components/AuthLeft";
import * as api from "../../lib/api";
import { Mail, Loader2, CheckCircle, ArrowLeft, BrainCircuit } from "lucide-react";
import AuthInput from "../../components/AuthInput";

const AMBER = "#E5A800";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("L'adresse email est requise."); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Adresse email invalide."); return; }
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (requestError) {
      // Le backend répond toujours "ok" côté identifiant (anti-énumération
      // de comptes) — une erreur ici ne peut venir que d'un souci réseau.
      setError(requestError.message || "Impossible d'envoyer le code pour l'instant.");
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
                    Saisis ton email et on t'envoie un code de vérification.
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
                    error={error}
                  />

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
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Envoi…</> : "Envoyer le code"}
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
                <h2 className="font-display font-bold text-2xl mb-2" style={{ color: "var(--qa-text)" }}>Code envoyé !</h2>
                <p className="text-sm mb-1" style={{ color: "var(--qa-text-sub)" }}>
                  Si <span className="font-bold" style={{ color: "var(--qa-text)" }}>{email}</span> est associé à un compte,
                </p>
                <p className="text-sm mb-8" style={{ color: "var(--qa-text-sub)" }}>
                  tu recevras un code à 6 chiffres dans quelques minutes.
                </p>
                <button
                  onClick={() => navigate("/reset-password", { state: { identifier: email.trim() } })}
                  className="w-full py-4 rounded-2xl text-base font-bold transition hover:opacity-90 mb-4"
                  style={{ background: AMBER, color: "#07070F", boxShadow: `0 12px 28px -12px ${AMBER}66` }}
                >
                  J'ai reçu mon code
                </button>
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
