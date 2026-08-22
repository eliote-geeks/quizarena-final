import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TOURNAMENTS, BRACKET } from "../data/mockData";
import { formatMoney } from "../lib/currency";
import SpectateModal from "../components/SpectateModal";
import {
  ArrowLeft, ArrowRight, Clock, Eye, Radio, ShieldCheck,
  Ticket, Trophy, Users, WalletCards,
} from "lucide-react";

const TOURNAMENT_VISUALS = [
  "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?auto=format&fit=crop&w=640&q=80",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=640&q=80",
  "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=640&q=80",
];

function tournamentVisual(index) {
  return TOURNAMENT_VISUALS[index % TOURNAMENT_VISUALS.length];
}

function useFinaleScore() {
  const [aScore, setAScore] = useState(3);
  const [bScore, setBScore] = useState(2);
  const ref = useRef({ a: 3, b: 2 });

  useEffect(() => {
    const id = setInterval(() => {
      if (ref.current.a >= 10 && ref.current.b >= 10) {
        clearInterval(id);
        return;
      }
      const r = Math.random();
      if (r < 0.48) {
        ref.current.a = Math.min(10, ref.current.a + 1);
        setAScore(ref.current.a);
      } else if (r < 0.82) {
        ref.current.b = Math.min(10, ref.current.b + 1);
        setBScore(ref.current.b);
      }
    }, 5000 + Math.random() * 3500);
    return () => clearInterval(id);
  }, []);

  return [aScore, bScore];
}

