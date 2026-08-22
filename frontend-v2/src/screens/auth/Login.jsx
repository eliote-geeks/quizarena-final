import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Block, Field, Input, Toggle } from "../../ui";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "./AuthLayout";

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.target);
    try {
      await login(form.get("identifier"), form.get("password"));
      const from = location.state?.from;
      nav(from ? `${from.pathname}${from.search || ""}` : "/", { replace: true });
    } catch (err) {
      setError(err.message || "Connexion impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Connexion"
      title="Entrer dans l'arène"
      footer={
        <span className="t-body text-sm text-bone-3">
          Pas encore de compte ?{" "}
          <Link to="/register" state={location.state} className="text-flare hover:text-flare-hot">
            Créer un compte
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label="Pseudo, e-mail ou téléphone">
          <Input type="text" name="identifier" placeholder="vous@exemple.com" required autoFocus />
        </Field>
        <Field label="Mot de passe" error={error || undefined}>
          <Input type="password" name="password" placeholder="••••••••" required />
        </Field>

        <div className="flex items-center justify-between">
          <Toggle checked={remember} onChange={setRemember}>
            Rester connecté
          </Toggle>
          <Link to="/forgot-password" className="t-label text-bone-4 hover:text-flare">
            oublié ?
          </Link>
        </div>

        <Block type="submit" size="lg" full className="mt-2" loading={busy}>
          Se connecter
        </Block>
      </form>
    </AuthLayout>
  );
}
