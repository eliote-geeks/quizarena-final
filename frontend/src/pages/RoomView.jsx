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
  CATEGORY_COLORS,
  getCategory,
} from "../data/mockData";
import { getRank } from "../lib/eloEngine";
import SpectateModal from "../components/SpectateModal";
import ReplayModal from "../components/ReplayModal";
import {
  Play, Swords, Eye, Clock, Radio, User, ChevronRight, X,
} from "lucide-react";

const AMBER = "#E5A800";

const STATUS = {
  lobby:  { color: "#5DD66E", label: "Disponible" },
  ingame: { color: AMBER,     label: "En partie"  },
  away:   { color: "#505060", label: "Absent"     },
};

export default function RoomView() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { lang } = useApp();

  const [spectating, setSpectating]   = useState(null);
  const [replayModal, setReplayModal] = useState(null);
  const [challenged, setChallenged]   = useState(null);

  const cat = getCategory(categoryId);
  if (!cat) return <Navigate to="/room/histoire" replace />;

  const color  = CATEGORY_COLORS[categoryId] || AMBER;
  const Icon   = cat.icon;

  const liveMatches  = LIVE_MATCHES.filter((m) => m.category === categoryId);
  const waitingDuels = ACTIVE_DUELS.filter((d) => d.category === categoryId);
  const replays      = ALL_REPLAYS.filter((r) => r.category === categoryId);
  const roomPlayers  = ONLINE_PLAYERS.filter((p) => p.room === categoryId);

  return (
    <>
      {/* ── Mobile: category pill switcher ── */}
      <div
        className="lg:hidden sticky top-[48px] z-40 flex overflow-x-auto no-scrollbar border-b border-white/[0.06] px-3 py-2 gap-1.5"
        style={{ background: "#06060E" }}
      >
        {CATEGORIES.map((c) => {
          const CIcon = c.icon;
          const cColor = CATEGORY_COLORS[c.id] || AMBER;
          const isA = c.id === categoryId;
          return (
            <button
              key={c.id}
              onClick={() => navigate("/room/" + c.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap flex-shrink-0 font-medium border transition"
              style={isA
                ? { background: `${cColor}20`, color: cColor, borderColor: `${cColor}40` }
                : { color: "rgba(255,255,255,0.35)", borderColor: "rgba(255,255,255,0.07)" }}
            >
              <CIcon className="w-3 h-3" />
              {c.name.fr}
            </button>
          );
        })}
      </div>

      {/* ── Main 2-column layout ── */}
      <div className="flex">

        {/* ────────────── CENTER CONTENT ────────────── */}
        <div className="flex-1 min-w-0">

          {/* Room header */}
          <div
            className="px-5 py-5 border-b"
            style={{
              borderColor: `${color}18`,
              background: `linear-gradient(120deg, ${color}0E 0%, transparent 60%)`,
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}20`, color }}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-white leading-tight">
                    Salle&nbsp;
                    <span style={{ color }}>{cat.name[lang]}</span>
                  </h1>
                  <p className="text-[11px] text-white/35 mt-0.5">{cat.description[lang]}</p>
                </div>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
                <div className="flex items-center gap-1 text-[10px] text-white/30">
                  <User className="w-3 h-3" />
                  <span>{roomPlayers.filter(p => p.status !== "away").length}</span>
                </div>
                {liveMatches.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px]" style={{ color: "#FF6B6B" }}>
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    <span>{liveMatches.length} live</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/play/" + categoryId)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition hover:opacity-90"
                style={{ background: color, color: "#07070F" }}
              >
                <Play className="w-3 h-3" /> Jouer Solo
              </button>
              <button
                onClick={() => navigate("/duel", { state: { defaultCategory: categoryId } })}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition hover:border-white/20 text-white/60 hover:text-white"
                style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
              >
                <Swords className="w-3 h-3" /> Créer un défi
              </button>
            </div>
          </div>

          {/* Sections */}
          <div className="p-4 space-y-6">

            {/* ── LIVE MATCHES ── */}
            <Section
              icon={<Radio className="w-3 h-3 animate-pulse" style={{ color: "#FF6B6B" }} />}
              title="En direct"
              count={liveMatches.length}
              countColor="#FF6B6B"
            >
              {liveMatches.length === 0 ? (
                <EmptyState text="Aucun match en direct" />
              ) : (
                liveMatches.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.06] bg-[#0D0D1A] hover:border-white/[0.12] transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Arc progress */}
                      <div className="relative w-9 h-9 flex-shrink-0">
                        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="13" fill="none"
                            stroke={color} strokeWidth="3"
                            strokeDasharray={`${(m.round / m.total) * 82} 82`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center font-arcade text-[9px]" style={{ color }}>
                          {m.round}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white/80 truncate">
                          <button
                            onClick={() => navigate("/player/" + m.players[0])}
                            className="hover:text-white hover:underline transition"
                          >
                            {m.players[0]}
                          </button>
                          <span className="text-white/25 mx-1.5">vs</span>
                          <button
                            onClick={() => navigate("/player/" + m.players[1])}
                            className="hover:text-white hover:underline transition"
                          >
                            {m.players[1]}
                          </button>
                        </div>
                        <div className="font-arcade text-[11px] mt-0.5" style={{ color }}>
                          {m.pool.toLocaleString()} pts · Q{m.round}/{m.total}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSpectating(m)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                      style={{ background: `${color}15`, color }}
                    >
                      <Eye className="w-3 h-3" /> Regarder
                    </button>
                  </motion.div>
                ))
              )}
            </Section>

            {/* ── WAITING DUELS ── */}
            <Section
              icon={<Swords className="w-3 h-3 text-white/30" />}
              title="Duels en attente"
              count={waitingDuels.length}
            >
              {waitingDuels.length === 0 ? (
                <EmptyState text="Aucun défi ouvert — sois le premier !" />
              ) : (
                waitingDuels.map((d, i) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.06] bg-[#0D0D1A] hover:border-white/[0.12] transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 border"
                        style={{ background: `${color}12`, color, borderColor: `${color}22` }}
                      >
                        {d.host.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <button
                          onClick={() => navigate("/player/" + d.host)}
                          className="text-xs font-medium text-white/80 hover:text-white hover:underline transition truncate block text-left"
                        >
                          {d.host}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-arcade text-[11px]" style={{ color }}>
                            {d.stake.toLocaleString()} pts
                          </span>
                          <span className="text-white/15">·</span>
                          <Clock className="w-2.5 h-2.5 text-white/20" />
                          <span className="text-[10px] text-white/30">{d.startsIn}</span>
                        </div>
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
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition flex-shrink-0 hover:opacity-90"
                      style={{ background: color, color: "#07070F" }}
                    >
                      Rejoindre
                    </button>
                  </motion.div>
                ))
              )}
            </Section>

            {/* ── REPLAYS ── */}
            <Section
              icon={<Play className="w-3 h-3 text-white/30" />}
              title="Replays récents"
              count={replays.length}
              right={
                <button
                  onClick={() => navigate("/replays")}
                  className="flex items-center gap-0.5 text-[10px] text-white/25 hover:text-white/50 transition"
                >
                  Tous <ChevronRight className="w-3 h-3" />
                </button>
              }
            >
              {replays.length === 0 ? (
                <EmptyState text="Aucun replay disponible" />
              ) : (
                replays.slice(0, 4).map((r, i) => {
                  const aWon = r.scoreA > r.scoreB;
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-[#0D0D1A] hover:border-white/[0.12] transition group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs flex-wrap">
                          <button
                            onClick={() => navigate("/player/" + r.playerA)}
                            className="font-medium hover:underline transition"
                            style={{ color: aWon ? color : "rgba(255,255,255,0.65)" }}
                          >
                            {r.playerA}
                          </button>
                          <span
                            className="font-arcade text-base px-1 leading-none"
                            style={{ color: aWon ? color : "rgba(255,255,255,0.3)" }}
                          >
                            {r.scoreA}
                          </span>
                          <span className="text-white/20 text-[10px]">—</span>
                          <span
                            className="font-arcade text-base px-1 leading-none"
                            style={{ color: !aWon ? color : "rgba(255,255,255,0.3)" }}
                          >
                            {r.scoreB}
                          </span>
                          <button
                            onClick={() => navigate("/player/" + r.playerB)}
                            className="font-medium hover:underline transition"
                            style={{ color: !aWon ? color : "rgba(255,255,255,0.65)" }}
                          >
                            {r.playerB}
                          </button>
                        </div>
                        <div className="text-[10px] text-white/25 mt-0.5">
                          {r.tournament} · {r.round} · {r.date}
                        </div>
                      </div>
                      <button
                        onClick={() => setReplayModal(r)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                        style={{ background: `${color}15`, color }}
                      >
                        <Play className="w-2.5 h-2.5" /> Revoir
                      </button>
                    </motion.div>
                  );
                })
              )}
            </Section>

          </div>
        </div>

        {/* ────────────── RIGHT: PLAYERS PANEL ────────────── */}
        <div
          className="hidden lg:flex flex-col shrink-0 border-l border-white/[0.06]"
          style={{
            width: 220,
            position: "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
            background: "#07070F",
          }}
        >
          {/* Panel header */}
          <div
            className="px-4 py-3 border-b border-white/[0.06]"
            style={{ background: `${color}08` }}
          >
            <div className="text-[9px] uppercase tracking-[0.12em] text-white/20 font-semibold mb-0.5">
              Dans cette salle
            </div>
            <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
              {roomPlayers.filter(p => p.status !== "away").length} joueurs · {cat.name[lang]}
            </div>
          </div>

          {/* Players list */}
          <div className="flex-1 p-2 space-y-px overflow-y-auto no-scrollbar">
            {roomPlayers.length === 0 ? (
              <div className="py-10 text-center text-[11px] text-white/20">
                Aucun joueur ici
              </div>
            ) : (
              roomPlayers.map((p, i) => {
                const pRank = getRank(p.elo);
                const st = STATUS[p.status];
                const isOpen = challenged === p.name;

                return (
                  <div key={p.name}>
                    <motion.div
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2 px-2.5 py-2.5 rounded-lg transition cursor-pointer group hover:bg-white/[0.03]"
                      onClick={() => setChallenged(isOpen ? null : p.name)}
                    >
                      {/* Avatar + status dot */}
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold border"
                          style={{ background: `${color}10`, color, borderColor: `${color}18` }}
                        >
                          {p.avatar}
                        </div>
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#07070F]"
                          style={{ background: st.color }}
                        />
                      </div>
                      {/* Name + ELO */}
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium text-white/80 group-hover:text-white truncate transition">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[8px]" style={{ color: pRank.color }}>{pRank.emoji}</span>
                          <span className="font-arcade text-[9px]" style={{ color: pRank.color }}>{p.elo}</span>
                          <span className="text-[7px] text-white/15">·</span>
                          <span className="text-[8px]" style={{ color: st.color }}>{st.label}</span>
                        </div>
                      </div>
                      <ChevronRight
                        className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      />
                    </motion.div>

                    {/* Inline challenge popup */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.16 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mx-2 mb-1 p-3 rounded-xl border"
                            style={{ background: `${color}08`, borderColor: `${color}25` }}
                          >
                            {/* Close */}
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="text-[10px] text-white/50">
                                Défier <span className="text-white font-semibold">{p.name}</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setChallenged(null); }}
                                className="text-white/20 hover:text-white/60 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Stake quick-select */}
                            <div className="text-[9px] text-white/30 mb-1.5 uppercase tracking-wider">
                              Mise
                            </div>
                            <div className="grid grid-cols-2 gap-1 mb-2.5">
                              {[100, 250, 500, 1000].map((amt) => (
                                <button
                                  key={amt}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChallenged(null);
                                    navigate("/duel", {
                                      state: {
                                        quickOpponent: { name: p.name, elo: p.elo },
                                        defaultCategory: categoryId,
                                        defaultStake: amt,
                                      },
                                    });
                                  }}
                                  className="py-1.5 text-[10px] font-semibold rounded-lg border transition hover:opacity-90 text-center"
                                  style={{
                                    borderColor: `${color}30`,
                                    color,
                                    background: `${color}10`,
                                  }}
                                >
                                  {amt.toLocaleString()}
                                </button>
                              ))}
                            </div>

                            {/* Profile link */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setChallenged(null);
                                navigate("/player/" + p.name);
                              }}
                              className="w-full py-1.5 text-[10px] rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 transition text-center"
                            >
                              Voir le profil
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {spectating && <SpectateModal match={spectating} onClose={() => setSpectating(null)} />}
      {replayModal && <ReplayModal replay={replayModal} onClose={() => setReplayModal(null)} />}
    </>
  );
}

function Section({ icon, title, count, countColor, right, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-semibold text-white/40">
          {title}
        </span>
        {count > 0 && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-bold leading-none"
            style={{
              background: countColor ? `${countColor}20` : "rgba(255,255,255,0.06)",
              color: countColor || "rgba(255,255,255,0.35)",
            }}
          >
            {count}
          </span>
        )}
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyState({ text }) {
  return (
    <div
      className="py-7 text-center text-[11px] text-white/20 rounded-xl border border-white/[0.04]"
      style={{ background: "rgba(255,255,255,0.01)" }}
    >
      {text}
    </div>
  );
}
