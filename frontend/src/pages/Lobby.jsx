import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { LIVE_MATCHES, ACTIVE_DUELS, TOURNAMENTS } from "../data/mockData";
import CategoryChip from "../components/CategoryChip";
import SpectateModal from "../components/SpectateModal";
import OnlinePlayersPanel from "../components/OnlinePlayersPanel";
import { Zap, Swords, Trophy, Eye, Users, Clock, ChevronRight, Star, CheckCircle } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";

const AMBER = "#E5A800";

const DAILY = {
  category: "sciences",
  label: { fr: "Sciences", en: "Science" },
  total: 10,
  players: 2847,
};

export default function Lobby() {
  const { t, lang, dailyDone } = useApp();
  const navigate = useNavigate();
  const [spectating, setSpectating] = useState(null);

  const modes = [
    { to: "/categories", icon: Zap, title: t.lobby.playSolo, desc: t.lobby.playSoloDesc, testId: "play-solo-btn" },
    { to: "/duel", icon: Swords, title: t.lobby.duel, desc: t.lobby.duelDesc, testId: "duel-matchmaking-btn" },
    { to: "/tournaments", icon: Trophy, title: t.lobby.tournament, desc: t.lobby.tournamentDesc, testId: "tournament-join-btn" },
  ];

  return (
    <>
    <div className="relative min-h-screen">
      <ArenaBackground />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-white">{t.lobby.welcome}</h1>
            <p className="text-xs text-white/40 mt-0.5">
              {lang === "fr" ? "Choisis ton mode de jeu" : "Choose your game mode"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full blink" style={{ background: AMBER }} />
            <span className="text-xs text-white/40">{LIVE_MATCHES.length} {t.common.live}</span>
          </div>
        </div>

        {/* Daily challenge card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: dailyDone ? "rgba(255,255,255,0.07)" : `${AMBER}35`, background: dailyDone ? "#0B0B14" : `${AMBER}06` }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: dailyDone ? "rgba(255,255,255,0.06)" : `${AMBER}20`, color: dailyDone ? "rgba(255,255,255,0.3)" : AMBER }}
              >
                <Star className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {lang === "fr" ? "Défi du Jour" : "Daily Challenge"}
                  </span>
                  {dailyDone && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#5DD66E]">
                      <CheckCircle className="w-3 h-3" /> Complété
                    </span>
                  )}
                  {!dailyDone && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${AMBER}25`, color: AMBER }}>
                      +500 bonus
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/35 mt-0.5">
                  {DAILY.label[lang]} · {DAILY.total} Q ·{" "}
                  <span className="text-white/50">
                    {DAILY.players.toLocaleString()} {lang === "fr" ? "joueurs aujourd'hui" : "players today"}
                  </span>
                </div>
              </div>
            </div>
            {!dailyDone ? (
              <button
                onClick={() => navigate(`/play/${DAILY.category}?daily=1`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-black text-xs font-semibold rounded-md flex-shrink-0 transition hover:opacity-90"
                style={{ background: AMBER }}
              >
                Jouer <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="text-[10px] text-white/25 flex-shrink-0">Revenez demain</div>
            )}
          </div>
        </motion.div>

        {/* Mode selector */}
        <div className="grid sm:grid-cols-3 gap-3">
          {modes.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.to}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to={m.to}
                  data-testid={m.testId}
                  className="group flex items-start gap-3 p-4 rounded-xl border border-white/[0.07] bg-[#0B0B14] hover:border-white/20 hover:bg-[#0E0E18] transition-all block"
                >
                  <div
                    className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${AMBER}18`, color: AMBER }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{m.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition flex-shrink-0" />
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{m.desc}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Live + Duels */}
        <div className="grid md:grid-cols-2 gap-3">
          {/* Live matches */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-white/50">{t.lobby.liveMatches}</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white blink" />
                <span className="text-[10px] uppercase tracking-widest text-white/25">{t.common.live}</span>
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {LIVE_MATCHES.map((m) => (
                <div
                  key={m.id}
                  data-testid={`live-match-${m.id}`}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryChip id={m.category} />
                    <span className="text-xs text-white/60 truncate">
                      {m.players[0]} <span className="text-white/25 mx-1">vs</span> {m.players[1]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-arcade text-base leading-none" style={{ color: AMBER }}>
                      {m.pool.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-white/25">{m.round}/{m.total}</span>
                    <button
                      onClick={() => setSpectating(m)}
                      className="p-1 rounded text-white/25 hover:text-white/60 transition"
                      title="Regarder"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active duels */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-white/50">{t.lobby.activeDuels}</span>
              <Swords className="w-3.5 h-3.5 text-white/25" />
            </div>
            <div className="divide-y divide-white/[0.04]">
              {ACTIVE_DUELS.map((d) => (
                <div
                  key={d.id}
                  data-testid={`active-duel-${d.id}`}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryChip id={d.category} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white/60 truncate">{d.host}</div>
                      <div className="flex items-center gap-1 mt-0.5 text-white/25">
                        <Clock className="w-2.5 h-2.5" />
                        <span className="text-[10px]">{d.startsIn}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="font-arcade text-base leading-none" style={{ color: AMBER }}>{d.stake}</span>
                    <Link
                      to="/duel"
                      className="px-2 py-1 text-[10px] uppercase tracking-wider rounded border transition hover:bg-white/5"
                      style={{ borderColor: `${AMBER}35`, color: AMBER }}
                    >
                      {t.lobby.join}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Online players */}
        <OnlinePlayersPanel />

        {/* Upcoming tournaments */}
        <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
            <span className="text-xs font-medium text-white/50">{t.lobby.upcomingTournaments}</span>
            <Link
              to="/tournaments"
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/25 hover:text-white/50 transition"
            >
              {lang === "fr" ? "Voir tout" : "See all"}
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {TOURNAMENTS.map((tr) => (
              <Link
                key={tr.id}
                to="/tournaments"
                data-testid={`tournament-${tr.id}`}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryChip id={tr.category} />
                  <span className="text-xs font-medium text-white/60 truncate group-hover:text-white/80 transition">
                    {tr.name[lang]}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-1 text-white/25">
                    <Users className="w-3 h-3" />
                    <span className="text-[10px]">{tr.registered}/{tr.slots}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/25 mb-0.5">{tr.startsIn}</div>
                    <div className="font-arcade text-base leading-none" style={{ color: AMBER }}>
                      {tr.prizePool.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>

    {spectating && (
      <SpectateModal match={spectating} onClose={() => setSpectating(null)} />
    )}
    </>
  );
}
