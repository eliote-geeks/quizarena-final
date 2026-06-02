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
          <div className="text-xs uppercase tracking-widest text-[#00FFFF] mb-2">// CONTROL ROOM</div>
          <h1 className="font-display font-black uppercase tracking-tighter text-4xl sm:text-5xl lg:text-6xl">
            {t.lobby.welcome}
          </h1>
        </div>

        {/* 3 Mode tiles */}
        <div className="grid lg:grid-cols-3 gap-6 mb-14">
          {[
            {
              to: "/categories",
              icon: Zap,
              title: t.lobby.playSolo,
              desc: t.lobby.playSoloDesc,
              color: "#FFD700",
              testId: "play-solo-btn",
            },
            {
              to: "/duel",
              icon: Swords,
              title: t.lobby.duel,
              desc: t.lobby.duelDesc,
              color: "#FF007F",
              testId: "duel-matchmaking-btn",
            },
            {
              to: "/tournaments",
              icon: Trophy,
              title: t.lobby.tournament,
              desc: t.lobby.tournamentDesc,
              color: "#00FFFF",
              testId: "tournament-join-btn",
            },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.to}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={m.to}
                  data-testid={m.testId}
                  className="block relative group h-full p-8 rounded-2xl border border-white/10 bg-[#0B0B14] hover:border-white/30 overflow-hidden transition-all"
                  style={{ boxShadow: `inset 0 0 0 1px ${m.color}15` }}
                >
                  <div
                    className="absolute -right-12 -bottom-12 w-44 h-44 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity"
                    style={{ background: m.color }}
                  />
                  <Icon className="w-12 h-12 mb-6" style={{ color: m.color }} />
                  <h3 className="font-display font-bold uppercase text-2xl mb-2 tracking-tight">{m.title}</h3>
                  <p className="text-slate-400 text-sm">{m.desc}</p>
                  <div
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
                    style={{ color: m.color }}
                  >
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
                <span className="w-2 h-2 rounded-full bg-[#FF3333] blink" />
                <span className="text-xs uppercase tracking-widest text-[#FF3333]">{t.common.live}</span>
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
                      <div className="font-arcade text-xl text-[#FFD700]">
                        {m.pool.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">
                        {m.round}/{m.total}
                      </div>
                      <button className="p-2 rounded-md border border-white/10 hover:border-[#00FFFF]/50 hover:text-[#00FFFF] transition">
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
              <Swords className="w-5 h-5 text-[#FF007F]" />
            </div>
            <div className="space-y-3">
              {ACTIVE_DUELS.map((d) => (
                <div
                  key={d.id}
                  data-testid={`active-duel-${d.id}`}
                  className="p-4 rounded-lg bg-[#12121E] border border-white/5 hover:border-[#FF007F]/40 transition-all flex items-center justify-between gap-3"
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
                      <div className="font-arcade text-xl text-[#FFD700]">{d.stake}</div>
                    </div>
                    <Link
                      to="/duel"
                      className="px-3 py-1.5 text-xs uppercase tracking-wider rounded-md bg-[#FF007F]/15 border border-[#FF007F]/50 text-[#FF007F] hover:bg-[#FF007F]/25 transition"
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
            <Trophy className="w-5 h-5 text-[#00FFFF]" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {TOURNAMENTS.map((tr) => {
              const cat = getCategory(tr.category);
              return (
                <Link
                  key={tr.id}
                  to="/tournaments"
                  data-testid={`tournament-${tr.id}`}
                  className="p-5 rounded-xl bg-[#12121E] border border-white/5 hover:border-[#00FFFF]/40 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <CategoryChip id={tr.category} />
                    <div className="font-arcade text-[#FF3333] text-xl text-glow-yellow">
                      {tr.startsIn}
                    </div>
                  </div>
                  <h3 className="font-display font-bold uppercase text-lg mb-3 group-hover:text-[#FFD700] transition">
                    {tr.name[lang]}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Users className="w-4 h-4" />
                      {tr.registered}/{tr.slots}
                    </div>
                    <div className="flex items-center gap-1 text-[#FFD700]">
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
