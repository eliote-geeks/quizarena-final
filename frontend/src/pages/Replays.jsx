import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import { formatDateTime } from "../lib/dateTime";
import * as api from "../lib/api";
import { Clock, Swords, Trophy } from "lucide-react";

export default function Replays() {
  const navigate = useNavigate();
  const { currency } = useApp();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const load = (next) => api.getDuelHistory(next, 15).then((result) => { setData(result); setPage(next); }).catch((requestError) => setError(requestError.message));
  useEffect(() => { load(1); }, []);
  return <div className="min-h-full px-4 sm:px-6 py-7 max-w-3xl mx-auto space-y-6"><header><div className="flex items-center gap-2 text-xs font-bold uppercase text-orange-qa"><Clock className="h-4 w-4" />Archives officielles</div><h1 className="mt-2 font-display text-3xl font-extrabold">Historique des duels</h1><p className="mt-2 text-sm" style={{ color: "var(--text-sub)" }}>Scores et résultats issus du serveur. La rediffusion détaillée sera disponible quand chaque état de manche sera persisté.</p></header>{error && <p style={{ color: "var(--danger)" }}>{error}</p>}<section className="space-y-2">{(data?.matches || []).map((match) => <article key={match.id} className="card flex items-center gap-3 rounded-2xl p-4"><span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{match.context === "TOURNAMENT" ? <Trophy className="h-5 w-5" /> : <Swords className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="font-bold">{match.playerA} <span style={{ color: "var(--accent)" }}>{match.scoreA}–{match.scoreB}</span> {match.playerB}</div><p className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>{match.context === "TOURNAMENT" ? "Tournoi" : "Duel standard"} · {formatDateTime(match.completedAt)}</p></div><div className="text-right"><strong style={{ color: match.result === "win" ? "var(--success)" : match.result === "loss" ? "var(--danger)" : "var(--text)" }}>{match.result === "win" ? "Victoire" : match.result === "loss" ? "Défaite" : "Égalité"}</strong><p className="mt-1 text-xs">{formatMoney(match.stakeCoins, currency)}</p></div></article>)}{data && !data.matches.length && <p className="card rounded-xl p-6 text-center text-sm" style={{ color: "var(--text-sub)" }}>Aucun duel terminé.</p>}</section>{(data?.pages || 1) > 1 && <div className="flex items-center justify-between"><button disabled={page <= 1} onClick={() => load(page - 1)} className="btn-secondary rounded-lg px-4 py-2 disabled:opacity-30">Précédent</button><span className="text-xs">Page {page}/{data.pages}</span><button disabled={page >= data.pages} onClick={() => load(page + 1)} className="btn-secondary rounded-lg px-4 py-2 disabled:opacity-30">Suivant</button></div>}<button onClick={() => navigate("/duel")} className="btn-primary w-full rounded-xl py-3">Lancer un nouveau duel</button></div>;
}
