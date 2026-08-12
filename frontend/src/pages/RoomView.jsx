import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import {
  CATEGORIES,
  ONLINE_PLAYERS,
  LIVE_MATCHES,
  ACTIVE_DUELS,
  ALL_REPLAYS,
  getCategory,
} from "../data/mockData";
import { getRank } from "../lib/eloEngine";
import { formatMoney } from "../lib/currency";
import SpectateModal from "../components/SpectateModal";
import ReplayModal from "../components/ReplayModal";
import {
  Play, Swords, Eye, Clock, Radio, Users, ChevronRight, X,
} from "lucide-react";

const AMBER = "#E5A800";
const GREEN = "#5DD66E";

const STATUS = {
  lobby:  { color: GREEN, label: "Dispo" },
  ingame: { color: AMBER, label: "En jeu" },
  away:   { color: "var(--qa-text-faint)", label: "Absent" },
};

export default function RoomView() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { lang, currency } = useApp();

  const [spectating, setSpectating]   = useState(null);
  const [replayModal, setReplayModal] = useState(null);
  const [challenged, setChallenged]   = useState(null);

  const cat = getCategory(categoryId);
  if (!cat) return <Navigate to="/room/histoire" replace />;

  const Icon = cat.icon;

  const liveMatches  = LIVE_MATCHES.filter((m) => m.category === categoryId);
  const waitingDuels = ACTIVE_DUELS.filter((d) => d.category === categoryId);
  const replays      = ALL_REPLAYS.filter((r) => r.category === categoryId);
  const roomPlayers  = ONLINE_PLAYERS.filter((p) => p.room === categoryId);
  const activePlayers = roomPlayers.filter(p => p.status !== "away").length;

  return (
    <>
      {/* Mobile: category pill switcher */}
      <div
        className="lg:hidden sticky top-[54px] z-30 flex overflow-x-auto no-scrollbar px-3 py-2.5 gap-2"
        style={{
          background: "var(--qa-topbar)",
          borderBottom: "1px solid var(--qa-border)",
        }}
      >
        {CATEGORIES.map((c) => {
          const CIcon = c.icon;
          const isA = c.id === categoryId;
          return (
            <button
              key={c.id}
              onClick={() => navigate("/room/" + c.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0 font-bold transition"
              style={isA
                ? { background: `${AMBER}22`, color: AMBER, border: `1px solid ${AMBER}55` }
                : { color: "var(--qa-text-sub)", border: "1px solid var(--qa-border)" }}
            >
              <CIcon className="w-3.5 h-3.5" />
              {c.name[lang]}
            </button>
          );
        })}
      </div>

      <div className="min-h-full px-4 sm:px-6 py-6 max-w-2xl mx-auto space-y-6">

        {/* Header + CTAs */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${AMBER}22`, color: AMBER }}
            >
              <Icon className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-2xl leading-tight" style={{ color: "var(--qa-text)" }}>
                {cat.name[lang]}
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--qa-text-sub)" }}>
                {cat.description[lang]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5" style={{ color: "var(--qa-text-sub)" }}>
              <Users className="w-4 h-4" />
              <span className="text-sm font-semibold">{activePlayers} joueurs</span>
            </div>
            {liveMatches.length > 0 && (
              <div className="flex items-center gap-1.5" style={{ color: "#FF6B6B" }}>
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span className="text-sm font-bold">{liveMatches.length} live</span>
              </div>
            )}
          </div>
        </motion.header>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => navigate("/play/" + categoryId)}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(160deg, ${AMBER} 0%, #C99500 100%)`,
              color: "#07070F",
              boxShadow: `0 12px 28px -12px ${AMBER}55`,
            }}
          >
            <Play className="w-5 h-5" strokeWidth={2.4} />
            <div className="font-display font-bold text-base">Jouer en solo</div>
          </button>
          <button
            onClick={() => navigate("/duel", { state: { defaultCategory: categoryId } })}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all hover:scale-[1.02]"
            style={{
              background: "var(--qa-surface)",
              border: "1px solid var(--qa-border-md)",
              color: "var(--qa-text)",
            }}
          >
            <Swords className="w-5 h-5" style={{ color: AMBER }} strokeWidth={2.4} />
            <div className="font-display font-bold text-base">Lancer un duel</div>
          </button>
        </motion.div>

        {/* LIVE */}
        {liveMatches.length > 0 && (
          <Section
            icon={<Radio className="w-4 h-4 animate-pulse" style={{ color: "#FF6B6B" }} />}
            title="En direct"
            count={liveMatches.length}
            countColor="#FF6B6B"
            delay={0.08}
          >
            {liveMatches.map((m) => (
              <button
                key={m.id}
                onClick={() => setSpectating(m)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition hover:opacity-95"
                style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
              >
                <div className="relative w-10 h-10 flex-shrink-0">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--qa-border-md)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke={AMBER} strokeWidth="3"
                      strokeDasharray={`${(m.round / m.total) * 88} 88`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span
                    className="absolute inset-0 flex items-center justify-center font-display font-bold text-xs"
                    style={{ color: AMBER }}
                  >
                    Q{m.round}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: "var(--qa-text)" }}>
                    {m.players[0]} vs {m.players[1]}
                  </div>
                  <div className="text-xs mt-0.5 font-semibold" style={{ color: AMBER }}>
                    {formatMoney(m.pool, currency)}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                  style={{ background: `${AMBER}22`, color: AMBER }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Regarder
                </div>
              </button>
            ))}
          </Section>
        )}

        {/* WAITING DUELS */}
        <Section
          icon={<Swords className="w-4 h-4" style={{ color: AMBER }} />}
          title="Duels ouverts"
          count={waitingDuels.length}
          delay={0.11}
        >
          {waitingDuels.length === 0 ? (
            <EmptyState text="Aucun défi ouvert — sois le premier !" />
          ) : (
            waitingDuels.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: `${AMBER}22`, color: AMBER }}
                >
                  {d.host.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate("/player/" + d.host)}
                    className="text-sm font-bold hover:underline text-left truncate block"
                    style={{ color: "var(--qa-text)" }}
                  >
                    {d.host}
                  </button>
                  <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--qa-text-sub)" }}>
                    <span className="font-bold" style={{ color: AMBER }}>{formatMoney(d.stake, currency)}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {d.startsIn}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    navigate("/duel", {
                      state: {
                        quickOpponent: { name: d.host, elo: 1050 },
                        defaultCategory: categoryId,
                        defaultStake: d.stake,
                      },
                    })
                  }
                  className="px-4 py-2 rounded-xl text-sm font-bold transition hover:opacity-90 flex-shrink-0"
                  style={{ background: AMBER, color: "#07070F" }}
                >
                  Rejoindre
                </button>
              </div>
            ))
          )}
        </Section>

        {/* PLAYERS ONLINE */}
        <Section
          icon={<Users className="w-4 h-4" style={{ color: GREEN }} />}
          title="Joueurs en ligne"
          count={activePlayers}
          delay={0.14}
        >
          {roomPlayers.length === 0 ? (
            <EmptyState text="Aucun joueur ici" />
          ) : (
            <div className="grid gap-2">
              {roomPlayers.slice(0, 6).map((p) => {
                const pRank = getRank(p.elo);
                const st = STATUS[p.status];
                const isOpen = challenged === p.name;

                return (
                  <div key={p.name}>
                    <button
                      onClick={() => setChallenged(isOpen ? null : p.name)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition hover:opacity-95"
                      style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                          style={{ background: `${AMBER}22`, color: AMBER }}
                        >
                          {p.avatar}
                        </div>
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                          style={{
                            background: st.color,
                            border: "2px solid var(--qa-surface)",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: "var(--qa-text)" }}>
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--qa-text-sub)" }}>
                          <span style={{ color: pRank.color }}>{pRank.emoji} {p.elo}</span>
                          <span>·</span>
                          <span style={{ color: st.color === "var(--qa-text-faint)" ? "var(--qa-text-faint)" : st.color }}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--qa-text-faint)" }} />
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mt-2 p-4 rounded-2xl"
                            style={{
                              background: `${AMBER}10`,
                              border: `1px solid ${AMBER}30`,
                            }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-bold" style={{ color: "var(--qa-text)" }}>
                                Défier {p.name}
                              </div>
                              <button
                                onClick={() => setChallenged(null)}
                                className="p-1 rounded-lg"
                                style={{ color: "var(--qa-text-faint)" }}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="text-xs font-bold mb-2" style={{ color: "var(--qa-text-sub)" }}>
                              Choisis la mise
                            </div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {[100, 250, 500, 1000].map((amt) => (
                                <button
                                  key={amt}
                                  onClick={() => {
                                    setChallenged(null);
                                    navigate("/duel", {
                                      state: {
                                        quickOpponent: { name: p.name, elo: p.elo },
                                        defaultCategory: categoryId,
                                        defaultStake: amt,
                                      },
                                    });
                                  }}
                                  className="py-2 rounded-xl text-sm font-bold transition hover:opacity-90"
                                  style={{ background: AMBER, color: "#07070F" }}
                                >
                                  {amt >= 1000 ? `${amt / 1000}k` : amt}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                setChallenged(null);
                                navigate("/player/" + p.name);
                              }}
                              className="w-full py-2 rounded-xl text-sm font-bold transition"
                              style={{
                                background: "var(--qa-active)",
                                color: "var(--qa-text)",
                              }}
                            >
                              Voir le profil
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* REPLAYS */}
        <Section
          icon={<Play className="w-4 h-4" style={{ color: AMBER }} />}
          title="Replays récents"
          count={replays.length}
          delay={0.17}
          right={
            <button
              onClick={() => navigate("/replays")}
              className="text-xs font-bold hover:underline flex items-center gap-0.5"
              style={{ color: AMBER }}
            >
              Tous <ChevronRight className="w-3 h-3" />
            </button>
          }
        >
          {replays.length === 0 ? (
            <EmptyState text="Aucun replay disponible" />
          ) : (
            replays.slice(0, 4).map((r) => {
              const aWon = r.scoreA > r.scoreB;
              return (
                <button
                  key={r.id}
                  onClick={() => setReplayModal(r)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition hover:opacity-95"
                  style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold flex items-center flex-wrap gap-1" style={{ color: "var(--qa-text)" }}>
                      <span style={{ color: aWon ? AMBER : "var(--qa-text)" }}>{r.playerA}</span>
                      <span className="font-display font-bold" style={{ color: aWon ? AMBER : "var(--qa-text-sub)" }}>
                        {r.scoreA}
                      </span>
                      <span style={{ color: "var(--qa-text-faint)" }}>—</span>
                      <span className="font-display font-bold" style={{ color: !aWon ? AMBER : "var(--qa-text-sub)" }}>
                        {r.scoreB}
                      </span>
                      <span style={{ color: !aWon ? AMBER : "var(--qa-text)" }}>{r.playerB}</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--qa-text-sub)" }}>
                      {r.tournament} · {r.round} · {r.date}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0"
                    style={{ background: `${AMBER}22`, color: AMBER }}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Revoir
                  </div>
                </button>
              );
            })
          )}
        </Section>

      </div>

      {spectating && <SpectateModal match={spectating} onClose={() => setSpectating(null)} />}
      {replayModal && <ReplayModal replay={replayModal} onClose={() => setReplayModal(null)} />}
    </>
  );
}

function Section({ icon, title, count, countColor, right, children, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="font-display font-bold text-lg" style={{ color: "var(--qa-text)" }}>
          {title}
        </h2>
        {count > 0 && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: countColor ? `${countColor}22` : `${AMBER}22`,
              color: countColor || AMBER,
            }}
          >
            {count}
          </span>
        )}
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className="space-y-2">{children}</div>
    </motion.section>
  );
}

function EmptyState({ text }) {
  return (
    <div
      className="py-8 text-center text-sm rounded-2xl"
      style={{
        background: "var(--qa-surface)",
        border: "1px dashed var(--qa-border)",
        color: "var(--qa-text-sub)",
      }}
    >
      {text}
    </div>
  );
}
