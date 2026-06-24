import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import {
  LIVE_MATCHES, ACTIVE_DUELS, ALL_REPLAYS, ONLINE_PLAYERS,
  CATEGORIES, CATEGORY_COLORS, getCategory,
} from "../data/mockData";
import { getRank } from "../lib/eloEngine";
import {
  Zap, Swords, Trophy, Radio, Users, Coins, Play,
  Star, CheckCircle, RotateCcw, Eye,
} from "lucide-react";

const AMBER = "#E5A800";

function CategoryChip({ categoryId, size = "sm" }) {
  const cat = getCategory(categoryId);
  const color = CATEGORY_COLORS[categoryId] || AMBER;
  const Icon = cat?.icon;
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[9px] gap-1" : "px-2 py-0.5 text-[10px] gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold ${pad}`}
      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
    >
      {Icon && <Icon className="w-2.5 h-2.5 flex-shrink-0" />}
      {cat?.name.fr}
    </span>
  );
}

function LiveProgress({ round, total }) {
  const pct = (round / total) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: "#FF5555" }}
        />
      </div>
      <span className="text-[9px] text-white/30 flex-shrink-0">Q{round}/{total}</span>
    </div>
  );
}

export default function MainLobby() {
  const navigate = useNavigate();
  const { coins, elo, dailyDone, user } = useApp();
  const rank = getRank(elo);
  const [spectateId, setSpectateId] = useState(null);

  const onlineCount = ONLINE_PLAYERS.filter(p => p.status !== "away").length;

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto">

      {/* ── Hero greeting ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">
              Bonne chance, <span style={{ color: AMBER }}>{user?.name || "Joueur"}</span> 👊
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-white/30">
                <span className="font-semibold" style={{ color: rank.color }}>{rank.emoji} {rank.name}</span>
                {" · "}{elo} ELO
              </span>
              <span className="text-[10px] text-white/20">·</span>
              <span className="flex items-center gap-1 text-xs text-white/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5DD66E] animate-pulse inline-block" />
                {onlineCount} en ligne
              </span>
            </div>
          </div>

          {/* Coins */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <Coins className="w-4 h-4" style={{ color: AMBER }} />
            <span className="font-arcade text-base leading-none" style={{ color: AMBER }}>
              {coins.toLocaleString()}
            </span>
            <span className="text-[10px] text-white/25">pts</span>
          </div>
        </div>
      </motion.div>

      {/* ── Daily challenge ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-5"
      >
        <button
          onClick={() => !dailyDone && navigate("/play/sciences?daily=1")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:brightness-110"
          style={{
            background: dailyDone ? "rgba(255,255,255,0.02)" : `${AMBER}08`,
            borderColor: dailyDone ? "rgba(255,255,255,0.07)" : `${AMBER}30`,
            cursor: dailyDone ? "default" : "pointer",
          }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: dailyDone ? "rgba(93,214,110,0.12)" : `${AMBER}18`,
              color: dailyDone ? "#5DD66E" : AMBER,
            }}
          >
            {dailyDone ? <CheckCircle className="w-4 h-4" /> : <Star className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white/70">Défi du Jour</div>
            <div
              className="text-[11px] font-semibold"
              style={{ color: dailyDone ? "#5DD66E" : AMBER }}
            >
              {dailyDone ? "Complété ✓ — reviens demain !" : "10 questions Sciences · +500 pts bonus"}
            </div>
          </div>
          {!dailyDone && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
              style={{ background: AMBER, color: "#07070F" }}
            >
              Jouer
            </span>
          )}
        </button>
      </motion.div>

      {/* ── Mode CTA buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-2.5 mb-8"
      >
        {CATEGORIES.slice(0, 6).map((cat, i) => {
          const Icon = cat.icon;
          const color = CATEGORY_COLORS[cat.id] || AMBER;
          return (
            <button
              key={cat.id}
              onClick={() => navigate(`/play/${cat.id}`)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition group"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18`, color }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium text-white/40 group-hover:text-white/60 transition truncate w-full text-center px-1">
                {cat.name.fr}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* ── Quick action buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="flex flex-wrap gap-2.5 mb-8"
      >
        <button
          onClick={() => navigate("/play/histoire")}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition hover:opacity-90 hover:scale-[1.02]"
          style={{ background: AMBER, color: "#07070F" }}
        >
          <Zap className="w-4 h-4" /> Jouer en solo
        </button>
        <button
          onClick={() => navigate("/duel")}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-white/[0.1] text-white/70 hover:bg-white/[0.05] hover:text-white transition"
        >
          <Swords className="w-4 h-4" /> Lancer un duel
        </button>
        <button
          onClick={() => navigate("/tournaments")}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-white/[0.1] text-white/70 hover:bg-white/[0.05] hover:text-white transition"
        >
          <Trophy className="w-4 h-4" /> Tournois
        </button>
      </motion.div>

      {/* ── Live matches ── */}
      <Section title="En direct" icon={<Radio className="w-3.5 h-3.5 text-[#FF5555]" />} badge={LIVE_MATCHES.length}>
        <div className="grid sm:grid-cols-2 gap-3">
          {LIVE_MATCHES.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 hover:border-white/[0.14] transition-all cursor-pointer"
              onClick={() => setSpectateId(m.id)}
            >
              <div className="flex items-start justify-between mb-2.5">
                <CategoryChip categoryId={m.category} />
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5555] animate-pulse" />
                  <span className="text-[9px] font-semibold text-[#FF5555]">LIVE</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-white">{m.players[0]}</span>
                <span className="font-arcade text-xs text-white/20">VS</span>
                <span className="text-xs font-semibold text-white">{m.players[1]}</span>
              </div>

              <LiveProgress round={m.round} total={m.total} />

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <Coins className="w-3 h-3" style={{ color: AMBER }} />
                  <span className="font-arcade text-xs" style={{ color: AMBER }}>
                    {m.pool.toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setSpectateId(m.id); }}
                  className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/70 transition"
                >
                  <Eye className="w-3 h-3" /> Regarder
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Open duels ── */}
      <Section title="Duels ouverts" icon={<Swords className="w-3.5 h-3.5" style={{ color: AMBER }} />} badge={ACTIVE_DUELS.length}>
        <div className="space-y-2">
          {ACTIVE_DUELS.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] transition-all"
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: `${AMBER}15`, color: AMBER }}
              >
                {d.host.slice(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-semibold text-white/80 truncate">{d.host}</span>
                  <CategoryChip categoryId={d.category} size="xs" />
                </div>
                <div className="text-[10px] text-white/30">Démarre dans {d.startsIn}</div>
              </div>

              {/* Stake */}
              <div className="text-right flex-shrink-0">
                <div className="font-arcade text-sm" style={{ color: AMBER }}>
                  {d.stake.toLocaleString()}
                </div>
                <div className="text-[9px] text-white/25">pts</div>
              </div>

              {/* Join */}
              <button
                onClick={() => navigate("/duel/play", {
                  state: {
                    category: d.category,
                    stake: d.stake,
                    opponentName: d.host,
                    opponentElo: 1200,
                  }
                })}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:opacity-90"
                style={{ background: AMBER, color: "#07070F" }}
              >
                Rejoindre
              </button>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── Recent replays ── */}
      <Section title="Replays récents" icon={<RotateCcw className="w-3.5 h-3.5 text-white/40" />}>
        <div className="space-y-2">
          {ALL_REPLAYS.slice(0, 5).map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-all"
            >
              <CategoryChip categoryId={r.category} size="xs" />
              <div className="flex-1 min-w-0 text-xs text-white/50 truncate">
                <span className="text-white/70 font-medium">{r.playerA}</span>
                {" "}
                <span className="font-arcade text-white/80">{r.scoreA}–{r.scoreB}</span>
                {" "}
                <span className="text-white/70 font-medium">{r.playerB}</span>
              </div>
              <span className="text-[10px] text-white/20 flex-shrink-0 hidden sm:block">{r.round}</span>
              <button
                onClick={() => navigate("/replays")}
                className="flex-shrink-0 flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition"
              >
                <Play className="w-3 h-3" /> Revoir
              </button>
            </motion.div>
          ))}
        </div>
        <button
          onClick={() => navigate("/replays")}
          className="mt-3 w-full text-center text-xs text-white/25 hover:text-white/50 transition py-2"
        >
          Voir tous les replays →
        </button>
      </Section>

      {/* ── Online players strip ── */}
      <Section title="Joueurs en ligne" icon={<Users className="w-3.5 h-3.5 text-[#5DD66E]" />}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {ONLINE_PLAYERS.filter(p => p.status !== "away").map(p => {
            const color = CATEGORY_COLORS[p.room] || AMBER;
            return (
              <button
                key={p.name}
                onClick={() => navigate("/player/" + p.name)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/[0.07] hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.04] transition min-w-[72px]"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold relative"
                  style={{ background: `${color}15`, color }}
                >
                  {p.avatar}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0A0A12]"
                    style={{ background: p.status === "ingame" ? "#FF5555" : "#5DD66E" }}
                  />
                </div>
                <span className="text-[10px] text-white/50 truncate w-full text-center">{p.name}</span>
                <span className="font-arcade text-[9px]" style={{ color }}>
                  {p.elo}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Spectate modal stub */}
      <AnimatePresence>
        {spectateId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setSpectateId(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/[0.1] p-6 text-center"
              style={{ background: "#0D0D18" }}
            >
              <div className="text-2xl mb-3">👁</div>
              <h3 className="text-sm font-semibold text-white mb-1">Spectateur</h3>
              <p className="text-xs text-white/40 mb-4">Le mode spectateur arrive bientôt.</p>
              <button
                onClick={() => setSpectateId(null)}
                className="px-6 py-2 rounded-lg text-xs font-semibold border border-white/[0.1] text-white/60 hover:bg-white/[0.05] transition"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function Section({ title, icon, badge, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">{title}</h2>
        {badge != null && (
          <span
            className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </motion.section>
  );
}
