import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Block, Field, Input } from "../../ui";
import AuthLayout from "./AuthLayout";

export default function ResetPassword() {
  const nav = useNavigate();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && pass !== confirm;

  function submit(e) {
    e.preventDefault();
    if (mismatch || pass.length < 8) return;
    nav("/login");
  }

  return (
    <AuthLayout eyebrow="Réinitialisation" title="Nouveau mot de passe">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label="Nouveau mot de passe" hint="8 caractères minimum">
          <Input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            autoFocus
          />
        </Field>
        <Field
          label="Confirmer le mot de passe"
          error={mismatch ? "Les mots de passe ne correspondent pas" : undefined}
        >
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>
        <Block type="submit" size="lg" full disabled={mismatch || pass.length < 8}>
          Réinitialiser
        </Block>
      </form>
    </AuthLayout>
  );
}
