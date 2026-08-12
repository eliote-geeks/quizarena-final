import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { ALL_REPLAYS, getCategory } from "../data/mockData";
import ReplayModal from "../components/ReplayModal";
import { Play, Filter, Clock, Trophy, Users } from "lucide-react";

const AMBER = "#E5A800";

const CATEGORY_LABELS = {
  all: "Tous",
  histoire: "Histoire",
  geographie: "Géographie",
  sciences: "Sciences",
  cinema: "Cinéma",
  sport: "Sport",
  musique: "Musique",
  technologie: "Tech",
  afrique: "Afrique",
  nature: "Nature",
  gastronomie: "Gastro",
  litterature: "Littérature",
  celebrites: "Célébrités",
  anime: "Anime",
  culture: "Culture",
};

export default function Replays() {
  const { lang } = useApp();
  const navigate = useNavigate();

  const [activeCat, setActiveCat] = useState("all");
  const [sort, setSort] = useState("recent");
  const [selectedReplay, setSelectedReplay] = useState(null);

  const filtered = ALL_REPLAYS.filter(
    (r) => activeCat === "all" || r.category === activeCat
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "top") {
      const maxA = Math.max(a.scoreA, a.scoreB);
      const maxB = Math.max(b.scoreA, b.scoreB);
      return maxB - maxA;
    }
    return new Date(b.date) - new Date(a.date);
  });

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

  const availableCats = Object.keys(CATEGORY_LABELS).filter(
    (k) => k === "all" || ALL_REPLAYS.some((r) => r.category === k)
  );

  return (
    <div className="min-h-full px-4 sm:px-6 py-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display font-bold text-2xl sm:text-3xl" style={{ color: "var(--qa-text)" }}>
          Rediffusions
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--qa-text-sub)" }}>
          Regarde tous les matchs enregistrés
        </p>
      </motion.header>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { icon: Play,    label: "Replays",  value: ALL_REPLAYS.length },
          { icon: Trophy,  label: "Joueurs",  value: totalPlayers },
          { icon: Clock,   label: "Durée moy.", value: avgDuration },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl p-4"
              style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
            >
              <Icon className="w-4 h-4 mb-2" style={{ color: AMBER }} />
              <div className="text-xs font-semibold" style={{ color: "var(--qa-text-sub)" }}>{s.label}</div>
              <div className="font-display font-bold text-lg mt-1" style={{ color: "var(--qa-text)" }}>
                {s.value}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Category pills */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        {availableCats.map((key) => {
          const label = CATEGORY_LABELS[key];
          const isActive = activeCat === key;
          return (
            <button
              key={key}
              onClick={() => setActiveCat(key)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all"
              style={
                isActive
                  ? { background: `${AMBER}22`, color: AMBER, border: `1px solid ${AMBER}55` }
                  : { background: "var(--qa-surface)", color: "var(--qa-text-sub)", border: "1px solid var(--qa-border)" }
              }
            >
              {label}
            </button>
          );
        })}
      </motion.div>

      {/* Sort */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.11 }}
        className="flex items-center gap-2"
      >
        <Filter className="w-4 h-4 flex-shrink-0" style={{ color: "var(--qa-text-faint)" }} />
        {[
          { key: "recent", label: "Récents" },
          { key: "top", label: "Top scores" },
        ].map(({ key, label }) => {
          const isActive = sort === key;
          return (
            <button
              key={key}
              onClick={() => setSort(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={
                isActive
                  ? { background: `${AMBER}22`, color: AMBER }
                  : { color: "var(--qa-text-sub)" }
              }
            >
              {label}
            </button>
          );
        })}
      </motion.div>

      {/* Replay list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeCat}-${sort}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="space-y-2"
        >
          {sorted.length === 0 && (
            <div
              className="py-12 text-center text-sm rounded-2xl"
              style={{
                background: "var(--qa-surface)",
                border: "1px dashed var(--qa-border)",
                color: "var(--qa-text-sub)",
              }}
            >
              Aucun replay pour cette catégorie
            </div>
          )}
          {sorted.map((replay) => (
            <ReplayRow
              key={replay.id}
              replay={replay}
              lang={lang}
              navigate={navigate}
              onRevoir={() => setSelectedReplay(replay)}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {selectedReplay && (
        <ReplayModal
          replay={selectedReplay}
          onClose={() => setSelectedReplay(null)}
        />
      )}
    </div>
  );
}

function ReplayRow({ replay, lang, navigate, onRevoir }) {
  const cat = getCategory(replay.category);
  const Icon = cat?.icon;
  const isAWinner = replay.scoreA > replay.scoreB;
  const isBWinner = replay.scoreB > replay.scoreA;

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-2xl"
      style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${AMBER}22`, color: AMBER }}
      >
        {Icon && <Icon className="w-5 h-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => navigate("/player/" + replay.playerA)}
            className="text-sm font-bold hover:underline"
            style={{ color: isAWinner ? AMBER : "var(--qa-text)" }}
          >
            {replay.playerA}
          </button>
          <span className="text-xs font-bold" style={{ color: "var(--qa-text-faint)" }}>vs</span>
          <button
            onClick={() => navigate("/player/" + replay.playerB)}
            className="text-sm font-bold hover:underline"
            style={{ color: isBWinner ? AMBER : "var(--qa-text)" }}
          >
            {replay.playerB}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "var(--qa-text-sub)" }}>
          <span>{replay.date}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {replay.duration}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-center">
          <div className="font-display font-bold text-base">
            <span style={{ color: isAWinner ? AMBER : "var(--qa-text-sub)" }}>
              {replay.scoreA}
            </span>
            <span className="mx-1" style={{ color: "var(--qa-text-faint)" }}>–</span>
            <span style={{ color: isBWinner ? AMBER : "var(--qa-text-sub)" }}>
              {replay.scoreB}
            </span>
          </div>
        </div>
        <button
          onClick={onRevoir}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition hover:opacity-90"
          style={{ background: `${AMBER}22`, color: AMBER }}
        >
          <Play className="w-3.5 h-3.5" />
          Revoir
        </button>
      </div>
    </div>
  );
}