export default function Tournaments() {
  const { lang, currency } = useApp();
  const navigate = useNavigate();
  const [spectating, setSpectating] = useState(false);
  const [tournamentIndex, setTournamentIndex] = useState(0);
  const [finaleA, finaleB] = useFinaleScore();
  const finaleMatch = BRACKET.rounds[BRACKET.rounds.length - 1]?.matches[0];

  useEffect(() => {
    const id = setInterval(() => {
      setTournamentIndex((current) => (current + 1) % TOURNAMENTS.length);
    }, 4600);
    return () => clearInterval(id);
  }, []);

  const moveTournament = (direction) => {
    setTournamentIndex((current) => (current + direction + TOURNAMENTS.length) % TOURNAMENTS.length);
  };

  return (
    <div className="qa-shell py-8">
      <header className="mb-6 overflow-hidden rounded-3xl p-5 lg:p-6" style={{ background: "linear-gradient(135deg, var(--surface-2), var(--surface))" }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-orange-qa">
            <Trophy className="w-4 h-4" />
            Tournois
          </div>
          <h1 className="mt-2 text-3xl font-extrabold text-ink-qa lg:text-4xl">
            Battles multijoueurs
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-ink-soft-qa">
            Choisis une cagnotte, entre dans l'arène, joue pour les premières places.
          </p>
        </div>
        <button
          onClick={() => navigate("/vip")}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-orange-qa px-4 py-3 text-sm font-bold text-white"
        >
          <ShieldCheck className="w-4 h-4" />
          Devenir VIP
        </button>
        </div>
      </header>

      {finaleMatch && (
        <section className="card mb-7 overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500" />
              <span className="text-sm font-extrabold text-ink-qa">Finale en direct</span>
            </div>
            <button onClick={() => setSpectating(true)} className="inline-flex items-center gap-2 rounded-xl bg-orange-qa px-3 py-2 text-xs font-bold text-white">
              <Eye className="w-4 h-4" />
              Regarder
            </button>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5">
            <PlayerBlock name={finaleMatch.a} score={finaleA} active={finaleA >= finaleB} onClick={() => navigate("/player/" + finaleMatch.a)} />
            <span className="text-xs font-bold uppercase text-ink-soft-qa">vs</span>
            <PlayerBlock name={finaleMatch.b} score={finaleB} active={finaleB >= finaleA} onClick={() => navigate("/player/" + finaleMatch.b)} />
          </div>
        </section>
      )}

      <section className="mb-7 grid grid-cols-1 gap-3 md:grid-cols-3">
        <InfoCard icon={Ticket} label="Ouverts" value={`${TOURNAMENTS.length} tournois`} />
        <InfoCard icon={Users} label="Participants" value={`${TOURNAMENTS.reduce((sum, tr) => sum + tr.registered, 0)} inscrits`} />
        <InfoCard icon={WalletCards} label="Cagnotte cumulée" value={formatMoney(TOURNAMENTS.reduce((sum, tr) => sum + tr.prizePool, 0), currency)} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-ink-qa">À venir</h2>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 lg:flex">
              <button onClick={() => moveTournament(-1)} className="btn-ghost grid h-8 w-8 place-items-center rounded-lg" aria-label="Tournoi précédent">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button onClick={() => moveTournament(1)} className="btn-ghost grid h-8 w-8 place-items-center rounded-lg" aria-label="Tournoi suivant">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <span className="rounded-full bg-orange-soft-qa px-3 py-1 text-xs font-bold text-orange-qa">{TOURNAMENTS.length}</span>
          </div>
        </div>

        <div className="no-scrollbar -mx-1 overflow-hidden px-1 pb-2">
          <motion.div
            className="flex gap-3"
            animate={{ x: `-${tournamentIndex * 252}px` }}
            transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
          >
          {[...TOURNAMENTS, ...TOURNAMENTS].map((tr, index) => (
            <TournamentCard
              key={`${tr.id}-${index}`}
              tr={tr}
              lang={lang}
              currency={currency}
              onOpen={() => navigate(`/tournaments/${tr.id}`)}
              index={index % TOURNAMENTS.length}
            />
          ))}
          </motion.div>
        </div>
      </section>

      <button
        onClick={() => navigate("/replays")}
        className="card mt-6 flex w-full items-center justify-between rounded-2xl p-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-soft-qa text-orange-qa">
            <Eye className="w-5 h-5" />
          </span>
          <span>
            <span className="block text-sm font-extrabold text-ink-qa">Rediffusions</span>
            <span className="block text-xs text-ink-soft-qa">Regardez les meilleurs matchs</span>
          </span>
        </span>
        <ArrowRight className="w-4 h-4 text-orange-qa" />
      </button>

      {spectating && (
        <SpectateModal
          match={{ id: "finale", category: "histoire", players: [finaleMatch.a, finaleMatch.b], pool: 8000, round: Math.min(finaleA + finaleB + 1, 10), total: 10 }}
          onClose={() => setSpectating(false)}
        />
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-3 rounded-2xl p-4">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-soft-qa text-orange-qa">
        <Icon className="w-5 h-5" />
      </span>
      <span>
        <span className="block text-xs font-bold text-ink-soft-qa">{label}</span>
        <span className="block text-sm font-extrabold text-ink-qa">{value}</span>
      </span>
    </div>
  );
}

function TournamentCard({ tr, lang, currency, onOpen, index }) {
  const fillPct = Math.round((tr.registered / tr.slots) * 100);
  const placesLeft = Math.max(tr.slots - tr.registered, 0);

  return (
    <motion.article
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
      onClick={onOpen}
      className="min-w-[236px] cursor-pointer rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
      style={{ background: "var(--surface-2)" }}
    >
      <div className="relative mb-4 h-20 overflow-hidden rounded-xl" style={{ background: "var(--surface-3)" }}>
        <img
          src={tournamentVisual(index)}
          alt=""
          className="h-full w-full object-cover opacity-80"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10px] font-extrabold uppercase text-white">
          <Trophy className="h-3 w-3 text-orange-qa" />
          Event
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-soft-qa text-orange-qa animate-clash">
          <Trophy className="h-5 w-5" />
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase" style={{ color: "var(--text-faint)" }}>Cagnotte</div>
          <div className="text-lg font-extrabold whitespace-nowrap text-orange-qa">
            {formatMoney(tr.prizePool, currency)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm font-extrabold truncate text-ink-qa">{tr.name[lang]}</div>
        <div className="mt-1 truncate text-xs text-ink-soft-qa">{tr.tagline?.[lang] || "Culture générale"}</div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
        <div className="h-full rounded-full bg-orange-qa" style={{ width: `${fillPct}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <CompactMeta icon={Ticket} label="Entrée" value={formatMoney(tr.entryFee, currency)} />
        <CompactMeta icon={Clock} label="Places" value={placesLeft} />
      </div>

      <button
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm"
      >
        <Ticket className="w-4 h-4" />
        Voir tournoi
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.article>
  );
}

function CompactMeta({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "var(--surface-3)" }}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-ink-soft-qa">
        <Icon className="w-3.5 h-3.5 text-orange-qa" />
        {label}
      </div>
      <div className="mt-0.5 truncate text-xs font-extrabold text-ink-qa">{value}</div>
    </div>
  );
}

function PlayerBlock({ name, score, active, onClick }) {
  return (
    <button onClick={onClick} className={`text-center ${active ? "" : "opacity-60"}`}>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-orange-soft-qa text-sm font-bold text-orange-qa">
        {name.substring(0, 2).toUpperCase()}
      </span>
      <span className="mt-2 block truncate text-sm font-bold text-ink-qa">{name}</span>
      <span className="mt-1 block text-3xl font-extrabold text-orange-qa">{score}</span>
    </button>
  );
}
