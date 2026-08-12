import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { TOP_PLAYERS } from "../data/mockData";
import { formatMoney } from "../lib/currency";
import { Crown, Flame, Trophy, Clock, Gift, BarChart2 } from "lucide-react";

const WEEKLY_REWARDS = [5000, 2500, 1000];
const TABS = [
  { id: "week", label: "Cette semaine" },
  { id: "all",  label: "Tous les temps" },
];

function nextMondayMidnight() {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { currency } = useApp();
  const [tab, setTab] = useState("week");

  const target = useMemo(nextMondayMidnight, []);
  const cd = useCountdown(target);

  const weekly = useMemo(
    () => TOP_PLAYERS.map((p, i) => ({ ...p, earnings: Math.round(p.earnings * (0.10 + (0.9 / (i + 1))))})),
    []
  );

  const players = tab === "week" ? weekly : TOP_PLAYERS;
  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div className="min-h-full px-4 sm:px-6 py-8 max-w-4xl mx-auto space-y-8">

      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: "var(--text-faint)" }}>
          <Trophy className="w-3.5 h-3.5" />
          <span>Classement</span>
        </div>
        <h1 className="font-display font-semibold text-4xl sm:text-5xl leading-[1.05] tracking-tight" style={{ color: "var(--text)" }}>
          {tab === "week" ? "Cette " : "Tous les "}
          <span className="serif-italic" style={{ color: "var(--accent)" }}>
            {tab === "week" ? "semaine" : "temps"}
          </span>
        </h1>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="inline-flex gap-1 p-1 rounded-xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            data-testid={`lb-tab-${tb.id}`}
            className={tab === tb.id ? "btn-primary px-4 py-1.5 rounded-lg text-sm" : "btn-ghost px-4 py-1.5 rounded-lg text-sm"}
          >
            {tb.label}
          </button>
        ))}
      </motion.div>

      {tab === "week" && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="card rounded-2xl p-5 mesh-subtle"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-faint)" }}>
                <Clock className="w-3.5 h-3.5" />
                Reset dans
              </div>
              <div className="font-display font-semibold text-3xl mt-1 tabular-nums tracking-tight" style={{ color: "var(--text)" }}>
                {cd.days}j {String(cd.hours).padStart(2, "0")}:{String(cd.minutes).padStart(2, "0")}:{String(cd.seconds).padStart(2, "0")}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Gift className="w-4 h-4" style={{ color: "var(--accent)" }} />
              {WEEKLY_REWARDS.map((amount, i) => (
                <div key={i} className="chip chip-accent">
                  #{i + 1} · {formatMoney(amount, currency)}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--text-sub)" }}>
            Basé sur les gains cumulés en FCFA. Reset chaque lundi 00h. Récompense attribuée automatiquement.
          </p>
        </motion.section>
      )}

      {/* Podium */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[1, 0, 2].map((idx) => {
          const p = top3[idx];
          if (!p) return null;
          const rank = idx + 1;
          const isFirst = rank === 1;
          return (
            <button
              key={p.id}
              onClick={() => navigate("/player/" + p.name)}
              className={`card card-hover flex flex-col items-center p-5 rounded-2xl transition ${isFirst ? "card-glow" : "self-end"}`}
            >
              {isFirst && <Crown className="w-5 h-5 -mt-1 mb-1" style={{ color: "var(--accent)" }} />}
              <div
                className={`${isFirst ? "w-16 h-16" : "w-14 h-14"} rounded-full flex items-center justify-center font-semibold ${isFirst ? "text-lg" : "text-base"} mb-2`}
                style={{
                  background: isFirst ? "var(--accent-soft)" : "var(--surface-2)",
                  color: isFirst ? "var(--accent-hover)" : "var(--text)",
                  border: "1px solid var(--border-md)",
                }}
              >
                {p.avatar}
              </div>
              <div className="text-sm font-semibold truncate w-full text-center" style={{ color: "var(--text)" }}>
                {p.name}
              </div>
              <div className={`font-display font-semibold ${isFirst ? "text-lg" : "text-base"} mt-1 tracking-tight`}
                style={{ color: isFirst ? "var(--accent)" : "var(--text-sub)" }}>
                #{rank}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-sub)" }}>
                {formatMoney(p.earnings, currency)}
              </div>
            </button>
          );
        })}
      </motion.section>

      {/* Full list */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <h2 className="font-display font-semibold text-lg tracking-tight" style={{ color: "var(--text)" }}>
            Classement complet
          </h2>
        </div>

        <div className="card rounded-2xl overflow-hidden divide-y" style={{ borderColor: "var(--divider)" }}>
          {rest.map((p, i) => (
            <button
              key={p.id}
              onClick={() => navigate("/player/" + p.name)}
              data-testid={`lb-row-${i + 4}`}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition hover:opacity-95"
            >
              <div className="w-8 flex-shrink-0 text-sm font-semibold text-center" style={{ color: "var(--text-faint)" }}>
                {i + 4}
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}>
                {p.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{p.name}</div>
                <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: "var(--text-sub)" }}>
                  <span>Niveau {p.level}</span>
                  <span>·</span>
                  <span>{p.wins} victoires</span>
                  {p.streak > 0 && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Flame className="w-3 h-3" style={{ color: "var(--accent)" }} />
                        {p.streak}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                {formatMoney(p.earnings, currency)}
              </div>
            </button>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
