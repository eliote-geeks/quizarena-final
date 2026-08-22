import { useState } from "react";
import { Link } from "react-router-dom";
import { Block, Field, Input, Label } from "../../ui";
import AuthLayout from "./AuthLayout";

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [value, setValue] = useState("");

  function submit(e) {
    e.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout
        eyebrow="Mot de passe oublié"
        title="Message envoyé"
        subtitle={`Un lien de réinitialisation part vers ${value || "votre compte"} dans quelques instants.`}
        footer={
          <Link to="/login" className="t-label text-bone-4 hover:text-flare">
            ← retour à la connexion
          </Link>
        }
      >
        <div className="rule pt-6">
          <Label>Rien reçu ?</Label>
          <button onClick={() => setSent(false)} className="t-body mt-2 text-sm text-flare hover:text-flare-hot">
            Renvoyer le lien
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Mot de passe oublié"
      title="Récupérer l'accès"
      subtitle="Entrez l'e-mail ou le téléphone de votre compte."
      footer={
        <Link to="/login" className="t-label text-bone-4 hover:text-flare">
          ← retour à la connexion
        </Link>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label="E-mail ou téléphone">
          <Input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="vous@exemple.com"
            required
            autoFocus
          />
        </Field>
        <Block type="submit" size="lg" full>
          Envoyer le lien
        </Block>
      </form>
    </AuthLayout>
  );
}
