import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import { ChevronLeft, ChevronRight, Crown, Trophy } from "lucide-react";
import AnimeAvatar from "../components/AnimeAvatar";

export default function Leaderboard() {
  const navigate = useNavigate();
  const { currency } = useApp();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    api.getLeaderboard(page, 5).then(setData).catch((requestError) => setError(requestError.message));
  }, [page]);
  const players = data?.leaderboard || [];
  // Le podium (3 grandes cartes) n'a de sens que sur la 1re page — au-delà
  // ce ne sont plus les 3 premiers, ça n'a rien d'un podium.
  const podium = page === 1 ? players.slice(0, 3) : [];
  const rest = page === 1 ? players.slice(3) : players;
  return <div className="qa-shell space-y-7 py-8"><header><div className="flex items-center gap-2 text-xs font-bold uppercase text-orange-qa"><Trophy className="h-4 w-4" />Classement officiel</div><h1 className="mt-2 text-4xl font-extrabold text-ink-qa">Meilleurs gains</h1><p className="mt-2 text-sm text-ink-soft-qa">Seuls les paiements validés sont comptabilisés. Aucun score simulé.</p></header>
    {error && <p className="rounded-xl p-4" style={{ color: "var(--danger)", background: "var(--surface)" }}>{error}</p>}
    {!data && !error && <p className="py-12 text-center text-sm text-ink-soft-qa">Chargement du classement…</p>}
    {data && <>
      {podium.length > 0 && <section className="grid gap-3 lg:grid-cols-3">{podium.map((player, index) => <motion.button key={player.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }} onClick={() => navigate(`/player/${player.username}`)} className="card card-hover rounded-2xl p-5 text-left"><div className="flex items-start justify-between"><AnimeAvatar seed={player.username} src={player.avatarUrl} alt="" size={56} className="border-2" /><span className="chip chip-accent">#{player.rank}</span></div><div className="mt-4 flex items-center gap-1.5 text-lg font-extrabold">{player.isVip && <Crown className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />}<span className="truncate">{player.username}</span></div><div className="mt-3 text-xl font-extrabold text-orange-qa">{formatMoney(player.winningsCoins, currency)}</div></motion.button>)}</section>}
      <section className="card overflow-hidden rounded-2xl">{rest.map((player) => <button key={player.id} onClick={() => navigate(`/player/${player.username}`)} className="grid w-full grid-cols-[40px_44px_1fr_auto] items-center gap-3 border-b px-4 py-3 text-left last:border-0" style={{ borderColor: "var(--border)" }}><span className="text-center font-bold">#{player.rank}</span><AnimeAvatar seed={player.username} src={player.avatarUrl} alt="" size={38} /><span className="flex min-w-0 items-center gap-1.5 truncate font-bold">{player.isVip && <Crown className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />}<span className="truncate">{player.username}</span></span><strong className="text-orange-qa">{formatMoney(player.winningsCoins, currency)}</strong></button>)}</section>
      {players.length > 0 && <nav className="flex items-center justify-between" aria-label="Pagination classement">
        <button className="btn-secondary rounded-xl px-4 py-2 text-sm disabled:opacity-40" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-bold" style={{ color: "var(--text-sub)" }}>Page {data.page} sur {data.totalPages}</span>
        <button className="btn-secondary rounded-xl px-4 py-2 text-sm disabled:opacity-40" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></button>
      </nav>}
      <p className="text-center text-sm text-ink-soft-qa">Ton rang : #{data.myRank} · gains cumulés {formatMoney(data.myWinnings, currency)}</p>
    </>}
  </div>;
}
