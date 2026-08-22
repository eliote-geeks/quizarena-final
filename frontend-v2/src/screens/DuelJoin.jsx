import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Block, Label, Loader } from "../ui";
import * as duel from "../lib/duelSocket";

/** Ouverte via un lien d'invitation externe (/duel/join/CODE, partagé
 * par un ami). ProtectedRoute a déjà géré la connexion si besoin —
 * arrivé ici, il ne reste qu'à rejoindre le duel privé. */
export default function DuelJoin() {
  const { code } = useParams();
  const nav = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    duel.connect();
    const offMatched = duel.on("matched", () => nav("/duel/play", { replace: true }));
    const offError = duel.on("error", (msg) => setError(msg.message || "Invitation invalide ou expirée"));

    // Laisse la connexion WS s'établir avant d'envoyer join_invite (elle
    // se fait quasi instantanément, mais un petit délai évite une course
    // avec l'ouverture de la socket sur un réseau lent).
    const t = setTimeout(() => duel.joinInvite(code), 300);

    return () => {
      offMatched();
      offError();
      clearTimeout(t);
    };
  }, [code, nav]);

  if (error) {
    return (
      <div className="grain flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
        <Label tone="flare">Invitation</Label>
        <h1 className="t-display text-2xl">{error}</h1>
        <Block onClick={() => nav("/duel")}>Trouver un autre duel</Block>
      </div>
    );
  }

  return (
    <div className="grain flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <Loader />
      <p className="t-body text-sm text-bone-4">Connexion au duel…</p>
    </div>
  );
}
