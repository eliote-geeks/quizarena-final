import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TOP_PLAYERS } from "../data/mockData";
import { formatMoney } from "../lib/currency";
import { useApp } from "../context/AppContext";
import { ArrowRight, Flame, Medal, Trophy, Users } from "lucide-react";

const TABS = [
  { id: "week", label: "Cette semaine" },
  { id: "all", label: "Tous les temps" },
];

export default function Leaderboard() {
  const navigate = useNavigate();
  const { currency } = useApp();
  const [tab, setTab] = useState("week");
  const [switching, setSwitching] = useState(false);
  const players = useMemo(() => (
    tab === "week"
      ? TOP_PLAYERS.map((p, i) => ({ ...p, earnings: Math.round(p.earnings * (0.10 + (0.9 / (i + 1)))) }))
      : TOP_PLAYERS
  ), [tab]);

  const selectTab = (nextTab) => {
    if (nextTab === tab) return;
    setSwitching(true);
    setTimeout(() => {
      setTab(nextTab);
      setSwitching(false);
    }, 420);
  };

  return (
    <div className="qa-shell space-y-7 py-8">
      <header>
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-orange-qa">
          <Trophy className="w-4 h-4" />
          Classement
        </div>
        <h1 className="mt-2 text-3xl font-extrabold text-ink-qa lg:text-4xl">
          Top joueurs
        </h1>
        <p className="mt-2 text-sm text-ink-soft-qa">
          Classement remis à zéro chaque lundi. Les gains sont affichés en FCFA.
        </p>
      </header>

      <div className="card inline-flex gap-1 rounded-2xl p-1">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => selectTab(tb.id)}
            className={tab === tb.id ? "btn-primary rounded-xl px-4 py-2 text-sm" : "btn-ghost rounded-xl px-4 py-2 text-sm"}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {switching ? (
          <motion.section
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-3 lg:grid-cols-3"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="card h-[170px] overflow-hidden rounded-2xl p-4">
                <div className="h-full animate-pulse rounded-xl" style={{ background: "var(--surface-2)" }} />
              </div>
            ))}
          </motion.section>
        ) : (
          <motion.section
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className="grid gap-3 lg:grid-cols-3"
          >
            {players.slice(0, 3).map((p, i) => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate(`/player/${p.name}`)}
                className="card card-hover rounded-2xl p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-orange-soft-qa text-sm font-extrabold text-orange-qa">
                    {p.avatar}
                  </span>
                  <span className="rounded-full bg-orange-qa px-3 py-1 text-xs font-bold text-white">#{i + 1}</span>
                </div>
                <p className="mt-3 text-base font-extrabold text-ink-qa">{p.name}</p>
                <p className="mt-1 text-xs text-ink-soft-qa">{p.wins} victoires · classé par gains</p>
                <p className="mt-3 text-lg font-extrabold text-orange-qa">{formatMoney(p.earnings, currency)}</p>
              </motion.button>
            ))}
          </motion.section>
        )}
      </AnimatePresence>

      <section>
        <SectionTitle icon={Users} title="Classement complet" />
        <div className="card overflow-hidden rounded-2xl">
          {players.slice(3).map((p, i) => (
            <button
              key={p.id}
              onClick={() => navigate(`/player/${p.name}`)}
              className="grid w-full grid-cols-[auto_auto_1fr_auto] items-center gap-3 border-b px-4 py-3 text-left last:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="w-8 text-center text-sm font-extrabold text-ink-soft-qa">{i + 4}</span>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-cream-qa text-sm font-bold text-ink-qa">{p.avatar}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-ink-qa">{p.name}</span>
                <span className="flex items-center gap-2 text-xs text-ink-soft-qa">
                  {p.wins} victoires
                  {p.streak > 0 && <><Flame className="w-3 h-3 text-orange-qa" /> {p.streak}</>}
                </span>
              </span>
              <span className="text-sm font-extrabold text-orange-qa">{formatMoney(p.earnings, currency)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-soft-qa text-orange-qa">
            <Medal className="w-6 h-6" />
          </span>
          <div className="flex-1">
            <p className="text-lg font-extrabold text-ink-qa">Récompenses hebdomadaires</p>
            <p className="text-sm text-ink-soft-qa">Les trois meilleurs joueurs reçoivent un bonus automatique.</p>
          </div>
          <button className="hidden items-center gap-1 text-sm font-bold text-orange-qa sm:flex">
            Détails <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="w-5 h-5 text-orange-qa" />
      <h2 className="text-lg font-extrabold text-ink-qa">{title}</h2>
    </div>
  );
}
