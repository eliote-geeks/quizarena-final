import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { LIVE_MATCHES, ACTIVE_DUELS, TOURNAMENTS, getCategory } from "../data/mockData";
import CategoryChip from "../components/CategoryChip";
import { Zap, Swords, Trophy, Eye, Play, Users, Clock, Coins } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";

export default function Lobby() {
  const { t, lang } = useApp();

  return (
    <div className="relative">
      <ArenaBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-2">// CONTROL_ROOM</div>
          <h1 className="font-display font-black uppercase tracking-tighter text-4xl sm:text-5xl lg:text-6xl">
            {t.lobby.welcome}
          </h1>
        </div>

        {/* 3 Mode tiles */}
        <div className="grid lg:grid-cols-3 gap-6 mb-14">
          {[
            { to: "/categories", icon: Zap, title: t.lobby.playSolo, desc: t.lobby.playSoloDesc, testId: "play-solo-btn" },
            { to: "/duel", icon: Swords, title: t.lobby.duel, desc: t.lobby.duelDesc, testId: "duel-matchmaking-btn" },
            { to: "/tournaments", icon: Trophy, title: t.lobby.tournament, desc: t.lobby.tournamentDesc, testId: "tournament-join-btn" },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div key={m.to} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Link
                  to={m.to}
                  data-testid={m.testId}
                  className="block relative group h-full p-8 rounded-2xl border border-white/10 bg-[#0B0B14] hover:border-[#E5A800]/40 overflow-hidden transition-all"
                >
                  <div className="absolute -right-12 -bottom-12 w-44 h-44 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity bg-[#E5A800]" />
                  <Icon className="w-11 h-11 mb-6" style={{ color: "#E5A800" }} />
                  <h3 className="font-display font-bold uppercase text-2xl mb-2 tracking-tight text-white">{m.title}</h3>
                  <p className="text-slate-400 text-sm">{m.desc}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ color: "#E5A800" }}>
                    <Play className="w-4 h-4" /> {t.common.enter}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Live + Duels */}
        <div className="grid lg:grid-cols-2 gap-6 mb-14">
          {/* Live matches */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold uppercase tracking-tight text-xl">{t.lobby.liveMatches}</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white blink" />
                <span className="text-xs uppercase tracking-widest text-white/70">{t.common.live}</span>
              </div>
            </div>
            <div className="space-y-3">
              {LIVE_MATCHES.map((m) => {
                const cat = getCategory(m.category);
                return (
                  <div
                    key={m.id}
                    data-testid={`live-match-${m.id}`}
                    className="p-4 rounded-lg bg-[#12121E] border border-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <CategoryChip id={m.category} />
                      <div className="font-medium text-white truncate">
                        {m.players[0]} <span className="text-slate-500 mx-2">VS</span> {m.players[1]}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="font-arcade text-xl" style={{ color: "#E5A800" }}>
                        {m.pool.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">
                        {m.round}/{m.total}
                      </div>
                      <button className="p-2 rounded-md border border-white/10 hover:border-[#E5A800]/50 hover:text-[#E5A800] transition">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active duels */}
          <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold uppercase tracking-tight text-xl">{t.lobby.activeDuels}</h2>
              <Swords className="w-5 h-5" style={{ color: "#E5A800" }} />
            </div>
            <div className="space-y-3">
              {ACTIVE_DUELS.map((d) => (
                <div
                  key={d.id}
                  data-testid={`active-duel-${d.id}`}
                  className="p-4 rounded-lg bg-[#12121E] border border-white/5 hover:border-[#E5A800]/40 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <CategoryChip id={d.category} />
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{d.host}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {d.startsIn}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">{t.common.stake}</div>
                      <div className="font-arcade text-xl" style={{ color: "#E5A800" }}>{d.stake}</div>
                    </div>
                    <Link
                      to="/duel"
                      className="px-3 py-1.5 text-xs uppercase tracking-wider rounded-md border transition"
                      style={{ borderColor: "#E5A80055", color: "#E5A800", background: "#E5A80010" }}
                    >
                      {t.lobby.join}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming tournaments */}
        <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold uppercase tracking-tight text-xl">{t.lobby.upcomingTournaments}</h2>
            <Trophy className="w-5 h-5" style={{ color: "#E5A800" }} />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {TOURNAMENTS.map((tr) => {
              const cat = getCategory(tr.category);
              return (
                <Link
                  key={tr.id}
                  to="/tournaments"
                  data-testid={`tournament-${tr.id}`}
                  className="p-5 rounded-xl bg-[#12121E] border border-white/5 hover:border-[#E5A800]/40 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <CategoryChip id={tr.category} />
                    <div className="font-arcade text-xl" style={{ color: "#E5A800" }}>
                      {tr.startsIn}
                    </div>
                  </div>
                  <h3 className="font-display font-bold uppercase text-lg mb-3 text-white group-hover:text-[#E5A800] transition">
                    {tr.name[lang]}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Users className="w-4 h-4" />
                      {tr.registered}/{tr.slots}
                    </div>
                    <div className="flex items-center gap-1" style={{ color: "#E5A800" }}>
                      <Coins className="w-4 h-4" />
                      <span className="font-arcade text-lg">{tr.prizePool.toLocaleString()}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
