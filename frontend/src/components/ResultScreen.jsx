import { useMemo } from "react";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../lib/currency";
import { Banknote, CircleEqual, Skull, Trophy, Zap, Swords, Home } from "lucide-react";

const AMBER = "#E5A800";

// Pre-computed particle positions (stable — no Math.random() in render)
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: 3 + ((i * 37 + 7) % 94),
  delay: (i * 0.19) % 2.8,
  dur: 1.6 + ((i * 0.23) % 1.4),
  size: 3 + (i % 5),
  color: i % 4 === 0 ? "#5DD66E" : i % 4 === 1 ? AMBER : i % 4 === 2 ? "#74B9FF" : "#A29BFE",
}));

const CONFIGS = {
  win: {
    Icon:       Trophy,
    title:      "VICTOIRE !",
    glow:       AMBER,
    titleColor: AMBER,
    particles:  true,
  },
  cashout: {
    Icon:       Banknote,
    title:      "CASH-OUT !",
    glow:       "#5DD66E",
    titleColor: "#5DD66E",
    particles:  true,
  },
  draw: {
    Icon:       CircleEqual,
    title:      "ÉGALITÉ",
    glow:       "#6C6C7A",
    titleColor: "#ACACBE",
    particles:  false,
  },
  loss: {
    Icon:       Skull,
    title:      "DÉFAITE",
    glow:       "#FF5555",
    titleColor: "#FF6B6B",
    particles:  false,
  },
};

