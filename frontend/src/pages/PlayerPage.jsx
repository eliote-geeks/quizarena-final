import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Swords, Target, Zap, Brain, Crown, Star, Play,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { getMockPlayerProfile, ALL_REPLAYS, getCategory, CATEGORIES } from "../data/mockData";
import { getRank } from "../lib/eloEngine";
import ArenaBackground from "../components/ArenaBackground";
import ReplayModal from "../components/ReplayModal";

const AMBER = "#E5A800";

const ICON_MAP = { swords: Swords, brain: Brain, zap: Zap, star: Star, crown: Crown, target: Target };

const TABS = ["Aperçu", "Replays", "Performances"];

export default function PlayerPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { lang } = useApp();

  const p = getMockPlayerProfile(username);
  const rank = getRank(p.elo);
  const isOwnProfile = username === "ArenaCadet";

  const [activeTab, setActiveTab] = useState(0);
  const [replayFilter, setReplayFilter] = useState("all");
  const [openReplay, setOpenReplay] = useState(null);

  // Filter replays involving this player
  const playerReplays = ALL_REPLAYS.filter(
    (r) => r.playerA === username || r.playerB === username
  );

  // Count per category for filter pills
  const replayCategoryCount = {};
  for (const r of playerReplays) {
    replayCategoryCount[r.category] = (replayCategoryCount[r.category] || 0) + 1;
  }
  const usedCategories = CATEGORIES.filter((c) => replayCategoryCount[c.id]);

  const filteredReplays =
    replayFilter === "all"
      ? playerReplays
      : playerReplays.filter((r) => r.category === replayFilter);

  const winPct = p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0;

  return (
    <div className="relative min-h-screen" style={{ background: "#05050A" }}>
      <ArenaBackground />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>

        {/* ── Hero card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-xl p-5 bg-[#0B0B14] border border-white/[0.07]"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-bold text-xl border flex-shrink-0"
              style={{ background: `${AMBER}18`, color: AMBER, borderColor: `${AMBER}40` }}
            >
              {p.avatar}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-lg font-semibold text-white leading-none">{p.name}</h1>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full border"
                  style={{ color: rank.color, borderColor: `${rank.color}40`, background: `${rank.color}12` }}
                >
                  {rank.emoji} {rank.name}
                </span>
              </div>

              <div className="font-arcade text-2xl leading-none mb-1" style={{ color: AMBER }}>
                {p.elo}
                <span className="text-xs font-sans text-white/25 ml-1">ELO</span>
              </div>

              <div className="text-[11px] text-white/30 mb-3">Membre depuis {p.joined}</div>

              {/* XP / progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] text-white/30 mb-1">
                  <span>Progression</span>
                  <span style={{ color: AMBER }}>{p.wins} / {p.games} victoires</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${winPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: AMBER }}
                  />
                </div>
              </div>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Trophy, label: "Victoires", value: p.wins },
                  { icon: Swords, label: "Parties",   value: p.games },
                  { icon: Target, label: "Win%",       value: `${p.winRate}%` },
                  { icon: Zap,    label: "Série max",  value: p.streak },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.07] bg-white/[0.03]"
                    >
                      <Icon className="w-3 h-3" style={{ color: AMBER }} />
                      <span className="text-[10px] text-white/40">{s.label}</span>
                      <span className="font-arcade text-sm leading-none" style={{ color: AMBER }}>
                        {s.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-4 flex justify-end">
            {isOwnProfile ? (
              <button
                disabled
                className="px-4 py-2 rounded-lg text-xs font-medium border border-white/[0.07] text-white/25 cursor-not-allowed"
              >
                Modifier le profil
              </button>
            ) : (
              <button
                onClick={() =>
                  navigate("/duel", {
                    state: { quickOpponent: { name: p.name, elo: p.elo } },
                  })
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition hover:brightness-110 active:scale-95"
                style={{ background: AMBER, color: "#05050A" }}
              >
                <Swords className="w-3.5 h-3.5" />
                Défier en duel
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#0B0B14] border border-white/[0.07]">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition"
              style={
                activeTab === i
                  ? { background: `${AMBER}18`, color: AMBER }
                  : { color: "rgba(255,255,255,0.35)" }
              }
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ──────────────────── Tab 0 : Aperçu ──────────────────── */}
          {activeTab === 0 && (
            <motion.div
              key="apercu"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Recent matches */}
              <div className="rounded-xl bg-[#0B0B14] border border-white/[0.07] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/[0.06]">
                  <span className="text-xs font-medium text-white/50">Derniers matchs</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {p.recent.map((r, i) => {
                    const cat = getCategory(r.category);
                    const won = r.result === "win";
                    return (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {cat && (
                            <cat.icon
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: AMBER }}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-white/70 truncate">{r.mode}</div>
                            <div className="text-[10px] text-white/30 truncate">
                              {cat ? cat.name[lang] : r.category}
                            </div>
                          </div>
                        </div>
                        <div
                          className="font-arcade text-base leading-none flex-shrink-0"
                          style={{ color: won ? "#5DD66E" : "#E67373" }}
                        >
                          {won ? "+" : ""}
                          {r.delta}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Badges */}
              <div className="rounded-xl bg-[#0B0B14] border border-white/[0.07] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/[0.06]">
                  <span className="text-xs font-medium text-white/50">Badges</span>
                </div>
                <div className="p-4 grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {p.badges.map((b) => {
                    const Icon = ICON_MAP[b.icon] || Star;
                    return (
                      <div
                        key={b.id}
                        className="aspect-square rounded-lg border flex flex-col items-center justify-center gap-1.5 p-2 transition hover:border-amber-400/40"
                        style={{ borderColor: `${AMBER}20`, background: `${AMBER}06` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: AMBER }} />
                        <div className="text-[8px] text-white/50 text-center leading-tight">
                          {b.name[lang]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ──────────────────── Tab 1 : Replays ──────────────────── */}
          {activeTab === 1 && (
            <motion.div
              key="replays"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {/* Category filter pills */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setReplayFilter("all")}
                  className="px-3 py-1 rounded-full text-xs border transition"
                  style={
                    replayFilter === "all"
                      ? { borderColor: `${AMBER}50`, background: `${AMBER}15`, color: AMBER }
                      : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
                  }
                >
                  Tous ({playerReplays.length})
                </button>
                {usedCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setReplayFilter(cat.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition"
                    style={
                      replayFilter === cat.id
                        ? { borderColor: `${AMBER}50`, background: `${AMBER}15`, color: AMBER }
                        : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
                    }
                  >
                    <cat.icon className="w-3 h-3" />
                    {cat.name[lang]} ({replayCategoryCount[cat.id]})
                  </button>
                ))}
              </div>

              {/* Replay list */}
              {filteredReplays.length === 0 ? (
                <div className="text-center py-10 text-xs text-white/25">
                  Aucun replay disponible.
                </div>
              ) : (
                <div className="rounded-xl bg-[#0B0B14] border border-white/[0.07] overflow-hidden divide-y divide-white/[0.04]">
                  {filteredReplays.map((r) => {
                    const cat = getCategory(r.category);
                    const won =
                      (r.playerA === username && r.scoreA > r.scoreB) ||
                      (r.playerB === username && r.scoreB > r.scoreA);
                    const otherPlayer = r.playerA === username ? r.playerB : r.playerA;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        {/* Category icon */}
                        {cat && (
                          <cat.icon
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: AMBER }}
                          />
                        )}

                        {/* Match info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              to={`/player/${r.playerA}`}
                              className="text-xs font-medium text-white/80 hover:text-white transition truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.playerA}
                            </Link>
                            <span className="text-[10px] text-white/20">vs</span>
                            <Link
                              to={`/player/${r.playerB}`}
                              className="text-xs font-medium text-white/80 hover:text-white transition truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.playerB}
                            </Link>
                            <span
                              className="font-arcade text-sm leading-none flex-shrink-0"
                              style={{ color: won ? "#5DD66E" : "#E67373" }}
                            >
                              {r.scoreA} – {r.scoreB}
                            </span>
                          </div>
                          <div className="text-[10px] text-white/25 truncate mt-0.5">
                            {r.tournament} · {r.round} · {r.date}
                          </div>
                        </div>

                        {/* Revoir button */}
                        <button
                          onClick={() => setOpenReplay(r)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition hover:brightness-110 flex-shrink-0"
                          style={{
                            borderColor: `${AMBER}40`,
                            background: `${AMBER}10`,
                            color: AMBER,
                          }}
                        >
                          <Play className="w-3 h-3" />
                          Revoir
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ──────────────────── Tab 2 : Performances ──────────────────── */}
          {activeTab === 2 && (
            <motion.div
              key="perfs"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="rounded-xl bg-[#0B0B14] border border-white/[0.07] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/[0.06]">
                  <span className="text-xs font-medium text-white/50">Win rate par catégorie</span>
                </div>
                <div className="p-4 space-y-4">
                  {p.categoryPerf.map((cp, idx) => {
                    const cat = getCategory(cp.id);
                    return (
                      <div key={cp.id} className="flex items-center gap-3">
                        <div className="w-28 flex items-center gap-1.5 flex-shrink-0">
                          {cat && (
                            <cat.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: AMBER }} />
                          )}
                          <span className="text-xs text-white/60 truncate">
                            {cat ? cat.name[lang] : cp.id}
                          </span>
                        </div>
                        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cp.rate}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.07, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ background: AMBER }}
                          />
                        </div>
                        <div
                          className="font-arcade text-sm w-10 text-right flex-shrink-0"
                          style={{ color: AMBER }}
                        >
                          {cp.rate}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Replay Modal */}
      {openReplay && (
        <ReplayModal replay={openReplay} onClose={() => setOpenReplay(null)} />
      )}
    </div>
  );
}
