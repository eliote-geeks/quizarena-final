import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import * as api from "../lib/api";
import { ChevronRight, Crown, LockKeyhole, Sparkles, Trophy, Users } from "lucide-react";
import { formatDate } from "../lib/dateTime";
import { Skeleton } from "../components/ArenaLoader";
import { tournamentCover } from "../lib/tournamentCovers";

export default function Tournaments() {
  const navigate = useNavigate();
  const { currency, canCreateTournament } = useApp();
  const [data, setData] = useState(null), [error, setError] = useState("");
  const [openPage, setOpenPage] = useState(1), [minePage, setMinePage] = useState(1);
  const load = () => api.getTournaments().then(setData).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  if (!data && !error) return <div className="qa-shell py-8"><TournamentSkeleton /></div>;
  const mine = data?.mine || [];
  const mineIds = new Set(mine.map((t) => t.id));
  // Exclure de "À jouer" les tournois déjà dans "Mes brackets" (évite la duplication)
  const open = (data?.open || []).filter((t) => !mineIds.has(t.id));
  const creationAllowed = data?.viewer?.canCreateTournament ?? canCreateTournament;
  return <div className="qa-shell space-y-7 py-8">
    <section className="relative isolate overflow-hidden rounded-3xl px-5 py-8 sm:px-8" style={{ background: "#1B1510", border: "1px solid rgba(229,168,0,.32)" }}>
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-orange-qa"><Trophy className="h-4 w-4" />Arène compétitive</div><h1 className="mt-3 font-display text-4xl font-extrabold text-white sm:text-5xl">Monte dans le bracket.</h1><div className="mt-5 flex flex-wrap gap-2"><Chip icon={Users} text="4 à 16 joueurs" /><Chip icon={Crown} text={creationAllowed ? "Création VIP active" : "Création réservée aux VIP"} /></div></div><button onClick={() => navigate(creationAllowed ? "/tournaments/new" : "/vip")} className="btn-primary grid h-12 w-12 shrink-0 place-items-center rounded-2xl" aria-label={creationAllowed ? "Créer un tournoi" : "Découvrir le statut VIP"}>{creationAllowed ? <Sparkles className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</button></div>
    </section>
    {error && <p className="rounded-xl p-4 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}
    {/* "Mes tournois" avant "À jouer" : un tournoi où tu es déjà inscrit
        est plus important à retrouver vite qu'à devoir défiler jusqu'en
        bas de la liste générale (retour Paul du 31/08). */}
    <TournamentSection title="Mes tournois" items={mine} page={minePage} setPage={setMinePage} currency={currency} openTournament={(id) => navigate(`/tournaments/${id}`)} empty="Tu n'es inscrit à aucun tournoi." />
    <TournamentSection title="À jouer" items={open} page={openPage} setPage={setOpenPage} currency={currency} openTournament={(id) => navigate(`/tournaments/${id}`)} empty="Aucun bracket ouvert. Crée le prochain." />
  </div>;
}

// Retire les suffixes de test laissés dans les anciens noms (ex : "· Démo")
function cleanName(name) { return (name || "").replace(/\s*[·-]\s*d[ée]mo\s*$/i, "").trim(); }

function Chip({ icon: Icon, text }) { return <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85"><Icon className="h-3.5 w-3.5 text-orange-qa" />{text}</span>; }
function TournamentSection({ title, items, page, setPage, currency, openTournament, empty }) {
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages);
  const visible = items.slice((current - 1) * pageSize, current * pageSize);
  return <section><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl font-extrabold">{title}</h2>{items.length > 0 && <span className="chip chip-accent">{items.length}</span>}</div>{items.length ? <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((item, index) => <motion.button key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} onClick={() => openTournament(item.id)} className="card card-hover group overflow-hidden rounded-2xl p-0 text-left"><TournamentArt tournament={item} /><div className="p-5"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--accent)" }}><Trophy className="h-4 w-4" />TOURNOI</span><span className="rounded-full px-2 py-1 text-xs font-bold" style={{ background: "var(--surface-2)", color: "var(--text-sub)" }}>{item.entryCount}/{item.capacity}</span></div><h3 className="mt-4 truncate font-display text-xl font-extrabold">{cleanName(item.name)}</h3><div className="mt-3 flex items-center justify-between"><span className="text-sm font-semibold" style={{ color: "var(--text-sub)" }}>{item.entryCount}/{item.capacity} joueurs</span><strong className="text-orange-qa">{formatMoney(item.stakeCoins, currency)}</strong></div><p className="mt-3 text-xs" style={{ color: "var(--text-faint)" }}>Ouvert le {formatDate(item.createdAt)}</p><div className="mt-4 flex items-center gap-1 text-sm font-bold text-orange-qa">Voir le bracket <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div></div></motion.button>)}</div>{pages > 1 && <nav className="mt-5 flex items-center justify-between" aria-label={`Pagination ${title}`}><button className="btn-secondary rounded-xl px-4 py-2 text-sm disabled:opacity-40" disabled={current === 1} onClick={() => setPage(current - 1)}>Précédent</button><span className="text-sm font-bold" style={{ color: "var(--text-sub)" }}>Page {current} sur {pages}</span><button className="btn-secondary rounded-xl px-4 py-2 text-sm disabled:opacity-40" disabled={current === pages} onClick={() => setPage(current + 1)}>Suivant</button></nav>}</> : <div className="card rounded-2xl p-6 text-center text-sm" style={{ color: "var(--text-sub)" }}>{empty}</div>}</section>;
}
function TournamentArt({ tournament }) { return <div className="relative aspect-video overflow-hidden border-b" style={{ background: "#0B0B14", borderColor: "var(--border)" }}><img src={tournamentCover(tournament)} alt={`Illustration de ${tournament.name}`} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /><div className="pointer-events-none absolute inset-0 bg-black/10" /></div>; }
function TournamentSkeleton() { return <div className="space-y-7" role="status" aria-label="Chargement des tournois"><span className="sr-only">Chargement des tournois</span><Skeleton className="h-44 w-full rounded-3xl" /><div className="space-y-3"><Skeleton className="h-8 w-40" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="card overflow-hidden rounded-2xl"><Skeleton className="aspect-video w-full rounded-none" /><div className="space-y-3 p-5"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-full" /></div></div>)}</div></div></div>; }
