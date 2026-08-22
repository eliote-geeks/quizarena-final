import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Clock, Coins, Swords, Ticket, Trophy, Users } from "lucide-react";
import { useApp } from "../context/AppContext";
import { TOURNAMENTS } from "../data/mockData";
import { formatMoney } from "../lib/currency";

const TOURNAMENT_VISUALS = [
  "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80",
];

export default function TournamentDetail() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { lang, coins, currency, addCoins } = useApp();
  const [registered, setRegistered] = useState(false);

  const tournament = useMemo(
    () => TOURNAMENTS.find((item) => item.id === tournamentId),
    [tournamentId]
  );

  if (!tournament) {
    return (
      <div className="qa-shell py-8">
        <button onClick={() => navigate("/tournaments")} className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <div className="card mt-6 rounded-3xl p-6">
          <h1 className="text-2xl font-extrabold text-ink-qa">Tournoi introuvable</h1>
        </div>
      </div>
    );
  }

  const placesLeft = Math.max(tournament.slots - tournament.registered - (registered ? 1 : 0), 0);
  const registeredCount = Math.min(tournament.slots, tournament.registered + (registered ? 1 : 0));
  const fillPct = Math.round((registeredCount / tournament.slots) * 100);
  const canRegister = coins >= tournament.entryFee && !registered && placesLeft > 0;
  const visualIndex = TOURNAMENTS.findIndex((item) => item.id === tournament.id);
  const visual = TOURNAMENT_VISUALS[Math.max(0, visualIndex) % TOURNAMENT_VISUALS.length];

  const handleRegister = () => {
    if (registered) return;
    if (coins < tournament.entryFee) {
      toast.error("Solde insuffisant", { description: `Il vous faut ${formatMoney(tournament.entryFee, currency)}.` });
      return;
    }
    if (placesLeft <= 0) {
      toast.error("Tournoi complet");
      return;
    }
    addCoins(-tournament.entryFee);
    setRegistered(true);
    toast.success("Inscription validée", { description: tournament.name[lang] });
  };

  return (
    <div className="qa-shell py-8">
      <button onClick={() => navigate("/tournaments")} className="btn-secondary mb-5 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Tournois
      </button>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl"
        style={{ background: "var(--surface)" }}
      >
        <div className="relative h-44 overflow-hidden lg:h-56" style={{ background: "var(--surface-2)" }}>
          <img src={visual} alt="" className="h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5" />
          <div className="absolute inset-x-0 bottom-0 p-5 lg:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-soft-qa px-3 py-1 text-xs font-extrabold uppercase text-orange-qa">
              <Trophy className="h-4 w-4" />
              Tournoi
            </div>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight text-white lg:text-5xl">
              {tournament.name[lang]}
            </h1>
            <p className="mt-1 text-sm font-bold text-white/75">{tournament.tagline?.[lang]}</p>
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_300px] lg:items-stretch lg:p-6">
          <div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroStat icon={Coins} label="Cagnotte" value={formatMoney(tournament.prizePool, currency)} />
              <HeroStat icon={Ticket} label="Entrée" value={formatMoney(tournament.entryFee, currency)} />
              <HeroStat icon={Users} label="Places" value={placesLeft} />
              <HeroStat icon={Clock} label="Départ" value={tournament.startsIn} />
            </div>
          </div>

          <div className="rounded-3xl p-4" style={{ background: "var(--bg)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-ink-soft-qa">Inscrits</span>
              <span className="text-xl font-extrabold text-orange-qa">{registeredCount}/{tournament.slots}</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}>
              <div className="h-full rounded-full bg-orange-qa" style={{ width: `${fillPct}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-8 gap-1.5">
              {Array.from({ length: tournament.slots }).map((_, index) => (
                <span
                  key={index}
                  className="h-2 rounded-full"
                  style={{ background: index < registeredCount ? "var(--accent)" : "var(--surface-3)" }}
                />
              ))}
            </div>
            <button
              onClick={handleRegister}
              disabled={!canRegister}
              className={canRegister
                ? "btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base"
                : "btn-secondary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base opacity-75"}
            >
              {registered ? <Check className="h-5 w-5" /> : <Ticket className="h-5 w-5" />}
              {registered ? "Inscrit" : placesLeft <= 0 ? "Complet" : "S'inscrire"}
              {!registered && placesLeft > 0 && <ArrowRight className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.section>

      <section className="mt-5 grid gap-3 md:grid-cols-3">
        <ActionCard icon={Swords} title="Démarrage" value={tournament.startsIn} />
        <ActionCard icon={Trophy} title="Objectif" value="Top places" />
        <ActionCard icon={Coins} title="Solde après entrée" value={formatMoney(Math.max(0, coins - (registered ? 0 : tournament.entryFee)), currency)} />
      </section>

      <TournamentBracket />
    </div>
  );
}

function TournamentBracket() {
  const rounds = [
    ["NeoQuiz", "PixelMind", "QuantumKid", "ArcadeKing"],
    ["NeoQuiz", "QuantumKid"],
    ["Finale"],
  ];

  return (
    <section className="card mt-5 overflow-hidden rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-orange-qa" />
          <h2 className="text-lg font-extrabold text-ink-qa">Suivi du tournoi</h2>
        </div>
        <span className="rounded-full bg-orange-soft-qa px-3 py-1 text-xs font-extrabold text-orange-qa">Live</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px]">
        {rounds.map((round, roundIndex) => (
          <div key={roundIndex} className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase text-ink-soft-qa">
              {roundIndex === 0 ? "Quarts" : roundIndex === 1 ? "Demi-finales" : "Finale"}
            </p>
            {round.map((name, index) => (
              <div key={name + index} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--surface-2)" }}>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-soft-qa text-xs font-extrabold text-orange-qa">
                  {roundIndex === 2 ? <Trophy className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink-qa">{name}</span>
                {roundIndex < 2 && <span className="h-px w-8 bg-orange-qa/70" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-ink-soft-qa">
        <Icon className="h-3.5 w-3.5 text-orange-qa" />
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-extrabold text-ink-qa">{value}</div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, value }) {
  return (
    <div className="card flex items-center gap-3 rounded-2xl p-4">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-soft-qa text-orange-qa">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-ink-soft-qa">{title}</span>
        <span className="block truncate text-sm font-extrabold text-ink-qa">{value}</span>
      </span>
    </div>
  );
}