export default function ResultScreen({
  result,       // "win" | "loss" | "draw" | "cashout"
  coinsGained,  // signed number
  myScore,      // correct answers (number)
  oppScore,     // opponent correct answers (number | undefined)
  total,        // total questions
  streak,       // number (for solo)
  isDaily,      // bool
  opponentName, // string | undefined (duel only)
  modeLabel,    // string | undefined
  onReplay,     // fn
  onLobby,      // fn
}) {
  const { currency } = useApp();
  const cfg = CONFIGS[result] || CONFIGS.loss;
  const ResultIcon = cfg.Icon;
  const isWin = result === "win" || result === "cashout";
  const isLoss = result === "loss";

  const subtitle = useMemo(() => {
    if (opponentName !== undefined) {
      if (result === "win") return `Tu gagnes le duel ${myScore}-${oppScore} contre ${opponentName}.`;
      if (result === "loss") return `Tu perds le duel ${myScore}-${oppScore} contre ${opponentName}.`;
      if (result === "draw") return `Égalité ${myScore}-${oppScore} contre ${opponentName}.`;
      if (result === "cashout") return `Cash-out validé contre ${opponentName}.`;
    }
    if (isDaily && isWin) return "Défi du Jour validé — +500 bonus inclus !";
    if (isWin)  return myScore !== undefined ? `${myScore}/${total} bonnes réponses` : "Tu as dominé l'arène !";
    if (isLoss) return myScore !== undefined ? `${myScore}/${total} bonnes réponses — continue de t'entraîner.` : "La prochaine sera la bonne !";
    return "Tes coins sont remboursés.";
  }, [myScore, oppScore, total, isDaily, isWin, isLoss, opponentName, result]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-10"
      style={{ background: "var(--qa-page)" }}
    >
      {/* Ambient radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 65% 55% at 50% 38%, ${cfg.glow}18 0%, transparent 72%)`,
        }}
      />

      {/* Confetti particles (win only) */}
      {cfg.particles && PARTICLES.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, bottom: -8, background: p.color }}
          animate={{ y: [0, -(320 + p.id * 12)], opacity: [0, 1, 1, 0], scale: [0.5, 1, 0.7, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, repeatDelay: 0.8 + p.delay, ease: "easeOut" }}
        />
      ))}

      <div className="relative z-10 w-full max-w-md mx-auto text-center">

        {/* Result icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.08 }}
          className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: `${cfg.glow}16`, border: `1px solid ${cfg.glow}35`, color: cfg.titleColor }}
        >
          <ResultIcon className="w-8 h-8" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 13, delay: 0.18 }}
          className="font-arcade leading-none mb-3"
          style={{
            fontSize: "clamp(34px, 9vw, 60px)",
            color: cfg.titleColor,
            textShadow: `0 0 28px ${cfg.glow}70, 0 0 60px ${cfg.glow}30`,
          }}
        >
          {cfg.title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="text-sm text-white/40 mb-8 px-4"
        >
          {subtitle}
        </motion.p>

        {modeLabel && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold mb-6"
            style={{ background: `${AMBER}14`, border: `1px solid ${AMBER}35`, color: AMBER }}
          >
            {modeLabel}
          </motion.div>
        )}

        {/* ── Coins amount ── */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.42 }}
          className="mb-8"
        >
          <div
            className="inline-flex flex-col items-center gap-1 px-6 py-4 rounded-xl border"
            style={{
              background:   isLoss ? "rgba(255,107,107,0.07)" : isWin ? `${AMBER}09` : "var(--qa-text-faint)",
              borderColor:  isLoss ? "rgba(255,107,107,0.25)" : isWin ? `${AMBER}35` : "var(--qa-text-faint)",
              boxShadow:    isWin ? `0 0 30px ${AMBER}18` : isLoss ? "0 0 30px rgba(255,107,107,0.12)" : "none",
            }}
          >
            <span
              className="font-arcade leading-none"
              style={{
                fontSize: "clamp(28px, 7vw, 48px)",
                color: isLoss ? "#FF6B6B" : AMBER,
                textShadow: `0 0 24px ${isLoss ? "#FF6B6B" : AMBER}60`,
              }}
            >
              {formatMoney(coinsGained, currency, { showPlus: true })}
            </span>
            <span className="text-[10px] text-white/20 mt-0.5">argent réel · 1 FCFA = 1 XAF</span>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52 }}
          className="grid gap-3 mb-8"
          style={{
            gridTemplateColumns: [
              myScore !== undefined,
              streak >= 3,
            ].filter(Boolean).length === 2 ? "1fr 1fr" : "1fr",
          }}
        >
          {myScore !== undefined && (
            <StatCard
              label="Score"
              value={`${myScore}/${total}`}
              color={opponentName !== undefined ? (result === "win" ? "#5DD66E" : result === "draw" ? AMBER : "#FF6B6B") : myScore >= Math.ceil(total * 0.7) ? "#5DD66E" : myScore >= Math.ceil(total * 0.5) ? AMBER : "#FF6B6B"}
            />
          )}
          {streak >= 3 && (
            <StatCard
              label="Série"
              value={`×${streak >= 5 ? "2.0" : "1.5"}`}
              sub={streak >= 5 ? "En feu" : "Streak"}
              color={AMBER}
            />
          )}
        </motion.div>

        {/* Duel VS scores */}
        {opponentName !== undefined && myScore !== undefined && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.58 }}
            className="flex items-center justify-center gap-8 mb-8"
          >
            <div className="text-center">
              <div className="text-[10px] text-white/25 mb-1">Toi</div>
              <div className="font-arcade text-4xl" style={{ color: result === "win" ? "#5DD66E" : result === "draw" ? AMBER : "#FF6B6B" }}>{myScore}</div>
            </div>
            <div className="font-arcade text-lg text-white/15">VS</div>
            <div className="text-center">
              <div className="text-[10px] text-white/25 mb-1">{opponentName}</div>
              <div className="font-arcade text-4xl" style={{ color: result === "loss" ? "#5DD66E" : "rgba(255,255,255,0.35)" }}>{oppScore ?? (total - myScore)}</div>
            </div>
          </motion.div>
        )}

        {/* ── CTA Buttons ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <button
            onClick={onReplay}
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: AMBER, color: "#07070F" }}
          >
            {opponentName
              ? <><Swords className="w-4 h-4" /> Revanche</>
              : <><Zap className="w-4 h-4" /> Rejouer</>}
          </button>
          <button
            onClick={onLobby}
            className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold border border-white/[0.1] text-white/60 hover:bg-white/[0.05] hover:text-white transition"
          >
            <Home className="w-4 h-4" /> Lobby
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
}

function StatCard({ label, value, sub, color, Icon }) {
  return (
    <div
      className="rounded-xl border border-white/[0.07] p-3.5 text-center"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      <div className="text-[9px] uppercase tracking-widest text-white/20 mb-2 font-semibold">{label}</div>
      <div className="flex items-center justify-center gap-1">
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
        <div className="font-arcade text-xl leading-none" style={{ color }}>{value}</div>
      </div>
      {sub && <div className="text-[10px] text-white/30 mt-1.5">{sub}</div>}
    </div>
  );
}
