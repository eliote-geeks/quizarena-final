import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import { Ticket, Trophy, Users } from "lucide-react";

export default function Tournaments() {
  const navigate = useNavigate();
  const { currency, coins, refreshWallet } = useApp();
  const [data, setData] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", stakeCoins: 500, capacity: 4 });
  const [error, setError] = useState("");
  const load = () => api.getTournaments().then(setData).catch((requestError) => setError(requestError.message));
  useEffect(load, []);
  const create = async () => { setError(""); try { const tournament = await api.createTournament({ ...form, name: form.name.trim() }); await refreshWallet(); navigate(`/tournaments/${tournament.id}`); } catch (requestError) { setError(requestError.message); } };
  const open = data?.open || [];
  const mine = data?.mine || [];
  return <div className="qa-shell space-y-7 py-8"><header className="flex items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold uppercase text-orange-qa"><Trophy className="h-4 w-4" />Compétition</div><h1 className="mt-2 text-4xl font-extrabold">Tournois</h1><p className="mt-2 text-sm text-ink-soft-qa">Bracket réel, inscription débitée une seule fois et gains distribués par le serveur.</p></div><button onClick={() => setCreating(!creating)} className="btn-primary rounded-xl px-4 py-3">Créer</button></header>
    {creating && <section className="card rounded-2xl p-5"><h2 className="font-bold">Créer un tournoi</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><input placeholder="Nom du tournoi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border bg-transparent px-4 py-3" style={{ borderColor: "var(--border)" }} /><select value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="rounded-xl border px-4 py-3" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>{(data?.capacities || [4,8,16]).map((capacity) => <option key={capacity} value={capacity}>{capacity} joueurs</option>)}</select><input type="number" min="100" max="50000" value={form.stakeCoins} onChange={(e) => setForm({ ...form, stakeCoins: Number(e.target.value) })} className="rounded-xl border bg-transparent px-4 py-3" style={{ borderColor: "var(--border)" }} /></div><p className="mt-3 text-xs text-ink-soft-qa">Questions mélangées · droit d’entrée {formatMoney(form.stakeCoins, currency)} · solde {formatMoney(coins, currency)}</p><button disabled={!form.name.trim() || form.stakeCoins > coins} onClick={create} className="btn-primary mt-4 rounded-xl px-6 py-3 disabled:opacity-40">Créer et s’inscrire</button></section>}
    {error && <p className="rounded-xl p-4" style={{ background: "var(--surface)", color: "var(--danger)" }}>{error}</p>}
    <TournamentSection title="Mes tournois" items={mine} currency={currency} openTournament={(id) => navigate(`/tournaments/${id}`)} />
    <TournamentSection title="Inscriptions ouvertes" items={open} currency={currency} openTournament={(id) => navigate(`/tournaments/${id}`)} />
  </div>;
}

function TournamentSection({ title, items, currency, openTournament }) { return <section><h2 className="mb-3 text-xl font-extrabold">{title}</h2>{items.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <button key={item.id} onClick={() => openTournament(item.id)} className="card card-hover rounded-2xl p-5 text-left"><div className="flex items-center justify-between"><Trophy className="h-5 w-5 text-orange-qa" /><span className="chip chip-accent">{item.status}</span></div><h3 className="mt-4 truncate font-extrabold">{item.name}</h3><p className="mt-1 text-xs text-ink-soft-qa">{item.categoryName}</p><div className="mt-4 flex justify-between text-sm"><span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{item.entryCount}/{item.capacity}</span><strong className="inline-flex items-center gap-1 text-orange-qa"><Ticket className="h-4 w-4" />{formatMoney(item.stakeCoins, currency)}</strong></div></button>)}</div> : <p className="card rounded-xl p-5 text-sm text-ink-soft-qa">Aucun tournoi dans cette section.</p>}</section>; }
