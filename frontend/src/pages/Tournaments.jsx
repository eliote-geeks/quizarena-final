import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useApp } from "../context/AppContext";
import { TOURNAMENTS, BRACKET } from "../data/mockData";
import { formatMoney } from "../lib/currency";
import SpectateModal from "../components/SpectateModal";
import {
  Crown, Radio, Trophy, Eye, Users, Clock, ChevronRight, Lock, BarChart2, Coins, ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

function useFinaleScore() {
  const [aScore, setAScore] = useState(3);
  const [bScore, setBScore] = useState(2);
  const ref = useRef({ a: 3, b: 2 });
  useEffect(() => {
    const id = setInterval(() => {
      if (ref.current.a >= 10 && ref.current.b >= 10) { clearInterval(id); return; }
      const r = Math.random();
      if (r < 0.48) { ref.current.a = Math.min(10, ref.current.a + 1); setAScore(ref.current.a); }
      else if (r < 0.82) { ref.current.b = Math.min(10, ref.current.b + 1); setBScore(ref.current.b); }
    }, 5000 + Math.random() * 3500);
    return () => clearInterval(id);
  }, []);
  return [aScore, bScore];
}

export default function Tournaments() {
  const { lang, coins, currency, elo, addCoins } = useApp();
  const navigate = useNavigate();
  const [spectating, setSpectating] = useState(false);
  const [finaleA, finaleB] = useFinaleScore();

  const rounds = BRACKET.rounds;
  const finaleMatch = rounds[rounds.length - 1]?.matches[0];

  const handleRegister = (tr) => {
    if (elo < tr.minElo) {
      toast.error("ELO insuffisant", { description: `Il vous faut ${tr.minElo} ELO. Vous avez ${elo}.` });
      return;
    }
    if (coins < tr.entryFee) {
      toast.error("Solde insuffisant", { description: `Il vous faut ${formatMoney(tr.entryFee, currency)}.` });
      return;
    }
    addCoins(-tr.entryFee);
    toast.success(`Inscrit à ${tr.name[lang]}`, { description: `-${formatMoney(tr.entryFee, currency)}` });
  };

  return (
    <>
      <div className="min-h-full px-4 sm:px-6 py-8 max-w-4xl mx-auto space-y-10">

        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: "var(--text-faint)" }}>
            <Trophy className="w-3.5 h-3.5" />
            <span>Compétitions à cagnotte</span>
          </div>
          <h1 className="font-display font-semibold text-4xl sm:text-5xl leading-[1.05] tracking-tight" style={{ color: "var(--text)" }}>
            Tournois <span className="serif-italic" style={{ color: "var(--accent)" }}>en jeu</span>
          </h1>
          <p className="mt-3 text-base max-w-lg" style={{ color: "var(--text-sub)" }}>
            Inscrivez-vous, jouez, empochez la cagnotte.
          </p>
        </motion.header>

        {/* Finale live */}
        {finaleMatch && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 pulse-soft" style={{ color: "var(--danger)" }} />
              <h2 className="font-display font-semibold text-lg" style={{ color: "var(--text)" }}>Finale en direct</h2>
            </div>

            <div className="card rounded-3xl overflow-hidden mesh-subtle">
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--divider)" }}>
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Finale</span>
                </div>
                <button onClick={() => setSpectating(true)} className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm">
                  <Eye className="w-4 h-4" />
                  Regarder
                </button>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-8">
                <PlayerBlock name={finaleMatch.a} score={finaleA} leading={finaleA > finaleB} onClick={() => navigate("/player/" + finaleMatch.a)} />
                <div className="text-center">
                  <div className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>vs</div>
                </div>
                <PlayerBlock name={finaleMatch.b} score={finaleB} leading={finaleB > finaleA} onClick={() => navigate("/player/" + finaleMatch.b)} />
              </div>

              <div className="px-6 pb-4 text-xs" style={{ color: "var(--text-sub)" }}>
                Question {Math.min(finaleA + finaleB + 1, 10)}/10
              </div>
            </div>
          </motion.section>
        )}

        {/* À venir */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-display font-semibold text-2xl tracking-tight" style={{ color: "var(--text)" }}>
              À venir
            </h2>
            <span className="chip chip-neutral">{TOURNAMENTS.length}</span>
          </div>

          <div className="space-y-3">
            {TOURNAMENTS.map((tr, i) => {
              const fillPct = (tr.registered / tr.slots) * 100;
              const almostFull = fillPct > 85;
              const eloOk = elo >= tr.minElo;
              const cashOk = coins >= tr.entryFee;
              const canRegister = eloOk && cashOk;
              return (
                <motion.div
                  key={tr.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="group card card-hover rounded-3xl overflow-hidden relative"
                >
                  {/* Gradient accent stripe */}
                  <div
                    className="absolute inset-y-0 left-0 w-1.5 transition-all group-hover:w-2"
                    style={{ background: tr.gradient }}
                  />

                  <div className="p-6 pl-8 flex flex-col sm:flex-row sm:items-center gap-5">
                    {/* Left — infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="chip chip-neutral">{tr.tagline?.[lang] || "Culture générale"}</span>
                        <span className="chip chip-neutral">
                          <Users className="w-3 h-3" />
                          {tr.registered}/{tr.slots}
                        </span>
                      </div>
                      <h3
                        className="font-display font-semibold text-2xl leading-tight tracking-tight"
                        style={{ color: "var(--text)" }}
                      >
                        {tr.name[lang]}
                      </h3>

                      {/* Fill bar */}
                      <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: "var(--active)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${fillPct}%` }}
                          transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                          className="h-full rounded-full"
                          style={{
                            background: almostFull ? "var(--danger)" : tr.gradient,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <RequirementPill icon={BarChart2} label={`ELO ${tr.minElo}+`} ok={eloOk} />
                        <RequirementPill icon={Coins} label={formatMoney(tr.entryFee, currency)} ok={cashOk} />
                        <RequirementPill icon={Clock} label={tr.startsIn} muted />
                      </div>
                    </div>

                    {/* Right — prize + CTA */}
                    <div className="flex sm:flex-col items-end sm:items-end justify-between sm:justify-center gap-3 sm:min-w-[180px]">
                      <div className="text-right">
                        <div className="text-xs font-medium mb-1" style={{ color: "var(--text-faint)" }}>Cagnotte</div>
                        <div
                          className="font-display font-semibold leading-none tracking-tight tabular-nums"
                          style={{ fontSize: "clamp(24px, 3.6vw, 34px)", color: "var(--text)" }}
                        >
                          {formatMoney(tr.prizePool, currency)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRegister(tr)}
                        data-testid="tournament-register-btn"
                        className={canRegister ? "btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm" : "btn-secondary inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm"}
                      >
                        {canRegister ? (
                          <>S'inscrire <ArrowUpRight className="w-4 h-4" /></>
                        ) : (
                          <><Lock className="w-3.5 h-3.5" /> {!eloOk ? `ELO ${tr.minElo}` : "Solde"}</>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.20 }}
          onClick={() => navigate("/replays")}
          className="card card-hover w-full flex items-center justify-between p-5 rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)", color: "var(--accent-hover)" }}>
              <Eye className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Rediffusions</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-sub)" }}>Regardez les meilleurs matchs</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5" style={{ color: "var(--text-faint)" }} />
        </motion.button>
      </div>

      {spectating && (
        <SpectateModal
          match={{ id: "finale", category: "histoire", players: [finaleMatch.a, finaleMatch.b], pool: 8000, round: Math.min(finaleA + finaleB + 1, 10), total: 10 }}
          onClose={() => setSpectating(false)}
        />
      )}
    </>
  );
}

function RequirementPill({ icon: Icon, label, ok, muted }) {
  const cls = muted ? "chip chip-neutral" : ok ? "chip chip-success" : "chip chip-danger";
  return (
    <span className={cls}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function PlayerBlock({ name, score, leading, onClick }) {
  return (
    <div className={`text-center transition-all ${leading ? "" : "opacity-60"}`}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center text-base font-semibold mx-auto mb-2"
        style={{
          background: leading ? "var(--accent-soft)" : "var(--surface-2)",
          color: leading ? "var(--accent-hover)" : "var(--text-sub)",
          border: "1px solid var(--border)",
        }}>
        {name.substring(0, 2).toUpperCase()}
      </div>
      <button onClick={onClick} className="text-sm font-semibold hover:underline block w-full truncate" style={{ color: "var(--text)" }}>
        {name}
      </button>
      <motion.div
        key={score}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        className="font-display font-semibold text-4xl leading-none mt-2 tracking-tight"
        style={{ color: leading ? "var(--accent)" : "var(--text-faint)" }}
      >
        {score}
      </motion.div>
    </div>
  );
}
