import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import { CATEGORIES } from "../data/mockData";
import { Bot, ChevronRight, Eye, Radio, Swords, Trophy, Users } from "lucide-react";

export default function MainLobby() {
  const navigate = useNavigate();
  const { coins, user, currency } = useApp();
  const [top, setTop] = useState([]);
  const [openDuels, setOpenDuels] = useState([]);
  const [liveDuels, setLiveDuels] = useState([]);
  const [online, setOnline] = useState([]);
  const [categoryStats, setCategoryStats] = useState({ count: 0, questions: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const loadStable = async () => {
      try {
        const [ranking, categories] = await Promise.all([api.getLeaderboard(), api.getCategories()]);
        if (!alive) return;
        setTop((ranking.leaderboard || []).slice(0, 3));
        const editionIds = new Set(CATEGORIES.map((category) => category.id));
        const editionCategories = (categories.categories || []).filter((category) => editionIds.has(category.id));
        setCategoryStats({ count: editionCategories.length, questions: editionCategories.reduce((sum, category) => sum + category.questionCount, 0) });
      } catch (requestError) {
        if (alive) setError(requestError.message || "Les données du lobby sont indisponibles");
      }
    };
    const loadRealtime = async () => {
      const results = await Promise.allSettled([api.getOpenDuels(), api.getLiveDuels(), api.getOnlinePlayers()]);
      if (!alive) return;
      if (results[0].status === "fulfilled") {
        const data = results[0].value;
        setOpenDuels(data.mine ? [{ ...data.mine, mine: true }, ...(data.open || [])] : data.open || []);
      }
      if (results[1].status === "fulfilled") setLiveDuels(results[1].value.matches || []);
      if (results[2].status === "fulfilled") setOnline(results[2].value.online || []);
    };
    loadStable(); loadRealtime();
    const timer = setInterval(loadRealtime, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  const activity = useMemo(() => {
    if (liveDuels.length) return `${liveDuels.length} duel${liveDuels.length > 1 ? "s" : ""} en direct actuellement`;
    if (openDuels.length) return `${openDuels.length} défi${openDuels.length > 1 ? "s" : ""} ouvert${openDuels.length > 1 ? "s" : ""} attendent un adversaire`;
    return "L’arène est prête — lance le prochain défi";
  }, [liveDuels.length, openDuels.length]);

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-7">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl px-5 py-8 text-center sm:px-8 sm:py-12" style={{ background: "linear-gradient(135deg, #121032 0%, #211A4A 52%, #15122B 100%)" }}>
        <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-white/80"><span className="w-1.5 h-1.5 rounded-full pulse-soft" style={{ background: "var(--success)" }} />{online.length} joueur{online.length > 1 ? "s" : ""} connecté{online.length > 1 ? "s" : ""}</div>
        <h1 className="font-display mx-auto max-w-4xl text-[clamp(2.25rem,8vw,4.75rem)] font-extrabold leading-[1.05] text-white"><span className="mr-2 text-orange-qa">QuizArena.</span> Le savoir entre en jeu.</h1>
        <p className="mx-auto mt-5 max-w-3xl text-base font-bold leading-7 text-white/60 sm:text-xl">{categoryStats.questions.toLocaleString("fr-FR")} questions actives · {categoryStats.count} catégories · résultats vérifiés par le serveur</p>
        <p className="mt-4 text-sm font-extrabold text-white/75">Bonjour {user?.name || "Joueur"} · {formatMoney(coins, currency)}</p>
      </motion.header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ModeCard icon={Bot} title="Solo" text="Challenge de 10 questions avec mise sécurisée." action="Choisir une catégorie" onClick={() => navigate("/categories")} />
        <ModeCard icon={Swords} title="Duel 1v1" text="Match temps réel, même série de questions pour les deux joueurs." action="Lancer un duel" featured onClick={() => navigate("/duel")} />
        <ModeCard icon={Trophy} title="Tournois" text="Bracket à élimination directe et cagnotte serveur." action="Voir les tournois" onClick={() => navigate("/tournaments")} />
      </section>

      <section className="overflow-hidden rounded-xl" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}><div className="flex h-11 items-center gap-3 px-4 text-sm font-bold"><Radio className="h-4 w-4" />{activity}</div></section>
      {error && <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}

      <DataSection title="Duels disponibles" icon={Swords} count={openDuels.length} action={() => navigate("/duel")}>
        {openDuels.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{openDuels.slice(0, 6).map((duel) => <article key={duel.code} className="rounded-2xl p-4" style={{ background: "var(--surface-2)" }}><div className="flex items-center justify-between gap-3"><strong className="truncate">{duel.username}</strong><span className="font-extrabold" style={{ color: "var(--accent)" }}>{formatMoney(duel.stakeCoins, currency)}</span></div><p className="mt-1 text-xs" style={{ color: "var(--text-sub)" }}>{duel.mine ? "Ton défi est publié" : `Gain potentiel ${formatMoney(duel.prizeCoins, currency)}`}</p><button disabled={duel.mine || duel.stakeCoins > coins} onClick={() => navigate(`/duel?invite=${encodeURIComponent(duel.code)}`)} className="btn-primary mt-4 w-full rounded-xl py-2.5 text-sm disabled:opacity-40">{duel.mine ? "En attente" : duel.stakeCoins > coins ? "Solde insuffisant" : "Rejoindre"}</button></article>)}</div> : <Empty text="Aucun défi ouvert pour l’instant." />}
      </DataSection>

      <DataSection title="Matchs en direct" icon={Radio} count={liveDuels.length}>
        {liveDuels.length ? liveDuels.slice(0, 6).map((match) => <button key={match.id} onClick={() => navigate(`/duel/play?spectate=${match.id}`)} className="card card-hover mb-2 flex w-full items-center gap-3 rounded-xl p-4 text-left"><span className="h-2 w-2 rounded-full pulse-soft" style={{ background: "var(--danger)" }} /><div className="min-w-0 flex-1"><strong>{match.players?.[0]?.username} {match.scoreA}–{match.scoreB} {match.players?.[1]?.username}</strong><p className="text-xs mt-1" style={{ color: "var(--text-sub)" }}>Mise {formatMoney(match.stakeCoins, currency)}</p></div><span className="inline-flex items-center gap-1 text-xs"><Eye className="h-4 w-4" />{match.viewerCount}</span></button>) : <Empty text="Aucun match en cours." />}
      </DataSection>

      <DataSection title="Meilleurs gains" icon={Trophy} count={top.length} action={() => navigate("/leaderboard")}>
        {top.length ? <div className="grid gap-3 sm:grid-cols-3">{top.map((player) => <button key={player.id} onClick={() => navigate(`/player/${player.username}`)} className="card card-hover rounded-2xl p-4 text-left"><span className="text-xs" style={{ color: "var(--text-faint)" }}>#{player.rank}</span><div className="mt-1 font-bold truncate">{player.username}</div><div className="mt-2 font-extrabold" style={{ color: "var(--accent)" }}>{formatMoney(player.winningsCoins, currency)}</div></button>)}</div> : <Empty text="Le classement se remplira avec les gains validés." />}
      </DataSection>

      {online.length > 0 && <DataSection title="Joueurs connectés" icon={Users} count={online.length}><div className="flex flex-wrap gap-2">{online.slice(0, 12).map((player) => <button key={player.id} onClick={() => navigate(`/player/${player.username}`)} className="card rounded-xl px-3 py-2 text-sm font-bold">{player.username}</button>)}</div></DataSection>}
    </div>
  );
}

function ModeCard({ icon: Icon, title, text, action, onClick, featured }) { return <button onClick={onClick} className={`rounded-2xl p-5 text-left transition ${featured ? "btn-primary" : "card card-hover"}`}><Icon className="h-6 w-6" /><div className="mt-4 font-display text-xl font-extrabold">{title}</div><p className="mt-2 text-sm opacity-70">{text}</p><div className="mt-4 inline-flex items-center gap-1 text-sm font-bold">{action}<ChevronRight className="h-4 w-4" /></div></button>; }
function DataSection({ title, icon: Icon, count, action, children }) { return <section className="card rounded-2xl overflow-hidden"><header className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--divider)" }}><div className="flex items-center gap-2"><Icon className="h-4 w-4" style={{ color: "var(--accent)" }} /><h2 className="font-display font-extrabold">{title}</h2>{count > 0 && <span className="chip chip-accent">{count}</span>}</div>{action && <button onClick={action} className="btn-ghost text-xs">Voir tout</button>}</header><div className="p-4">{children}</div></section>; }
function Empty({ text }) { return <p className="py-4 text-center text-sm" style={{ color: "var(--text-sub)" }}>{text}</p>; }
