import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CATEGORIES, getCategory } from "../data/mockData";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import { Eye, Play, Radio, Swords } from "lucide-react";

export default function RoomView() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { lang, currency } = useApp();
  const [available, setAvailable] = useState(null);
  const [live, setLive] = useState([]);
  const category = getCategory(categoryId);
  useEffect(() => { api.getCategories().then((result) => setAvailable(result.categories.some((item) => item.id === categoryId))).catch(() => setAvailable(false)); const load = () => api.getLiveDuels().then((result) => setLive(result.matches || [])).catch(() => {}); load(); const timer = setInterval(load, 4000); return () => clearInterval(timer); }, [categoryId]);
  if (!category) return <Navigate to="/categories" replace />;
  const Icon = category.icon;
  return <div className="min-h-full px-4 sm:px-6 py-7 max-w-3xl mx-auto space-y-6"><div className="flex gap-2 overflow-x-auto no-scrollbar">{CATEGORIES.map((item) => <button key={item.id} onClick={() => navigate(`/room/${item.id}`)} className={item.id === categoryId ? "btn-primary shrink-0 rounded-full px-3 py-2 text-xs" : "btn-secondary shrink-0 rounded-full px-3 py-2 text-xs"}>{item.name[lang]}</button>)}</div><header className="card rounded-3xl p-6"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><Icon className="h-7 w-7" /></span><div><h1 className="font-display text-3xl font-extrabold">{category.name[lang]}</h1><p className="mt-1 text-sm" style={{ color: "var(--text-sub)" }}>{category.description[lang]}</p></div></div><div className="mt-6 grid grid-cols-2 gap-3"><button disabled={available !== true} onClick={() => navigate(`/play/${categoryId}`)} className="btn-primary flex flex-col items-start gap-2 rounded-2xl p-4 disabled:opacity-40"><Play className="h-5 w-5" /><strong>Challenge solo</strong></button><button onClick={() => navigate("/duel")} className="btn-secondary flex flex-col items-start gap-2 rounded-2xl p-4"><Swords className="h-5 w-5" /><strong>Duel mélangé</strong></button></div>{available === false && <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>Cette catégorie n’a pas encore assez de questions actives.</p>}</header><section><div className="mb-3 flex items-center gap-2"><Radio className="h-4 w-4" style={{ color: "var(--danger)" }} /><h2 className="font-display text-xl font-bold">Arène en direct</h2></div>{live.length ? live.slice(0,5).map((match) => <button key={match.id} onClick={() => navigate(`/duel/play?spectate=${match.id}`)} className="card mb-2 flex w-full items-center gap-3 rounded-xl p-4 text-left"><div className="min-w-0 flex-1"><strong>{match.players[0]?.username} {match.scoreA}–{match.scoreB} {match.players[1]?.username}</strong><p className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>Mise {formatMoney(match.stakeCoins, currency)}</p></div><Eye className="h-4 w-4" /><span className="text-xs">{match.viewerCount}</span></button>) : <p className="card rounded-xl p-5 text-center text-sm" style={{ color: "var(--text-sub)" }}>Aucun match en direct.</p>}</section></div>;
}
