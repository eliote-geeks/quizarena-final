import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Block, Field, Input, Toggle } from "../../ui";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "./AuthLayout";

export default function Register() {
  const nav = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!agree) return;
    setError("");
    setBusy(true);
    const form = new FormData(e.target);
    try {
      await register({
        username: form.get("username"),
        phone: form.get("phone"),
        password: form.get("password"),
      });
      const from = location.state?.from;
      nav(from ? `${from.pathname}${from.search || ""}` : "/", { replace: true });
    } catch (err) {
      setError(err.message || "Inscription impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Inscription"
      title="Rejoindre l'arène"
      subtitle="18 ans et plus. Cameroun uniquement pour le moment."
      footer={
        <span className="t-body text-sm text-bone-3">
          Déjà un compte ?{" "}
          <Link to="/login" state={location.state} className="text-flare hover:text-flare-hot">
            Se connecter
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label="Pseudo">
          <Input type="text" name="username" placeholder="KwameX" required autoFocus minLength={3} />
        </Field>
        <Field label="Téléphone" hint="format 237 6xx xx xx xx, utilisé pour les dépôts/retraits">
          <Input type="tel" name="phone" placeholder="237690000000" required minLength={8} />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum" error={error || undefined}>
          <Input type="password" name="password" placeholder="••••••••" required minLength={8} />
        </Field>

        <Toggle checked={agree} onChange={setAgree}>
          J'ai 18 ans et j'accepte les{" "}
          <Link to="/terms" className="text-bone hover:text-flare">
            CGU
          </Link>{" "}
          et la{" "}
          <Link to="/privacy" className="text-bone hover:text-flare">
            politique de confidentialité
          </Link>
          .
        </Toggle>

        <Block type="submit" size="lg" full disabled={!agree} loading={busy} className="mt-2">
          Créer mon compte
        </Block>
      </form>
    </AuthLayout>
  );
}
