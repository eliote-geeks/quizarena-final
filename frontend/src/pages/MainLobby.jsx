import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { LIVE_MATCHES, ACTIVE_DUELS, TOP_PLAYERS } from "../data/mockData";
import { formatMoney } from "../lib/currency";
import SpectateModal from "../components/SpectateModal";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bot, ChevronRight, Coins, Flame, Play, Radio, Swords, Trophy,
} from "lucide-react";

const ONLINE_COUNT = 342;
const ACTIVITY_FEED = [
  { id: 1, type: "gain", player: "NeoQuiz", amount: 4200, detail: "vient de gagner un duel" },
  { id: 2, type: "match", player: "QuantumKid", opponent: "ArcadeKing", detail: "lance un duel 1v1" },
  { id: 3, type: "gain", player: "PixelMind", amount: 1800, detail: "remporte en solo difficile" },
  { id: 4, type: "match", player: "CipherQueen", opponent: "EchoVoid", detail: "joue en direct" },
  { id: 5, type: "gain", player: "ZenithRay", amount: 2500, detail: "vient de gagner un duel" },
];

export default function MainLobby() {
  const navigate = useNavigate();
  const { coins, user, currency } = useApp();
  const [spectateMatch, setSpectateMatch] = useState(null);
  const [activityIndex, setActivityIndex] = useState(0);
  const [duelIndex, setDuelIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActivityIndex((current) => (current + 1) % ACTIVITY_FEED.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setDuelIndex((current) => (current + 1) % ACTIVE_DUELS.length);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  const moveDuel = (direction) => {
    setDuelIndex((current) => (current + direction + ACTIVE_DUELS.length) % ACTIVE_DUELS.length);
  };

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-5xl mx-auto space-y-7">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="overflow-hidden rounded-3xl px-5 py-8 text-center sm:px-8 sm:py-12"
        style={{ background: "linear-gradient(135deg, #121032 0%, #211A4A 52%, #15122B 100%)" }}
      >
        <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-white/80">
          <span className="w-1.5 h-1.5 rounded-full pulse-soft" style={{ background: "var(--success)" }} />
          {ONLINE_COUNT} joueurs en ligne
        </div>
        <h1 className="font-display mx-auto max-w-4xl text-[clamp(2.25rem,8vw,4.75rem)] font-extrabold leading-[1.05] text-white">
          <span className="mr-2 text-orange-qa">Trophée</span>
          Qui est le plus intelligent chez vous ?
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg font-bold leading-8 text-white/60 sm:text-2xl">
          500 questions · 10 thèmes · 4 niveaux · Corrections incluses
        </p>
        <p className="mt-5 text-sm font-extrabold text-white/75">
          Bonjour {user?.name || "Joueur"} · Solde disponible : {formatMoney(coins, currency)}
        </p>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3"
      >
        <ModeCard
          icon={Bot}
          title="Solo"
          text="Défie l'ordinateur sur des quiz de culture générale et remporte selon ta mise."
          action="Jouer"
          onClick={() => navigate("/play/random")}
        />
        <ModeCard
          icon={Swords}
          title="Duel 1v1"
          text="Affronte d'autres utilisateurs et génère des revenus grâce à ta connaissance."
          action="Créer un duel"
          featured
          onClick={() => navigate("/duel")}
        />
        <ModeCard
          icon={Trophy}
          title="Tournois"
          text="Faites des battles géantes à coup de cerveau et gagnez encore plus de revenus."
          action="Voir"
          onClick={() => navigate("/tournaments")}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-xl"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        <div className="flex h-10 items-center overflow-hidden">
          <div className="flex h-full shrink-0 items-center gap-2 px-4 text-xs font-extrabold uppercase" style={{ background: "rgba(0,0,0,0.18)" }}>
            <Radio className="h-4 w-4" />
            Live
          </div>
          <div className="flex min-w-0 flex-1 items-center overflow-hidden px-4 text-sm font-bold">
            <AnimatePresence mode="wait">
              <motion.div
                key={ACTIVITY_FEED[activityIndex].id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28 }}
                className="min-w-0"
              >
                <TickerItem item={ACTIVITY_FEED[activityIndex]} currency={currency} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <div className="card rounded-2xl overflow-hidden">
          <SectionHeader
            icon={Swords}
            title="Duels disponibles"
            count={ACTIVE_DUELS.length}
            action="Créer un duel 1v1"
            onAction={() => navigate("/duel")}
            onPrev={() => moveDuel(-1)}
            onNext={() => moveDuel(1)}
          />
          <div className="no-scrollbar overflow-hidden px-4 py-4">
            <motion.div
              className="flex gap-3"
              animate={{ x: `-${duelIndex * 252}px` }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
            >
            {[...ACTIVE_DUELS, ...ACTIVE_DUELS].map((duel, index) => (
              <motion.article
                key={`${duel.id}-${index}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.24 }}
                className="min-w-[236px] rounded-2xl p-4"
                style={{ background: "var(--surface-2)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "var(--surface-3)", color: "var(--text)" }}>
                    {duel.host.slice(0, 2).toUpperCase()}
                  </div>
                  <div
                    className="animate-clash grid h-11 w-11 place-items-center rounded-xl"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    <Swords className="h-5 w-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase" style={{ color: "var(--text-faint)" }}>Mise</div>
                    <div className="text-lg font-extrabold whitespace-nowrap" style={{ color: "var(--accent)" }}>
                      {formatMoney(duel.stake, currency)}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{duel.host}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>Duel disponible</div>
                </div>
                <button
                  onClick={() => navigate("/duel/play", {
                    state: { category: "random", stake: duel.stake, opponentName: duel.host, opponentElo: 1050 },
                  })}
                  className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm"
                >
                  <Swords className="w-4 h-4" />
                  Rejoindre
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.article>
            ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display font-extrabold text-2xl" style={{ color: "var(--text)" }}>
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
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
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
                  <span className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>{p.name}</span>
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
              <div className="text-sm font-extrabold" style={{ color: "var(--accent)" }}>
                {formatMoney(p.earnings, currency)}
              </div>
            </button>
          ))}
        </div>
      </motion.section>

      {LIVE_MATCHES.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card rounded-2xl overflow-hidden"
        >
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
                  <div className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
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
        </motion.section>
      )}

      {spectateMatch && (
        <SpectateModal match={spectateMatch} onClose={() => setSpectateMatch(null)} />
      )}
    </div>
  );
}

function TickerItem({ item, currency }) {
  const isGain = item.type === "gain";
  return (
    <span className="flex min-w-0 items-center gap-2 truncate">
      {isGain ? <Coins className="h-4 w-4" /> : <Swords className="h-4 w-4" />}
      <span className="truncate">
        <strong>{item.player}</strong>
        {isGain ? ` ${item.detail} ` : ` vs ${item.opponent} `}
        {isGain && <strong>{formatMoney(item.amount, currency)}</strong>}
        {!isGain && <span>{item.detail}</span>}
      </span>
    </span>
  );
}

function ModeCard({ icon: Icon, title, text, action, onClick, featured }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-3 overflow-hidden rounded-2xl p-4 text-left transition sm:block sm:p-5 ${featured ? "btn-primary" : "card card-hover"}`}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 sm:w-full">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl"
          style={{
            background: featured ? "rgba(8,8,12,0.12)" : "var(--accent-soft)",
            color: featured ? "var(--accent-fg)" : "var(--accent)",
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <ArrowUpRight className="hidden w-5 h-5 opacity-70 sm:block" />
      </div>
      <div className="min-w-0 flex-1 sm:mt-4">
        <div className="font-display text-lg font-extrabold sm:text-xl" style={{ color: featured ? "var(--accent-fg)" : "var(--text)" }}>
          {title}
        </div>
        <p className="mt-1 line-clamp-2 text-xs font-bold leading-snug sm:mt-2 sm:text-sm sm:leading-relaxed" style={{ color: featured ? "rgba(255,255,255,0.9)" : "var(--text-sub)" }}>
          {text}
        </p>
        <div className="mt-2 inline-flex items-center gap-2 text-xs font-extrabold sm:mt-4 sm:text-sm">
          {action}
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 opacity-70 sm:hidden" />
    </button>
  );
}

function SectionHeader({ icon: Icon, title, count, iconColor, action, onAction, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid var(--divider)" }}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4" style={{ color: iconColor || "var(--accent)" }} strokeWidth={2} />
        <h3 className="font-display font-extrabold text-base truncate" style={{ color: "var(--text)" }}>{title}</h3>
        {count > 0 && <span className="chip chip-accent">{count}</span>}
      </div>
      {action && (
        <div className="flex items-center gap-2">
          {onPrev && onNext && (
            <div className="hidden items-center gap-1 lg:flex">
              <button onClick={onPrev} className="btn-ghost grid h-8 w-8 place-items-center rounded-lg" aria-label="Précédent">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button onClick={onNext} className="btn-ghost grid h-8 w-8 place-items-center rounded-lg" aria-label="Suivant">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <button onClick={onAction} className="btn-ghost text-xs font-bold px-3 py-1.5 rounded-lg">
            {action}
          </button>
        </div>
      )}
    </div>
  );
}
