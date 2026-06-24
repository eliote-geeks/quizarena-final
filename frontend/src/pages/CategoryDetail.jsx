import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import {
  CATEGORIES,
  ALL_REPLAYS,
  ONLINE_PLAYERS,
  ACTIVE_DUELS,
  getCategory,
} from "../data/mockData";
import { getRank } from "../lib/eloEngine";
import ReplayModal from "../components/ReplayModal";
import PixelScene from "../components/PixelScene";
import {
  Play,
  Swords,
  Eye,
  Clock,
  Users,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import ArenaBackground from "../components/ArenaBackground";

const AMBER = "#E5A800";

export default function CategoryDetail() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { lang } = useApp();

  const [selectedReplay, setSelectedReplay] = useState(null);

  const cat = getCategory(categoryId);

  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#05050A" }}>
        <div className="text-center">
          <p className="text-white/40 text-sm mb-4">Catégorie introuvable.</p>
          <button
            onClick={() => navigate("/categories")}
            className="text-xs px-4 py-2 rounded-lg border border-white/[0.07] text-white/50 hover:text-white transition"
          >
            Retour aux catégories
          </button>
        </div>
      </div>
    );
  }

  const Icon = cat.icon;
  const catReplays = ALL_REPLAYS.filter((r) => r.category === categoryId);
  const catDuels = ACTIVE_DUELS.filter((d) => d.category === categoryId);

  return (
    <div className="relative min-h-screen" style={{ background: "#05050A" }}>
      <ArenaBackground />

      {/* PixelScene visual header — full width, no padding */}
      <div className="relative w-full overflow-hidden" style={{ height: 180 }}>
        <PixelScene category={categoryId} idx={0} />
        {/* Back button overlay */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/60 hover:text-white transition-all border border-white/[0.10] bg-black/40 backdrop-blur-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </button>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Category title + description */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${AMBER}18`, color: AMBER }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <h1 className="text-base font-semibold text-white">
              {cat.name[lang]}
            </h1>
          </div>
          <p className="text-xs text-white/40 mb-1">{cat.description[lang]}</p>
          <p className="text-[11px] text-white/20">
            {cat.questions} questions · {cat.style[lang]}
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-3 mb-8 flex-wrap">
          <button
            onClick={() => navigate("/play/" + categoryId)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: AMBER, color: "#05050A" }}
          >
            <Play className="w-4 h-4" />
            Jouer Solo
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() =>
              navigate("/duel", { state: { defaultCategory: categoryId } })
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/[0.12] text-white/80 hover:border-white/25 hover:text-white transition-all"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <Swords className="w-4 h-4" />
            Défier un joueur
          </button>
        </div>

        {/* Two-column grid */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-5">

          {/* LEFT COLUMN */}
          <div className="space-y-5">

            {/* Replays section */}
            <Section title={`Replays — ${cat.name[lang]}`} icon={<Eye className="w-3.5 h-3.5" />}>
              {catReplays.length === 0 ? (
                <EmptyState text="Aucun replay disponible" />
              ) : (
                <div className="space-y-2">
                  {catReplays.map((replay, i) => (
                    <CompactReplayRow
                      key={replay.id}
                      replay={replay}
                      index={i}
                      navigate={navigate}
                      onRevoir={() => setSelectedReplay(replay)}
                    />
                  ))}
                </div>
              )}
            </Section>

            {/* Active duels section */}
            <Section title="Duels en attente" icon={<Swords className="w-3.5 h-3.5" />}>
              {catDuels.length === 0 ? (
                <EmptyState
                  text="Aucun duel en attente"
                  action={
                    <button
                      onClick={() =>
                        navigate("/duel", { state: { defaultCategory: categoryId } })
                      }
                      className="text-[10px] px-2.5 py-1 rounded-md border border-white/[0.10] text-white/40 hover:text-white/70 transition ml-2"
                    >
                      Créer un duel
                    </button>
                  }
                />
              ) : (
                <div className="space-y-2">
                  {catDuels.map((duel, i) => (
                    <DuelRow
                      key={duel.id}
                      duel={duel}
                      index={i}
                      navigate={navigate}
                    />
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            <Section title="Joueurs en ligne" icon={<Users className="w-3.5 h-3.5" />} subtitle="Actifs sur QuizArena">
              <div className="space-y-1.5">
                {ONLINE_PLAYERS.map((player, i) => (
                  <OnlinePlayerRow
                    key={player.name}
                    player={player}
                    index={i}
                    categoryId={categoryId}
                    navigate={navigate}
                  />
                ))}
              </div>
            </Section>
          </div>

        </div>
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

/* ── Sub-components ────────────────────────────────────────── */

function Section({ title, subtitle, icon, children }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0B0B14] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2" style={{ color: "rgba(255,255,255,0.7)" }}>
            <span style={{ color: AMBER }}>{icon}</span>
            <span className="text-xs font-semibold">{title}</span>
          </div>
          {subtitle && (
            <p className="text-[10px] text-white/25 mt-0.5 ml-5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function EmptyState({ text, action }) {
  return (
    <div className="flex items-center justify-center py-6 text-xs text-white/25">
      {text}
      {action}
    </div>
  );
}

function CompactReplayRow({ replay, index, navigate, onRevoir }) {
  const isAWinner = replay.scoreA > replay.scoreB;
  const isBWinner = replay.scoreB > replay.scoreA;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
    >
      {/* Players */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => navigate("/player/" + replay.playerA)}
            className="text-xs font-medium hover:underline transition-colors"
            style={{ color: isAWinner ? AMBER : "rgba(255,255,255,0.75)" }}
          >
            {replay.playerA}
          </button>
          <span className="text-[10px] text-white/20">vs</span>
          <button
            onClick={() => navigate("/player/" + replay.playerB)}
            className="text-xs font-medium hover:underline transition-colors"
            style={{ color: isBWinner ? AMBER : "rgba(255,255,255,0.75)" }}
          >
            {replay.playerB}
          </button>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-white/20">{replay.tournament}</span>
          <span className="text-[10px] text-white/15">·</span>
          <span className="text-[10px] text-white/20">{replay.date}</span>
        </div>
      </div>

      {/* Score */}
      <div className="text-xs tabular-nums font-semibold flex-shrink-0">
        <span style={{ color: isAWinner ? AMBER : "rgba(255,255,255,0.45)" }}>
          {replay.scoreA}
        </span>
        <span className="text-white/20 mx-0.5">–</span>
        <span style={{ color: isBWinner ? AMBER : "rgba(255,255,255,0.45)" }}>
          {replay.scoreB}
        </span>
      </div>

      {/* Revoir button */}
      <button
        onClick={onRevoir}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all hover:opacity-80 flex-shrink-0"
        style={{ background: `${AMBER}15`, color: AMBER }}
      >
        <Play className="w-2.5 h-2.5" />
        Revoir
      </button>
    </motion.div>
  );
}

function DuelRow({ duel, index, navigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white/80 truncate">{duel.host}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-white/25">Mise :</span>
          <span className="text-[10px] font-semibold" style={{ color: AMBER }}>
            {duel.stake.toLocaleString()} pts
          </span>
          <span className="text-[10px] text-white/15">·</span>
          <Clock className="w-2.5 h-2.5 text-white/20" />
          <span className="text-[10px] text-white/25">{duel.startsIn}</span>
        </div>
      </div>
      <button
        onClick={() => navigate("/duel")}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80 flex-shrink-0"
        style={{ background: `${AMBER}18`, color: AMBER }}
      >
        <Swords className="w-3 h-3" />
        Rejoindre
      </button>
    </motion.div>
  );
}

function OnlinePlayerRow({ player, index, categoryId, navigate }) {
  const rank = getRank(player.elo);

  const statusColor =
    player.status === "lobby"
      ? "#5DD66E"
      : player.status === "ingame"
      ? AMBER
      : "rgba(255,255,255,0.25)";

  const statusLabel =
    player.status === "lobby"
      ? "Disponible"
      : player.status === "ingame"
      ? "En jeu"
      : "Absent";

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-all group"
    >
      {/* Status dot */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: statusColor }}
        title={statusLabel}
      />

      {/* Avatar */}
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
        style={{ background: `${AMBER}15`, color: AMBER }}
      >
        {player.avatar}
      </div>

      {/* Name + ELO */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate("/player/" + player.name)}
          className="text-xs font-medium text-white/80 hover:text-white hover:underline transition-colors truncate block text-left w-full"
        >
          {player.name}
        </button>
        <div className="text-[9px] mt-0.5" style={{ color: rank.color }}>
          {player.elo} · {rank.name}
        </div>
      </div>

      {/* Défier button — visible on hover */}
      <button
        onClick={() =>
          navigate("/duel", {
            state: {
              quickOpponent: { name: player.name, elo: player.elo },
              defaultCategory: categoryId,
            },
          })
        }
        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold transition-all flex-shrink-0"
        style={{ background: `${AMBER}18`, color: AMBER }}
        title={`Défier ${player.name}`}
      >
        <Swords className="w-2.5 h-2.5" />
        Défier
      </button>
    </motion.div>
  );
}
