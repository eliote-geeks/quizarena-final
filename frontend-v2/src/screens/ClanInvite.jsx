import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Block, Loader } from "../ui";
import * as api from "../lib/api";

export default function ClanInvite() {
  const { token } = useParams(); const nav = useNavigate(); const [state, setState] = useState("joining"); const [message, setMessage] = useState("");
  useEffect(() => { api.acceptClanInvite(token).then((result) => { setState("done"); setMessage("Tu as rejoint le clan."); setTimeout(() => nav(`/clans/${result.clanId}`), 900); }).catch((error) => { setState("error"); setMessage(error.message || "Lien invalide ou expiré"); }); }, [token]);
  if (state === "joining") return <Loader full />;
  return <main className="mx-auto max-w-md px-5 pt-24 text-center"><div className="text-4xl">{state === "done" ? "✓" : "!"}</div><h1 className="t-display mt-4 text-2xl">Invitation de clan</h1><p className="t-body mt-3 text-sm text-bone-4">{message}</p><Block className="mt-6" onClick={() => nav("/clans")}>Voir les clans</Block></main>;
}
