import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { LIVE_MATCHES, ACTIVE_DUELS, TOP_PLAYERS, TOTAL_QUESTIONS } from "../data/mockData";
import { getRank } from "../lib/eloEngine";
import { formatMoney } from "../lib/currency";
import HomeCarousel from "../components/HomeCarousel";
import SpectateModal from "../components/SpectateModal";
import {
  ArrowUpRight, BookOpen, Radio, Swords, Trophy, Play, Flame, ChevronRight, Sparkles,
} from "lucide-react";

function hostElo(name) {
  const found = TOP_PLAYERS.find((p) => p.name === name);
  return found?.level ? 820 + found.level * 12 : 1050;
}

const ONLINE_COUNT = 342; // Live user count (mock)

export default function MainLobby() {
  const navigate = useNavigate();
  const { coins, elo, user, currency } = useApp();
  const rank = getRank(elo);
  const [spectateMatch, setSpectateMatch] = useState(null);

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-10">

      {/* HERO */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="pt-2"
      >
        <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: "var(--text-faint)" }}>
          <span className="w-1.5 h-1.5 rounded-full pulse-soft" style={{ background: "var(--success)" }} />
          <span>{ONLINE_COUNT} joueurs en ligne</span>
        </div>
        <h1
          className="font-display font-semibold leading-[1.02] tracking-tight"
          style={{ color: "var(--text)", fontSize: "clamp(38px, 6.5vw, 64px)" }}
        >
          Bonjour {user?.name || "Joueur"},{" "}
          <span className="serif-italic" style={{ color: "var(--accent)" }}>
            testez votre culture.
          </span>
        </h1>
        <p className="mt-4 text-lg max-w-xl" style={{ color: "var(--text-sub)" }}>
          {rank.name} · {elo} ELO · Solde {formatMoney(coins, currency)}. Une seule catégorie, {TOTAL_QUESTIONS} questions mélangées.
        </p>
      </motion.header>

      {/* Big single CTA */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-3"
      >
        <button
          onClick={() => navigate("/duel")}
          className="btn-primary lg:col-span-2 rounded-3xl p-6 text-left flex items-center gap-5"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <Swords className="w-6 h-6" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold text-2xl leading-tight tracking-tight">Duel rapide</div>
            <div className="text-sm mt-1 opacity-85">Un adversaire · Mise libre · 10 questions</div>
          </div>
          <ArrowUpRight className="w-6 h-6 opacity-80" />
        </button>

        <button
          onClick={() => navigate("/play/random")}
          className="card card-hover rounded-3xl p-6 text-left flex items-center gap-4"
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent-hover)" }}
          >
            <Play className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold text-lg leading-tight" style={{ color: "var(--text)" }}>
              Solo
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-sub)" }}>
              Entraînement libre
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4" style={{ color: "var(--text-faint)" }} />
        </button>
      </motion.section>

      {/* Stats overview */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <StatCard label="Banque" value={TOTAL_QUESTIONS.toLocaleString()} unit="questions" />
        <StatCard label="En direct" value={LIVE_MATCHES.length} unit="matchs" accent />
        <StatCard label="Duels ouverts" value={ACTIVE_DUELS.length} unit="à rejoindre" />
        <StatCard label="Cagnotte semaine" value="8 500" unit="FCFA" />
      </motion.section>

      {/* Carousel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.11 }}
      >
        <HomeCarousel />
      </motion.div>

      {/* Live + Duels — 2 col */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <div className="card rounded-2xl overflow-hidden">
          <SectionHeader
            icon={Swords}
            title="Duels ouverts"
            count={ACTIVE_DUELS.length}
            action="Créer un duel"
            onAction={() => navigate("/duel")}
          />
          <div className="divide-y" style={{ borderColor: "var(--divider)" }}>
            {ACTIVE_DUELS.slice(0, 5).map((duel) => {
              const eloHost = hostElo(duel.host);
              const hostRank = getRank(eloHost);
              return (
                <div key={duel.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}>
                    {duel.host.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{duel.host}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                      {hostRank.name} · ELO {eloHost} · dans {duel.startsIn}
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                      {formatMoney(duel.stake, currency)}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/duel/play", {
                      state: { category: "random", stake: duel.stake, opponentName: duel.host, opponentElo: eloHost },
                    })}
                    className="btn-primary px-3 py-1.5 rounded-lg text-xs"
                  >
                    Rejoindre
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {LIVE_MATCHES.length > 0 && (
          <div className="card rounded-2xl overflow-hidden">
            <SectionHeader icon={Radio} title="En direct" count={LIVE_MATCHES.length} iconColor="var(--danger)" />
            <div className="divide-y" style={{ borderColor: "var(--divider)" }}>
              {LIVE_MATCHES.slice(0, 5).map((match) => (
                <button
                  key={match.id}
                  onClick={() => setSpectateMatch(match)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition hover:opacity-95"
                >
                  <span className="w-1.5 h-1.5 rounded-full pulse-soft" style={{ background: "var(--danger)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                      {match.players[0]} vs {match.players[1]}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                      Q{match.round}/{match.total} · cagnotte {formatMoney(match.pool, currency)}
                    </div>
                  </div>
                  <Play className="w-4 h-4" style={{ color: "var(--text-faint)" }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      {/* Top joueurs */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17 }}
      >
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display font-semibold text-2xl tracking-tight" style={{ color: "var(--text)" }}>
              Top joueurs cette semaine
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-sub)" }}>
              Classement remis à zéro chaque lundi
            </p>
          </div>
          <button onClick={() => navigate("/leaderboard")} className="btn-ghost inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg">
            Voir tout <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TOP_PLAYERS.slice(0, 3).map((p, i) => (
            <button
              key={p.id}
              onClick={() => navigate(`/player/${p.name}`)}
              className="card card-hover rounded-2xl p-4 text-left flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{
                  background: i === 0 ? "var(--accent-soft)" : "var(--surface-2)",
                  color: i === 0 ? "var(--accent-hover)" : "var(--text)",
                  border: "1px solid var(--border)",
                }}>
                {p.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>#{i + 1}</span>
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{p.name}</span>
                </div>
                <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: "var(--text-sub)" }}>
                  <span>{p.wins} v.</span>
                  {p.streak > 0 && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Flame className="w-3 h-3" style={{ color: "var(--accent)" }} />
                        {p.streak}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                  {formatMoney(p.earnings, currency)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.section>

      {spectateMatch && (
        <SpectateModal match={spectateMatch} onClose={() => setSpectateMatch(null)} />
      )}
    </div>
  );
}

function StatCard({ label, value, unit, accent }) {
  return (
    <div className="card rounded-2xl p-4">
      <div className="text-xs font-medium mb-1" style={{ color: "var(--text-faint)" }}>{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-display font-semibold text-3xl tabular-nums tracking-tight"
          style={{ color: accent ? "var(--accent)" : "var(--text)" }}
        >
          {value}
        </span>
        <span className="text-xs" style={{ color: "var(--text-faint)" }}>{unit}</span>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, iconColor, action, onAction }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--divider)" }}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4" style={{ color: iconColor || "var(--accent)" }} strokeWidth={2} />
        <h3 className="font-display font-semibold text-base truncate" style={{ color: "var(--text)" }}>{title}</h3>
        {count > 0 && <span className="chip chip-accent">{count}</span>}
      </div>
      {action && (
        <button onClick={onAction} className="btn-ghost text-xs font-medium px-3 py-1.5 rounded-lg">
          {action}
        </button>
      )}
    </div>
  );
}
