import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import { Trophy } from "lucide-react";

export default function Leaderboard() {
  const navigate = useNavigate();
  const { currency } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.getLeaderboard().then(setData).catch((requestError) => setError(requestError.message)); }, []);
  const players = data?.leaderboard || [];
  return <div className="qa-shell space-y-7 py-8"><header><div className="flex items-center gap-2 text-xs font-bold uppercase text-orange-qa"><Trophy className="h-4 w-4" />Classement officiel</div><h1 className="mt-2 text-4xl font-extrabold text-ink-qa">Meilleurs gains</h1><p className="mt-2 text-sm text-ink-soft-qa">Seuls les paiements validés sont comptabilisés. Aucun score simulé.</p></header>
    {error && <p className="rounded-xl p-4" style={{ color: "var(--danger)", background: "var(--surface)" }}>{error}</p>}
    {!data && !error && <p className="py-12 text-center text-sm text-ink-soft-qa">Chargement du classement…</p>}
    {data && <><section className="grid gap-3 lg:grid-cols-3">{players.slice(0, 3).map((player, index) => <motion.button key={player.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }} onClick={() => navigate(`/player/${player.username}`)} className="card card-hover rounded-2xl p-5 text-left"><span className="chip chip-accent">#{player.rank}</span><div className="mt-4 text-lg font-extrabold">{player.username}</div><div className="mt-3 text-xl font-extrabold text-orange-qa">{formatMoney(player.winningsCoins, currency)}</div></motion.button>)}</section><section className="card overflow-hidden rounded-2xl">{players.slice(3).map((player) => <button key={player.id} onClick={() => navigate(`/player/${player.username}`)} className="grid w-full grid-cols-[48px_1fr_auto] items-center gap-3 border-b px-4 py-3 text-left last:border-0" style={{ borderColor: "var(--border)" }}><span className="text-center font-bold">#{player.rank}</span><span className="truncate font-bold">{player.username}</span><strong className="text-orange-qa">{formatMoney(player.winningsCoins, currency)}</strong></button>)}</section><p className="text-center text-sm text-ink-soft-qa">Ton rang : #{data.myRank} · gains cumulés {formatMoney(data.myWinnings, currency)}</p></>}
  </div>;
}
