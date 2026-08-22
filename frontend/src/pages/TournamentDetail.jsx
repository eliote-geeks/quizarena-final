import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import * as duel from "../lib/duelSocket";
import { ArrowLeft, Swords, Ticket, Trophy, Users } from "lucide-react";

export default function TournamentDetail() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { coins, currency, refreshWallet } = useApp();
  const [tournament, setTournament] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(() => api.getTournament(tournamentId).then(setTournament).catch((requestError) => setError(requestError.message)), [tournamentId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!tournament || tournament.status === "COMPLETED") return; const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [load, tournament]);
  useEffect(() => { duel.connect(); const off = duel.on("matched", () => navigate("/duel/play")); return off; }, [navigate]);
  const join = async () => { setError(""); try { setTournament(await api.joinTournament(tournamentId)); await refreshWallet(); } catch (requestError) { setError(requestError.message); } };
  const leave = async () => { setError(""); try { await api.leaveTournament(tournamentId); await refreshWallet(); load(); } catch (requestError) { setError(requestError.message); } };
  const play = () => { duel.tournamentEnter(tournament.myNextMatchId); navigate("/duel/play"); };
  if (!tournament && !error) return <div className="qa-shell py-16 text-center">Chargement du bracket…</div>;
  if (!tournament) return <div className="qa-shell py-8"><button onClick={() => navigate("/tournaments")} className="btn-secondary rounded-xl px-4 py-3">Retour</button><p className="mt-6 text-red-500">{error}</p></div>;
  const pot = tournament.stakeCoins * tournament.capacity;
  return <div className="qa-shell space-y-6 py-8"><button onClick={() => navigate("/tournaments")} className="btn-ghost inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Tournois</button><header className="card rounded-3xl p-6"><span className="chip chip-accent">{tournament.status}</span><h1 className="mt-4 text-4xl font-extrabold">{tournament.name}</h1><p className="mt-2 text-sm text-ink-soft-qa">{tournament.categoryName}</p><div className="mt-6 grid grid-cols-3 gap-3"><Stat icon={Ticket} label="Entrée" value={formatMoney(tournament.stakeCoins, currency)} /><Stat icon={Users} label="Inscrits" value={`${tournament.entries.length}/${tournament.capacity}`} /><Stat icon={Trophy} label="Pot" value={formatMoney(pot, currency)} /></div><div className="mt-6 flex flex-wrap gap-2">{!tournament.myEntry && tournament.status === "REGISTERING" && <button disabled={coins < tournament.stakeCoins} onClick={join} className="btn-primary rounded-xl px-6 py-3 disabled:opacity-40">S’inscrire</button>}{tournament.myEntry && tournament.status === "REGISTERING" && <button onClick={leave} className="btn-secondary rounded-xl px-6 py-3">Se désinscrire</button>}{tournament.myNextMatchId && <button onClick={play} className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3"><Swords className="h-4 w-4" />Jouer mon match</button>}</div>{error && <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>{error}</p>}</header>
    <section className="card overflow-x-auto rounded-3xl p-5"><h2 className="mb-5 text-xl font-extrabold">Bracket officiel</h2>{tournament.bracket.length ? <div className="flex min-w-max gap-5">{tournament.bracket.map((round) => <div key={round.round} className="w-64"><p className="mb-3 text-xs font-bold uppercase text-orange-qa">{round.label}</p><div className="space-y-3">{round.matches.map((match) => <div key={match.id} className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}><div className={match.winnerId === match.playerA?.id ? "font-bold text-orange-qa" : ""}>{match.playerA?.username || "À déterminer"}</div><div className="my-2 h-px" style={{ background: "var(--divider)" }} /><div className={match.winnerId === match.playerB?.id ? "font-bold text-orange-qa" : ""}>{match.playerB?.username || "À déterminer"}</div><p className="mt-2 text-[10px] text-ink-soft-qa">{match.status}</p></div>)}</div></div>)}</div> : <p className="text-sm text-ink-soft-qa">Le bracket sera généré automatiquement lorsque toutes les places seront prises.</p>}</section>
  </div>;
}
function Stat({ icon: Icon, label, value }) { return <div className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}><Icon className="h-4 w-4 text-orange-qa" /><p className="mt-2 text-[10px] uppercase text-ink-soft-qa">{label}</p><strong>{value}</strong></div>; }
