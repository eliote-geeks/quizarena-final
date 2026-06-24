import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { ALL_REPLAYS, getCategory } from "../data/mockData";
import ReplayModal from "../components/ReplayModal";
import { Play, Filter, Clock, Trophy } from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";

const AMBER = "#E5A800";

const CATEGORY_LABELS = {
  all: "Tous",
  histoire: "Histoire",
  geographie: "Géographie",
  sciences: "Sciences",
  cinema: "Cinéma",
  sport: "Sport",
  musique: "Musique",
};

export default function Replays() {
  const { lang } = useApp();
  const navigate = useNavigate();

  const [activeCat, setActiveCat] = useState("all");
  const [sort, setSort] = useState("recent"); // "recent" | "top"
  const [selectedReplay, setSelectedReplay] = useState(null);

  // Build category counts
  const categoryCounts = Object.keys(CATEGORY_LABELS).reduce((acc, key) => {
    if (key === "all") {
      acc[key] = ALL_REPLAYS.length;
    } else {
      acc[key] = ALL_REPLAYS.filter((r) => r.category === key).length;
    }
    return acc;
  }, {});

  const filtered = ALL_REPLAYS.filter(
    (r) => activeCat === "all" || r.category === activeCat
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "top") {
      const maxA = Math.max(a.scoreA, a.scoreB);
      const maxB = Math.max(b.scoreA, b.scoreB);
      return maxB - maxA;
    }
    // "recent" — sort by date descending
    return new Date(b.date) - new Date(a.date);
  });

  // Mock stats
  const totalPlayers = new Set(
    ALL_REPLAYS.flatMap((r) => [r.playerA, r.playerB])
  ).size;
  const avgDurationRaw =
    ALL_REPLAYS.reduce((acc, r) => {
      const [m, s] = r.duration.replace("s", "").split("m").map(Number);
      return acc + m * 60 + s;
    }, 0) / ALL_REPLAYS.length;
  const avgMin = Math.floor(avgDurationRaw / 60);
  const avgSec = Math.round(avgDurationRaw % 60);
  const avgDuration = `${avgMin}m${String(avgSec).padStart(2, "0")}s`;

  return (
    <div className="relative min-h-screen" style={{ background: "#05050A" }}>
      <ArenaBackground />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-sm font-semibold text-white">Rediffusions</h1>
          <p className="text-xs text-white/40 mt-0.5">Tous les matchs enregistrés</p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Play className="w-3.5 h-3.5" style={{ color: AMBER }} />
            <span>
              <span className="text-white font-medium">{ALL_REPLAYS.length}</span>{" "}
              replays
            </span>
          </div>
          <div className="w-px h-3 bg-white/[0.10]" />
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Trophy className="w-3.5 h-3.5" style={{ color: AMBER }} />
            <span>
              <span className="text-white font-medium">{totalPlayers}</span>{" "}
              joueurs
            </span>
          </div>
          <div className="w-px h-3 bg-white/[0.10]" />
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Clock className="w-3.5 h-3.5" style={{ color: AMBER }} />
            <span>
              Durée moy.{" "}
              <span className="text-white font-medium">{avgDuration}</span>
            </span>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const isActive = activeCat === key;
            const count = categoryCounts[key];
            if (count === 0 && key !== "all") return null;
            return (
              <button
                key={key}
                onClick={() => setActiveCat(key)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                style={
                  isActive
                    ? {
                        borderColor: `${AMBER}60`,
                        background: `${AMBER}10`,
                        color: AMBER,
                      }
                    : {
                        borderColor: "rgba(255,255,255,0.07)",
                        color: "rgba(255,255,255,0.40)",
                        background: "transparent",
                      }
                }
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort row */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
          {[
            { key: "recent", label: "Récents" },
            { key: "top", label: "Top scores" },
          ].map(({ key, label }) => {
            const isActive = sort === key;
            return (
              <button
                key={key}
                onClick={() => setSort(key)}
                className="px-2.5 py-1 rounded-md text-xs font-medium border transition-all"
                style={
                  isActive
                    ? {
                        borderColor: `${AMBER}50`,
                        background: `${AMBER}10`,
                        color: AMBER,
                      }
                    : {
                        borderColor: "rgba(255,255,255,0.07)",
                        color: "rgba(255,255,255,0.35)",
                        background: "transparent",
                      }
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Replay list */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeCat}-${sort}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-2"
          >
            {sorted.length === 0 && (
              <div className="text-center py-12 text-xs text-white/25">
                Aucun replay disponible pour cette catégorie.
              </div>
            )}
            {sorted.map((replay, i) => (
              <ReplayRow
                key={replay.id}
                replay={replay}
                index={i}
                lang={lang}
                navigate={navigate}
                onRevoir={() => setSelectedReplay(replay)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Replay modal */}
      {selectedReplay && (
        <ReplayModal
          replay={selectedReplay}
          onClose={() => setSelectedReplay(null)}
        />
      )}
    </div>
  );
}

function ReplayRow({ replay, index, lang, navigate, onRevoir }) {
  const cat = getCategory(replay.category);
  const Icon = cat?.icon;
  const isAWinner = replay.scoreA > replay.scoreB;
  const isBWinner = replay.scoreB > replay.scoreA;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.07] bg-[#0B0B14] hover:border-white/[0.14] transition-all"
    >
      {/* Category icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${AMBER}15`, color: AMBER }}
      >
        {Icon && <Icon className="w-4 h-4" />}
      </div>

      {/* Middle: players + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <button
            onClick={() => navigate("/player/" + replay.playerA)}
            className="text-sm font-medium hover:underline transition-colors"
            style={{ color: isAWinner ? AMBER : "rgba(255,255,255,0.85)" }}
          >
            {replay.playerA}
          </button>
          <span className="text-xs text-white/20">vs</span>
          <button
            onClick={() => navigate("/player/" + replay.playerB)}
            className="text-sm font-medium hover:underline transition-colors"
            style={{ color: isBWinner ? AMBER : "rgba(255,255,255,0.85)" }}
          >
            {replay.playerB}
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-white/25">{replay.tournament}</span>
          <span className="text-[10px] text-white/15">·</span>
          <span className="text-[10px] text-white/25">{replay.round}</span>
          <span className="text-[10px] text-white/15">·</span>
          <span className="text-[10px] text-white/25">{replay.date}</span>
          <span className="text-[10px] text-white/15">·</span>
          <span className="text-[10px] text-white/25 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {replay.duration}
          </span>
        </div>
      </div>

      {/* Right: score + button */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-center">
          <div className="text-sm font-semibold tabular-nums">
            <span style={{ color: isAWinner ? AMBER : "rgba(255,255,255,0.55)" }}>
              {replay.scoreA}
            </span>
            <span className="text-white/20 mx-1">–</span>
            <span style={{ color: isBWinner ? AMBER : "rgba(255,255,255,0.55)" }}>
              {replay.scoreB}
            </span>
          </div>
        </div>
        <button
          onClick={onRevoir}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: `${AMBER}18`, color: AMBER }}
        >
          <Play className="w-3 h-3" />
          Revoir
        </button>
      </div>
    </motion.div>
  );
}
