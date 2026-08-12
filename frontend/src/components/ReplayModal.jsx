import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { QUESTIONS, getCategory } from "../data/mockData";
import { X, Crown, ChevronLeft, ChevronRight } from "lucide-react";

const AMBER = "#E5A800";
const GREEN = "#5DD66E";
const RED   = "#FF5555";

function pickDeterministic(arr, n, seed) {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = ((s * 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function ReplayModal({ replay, onClose }) {
  const { lang } = useApp();
  const [page, setPage] = useState(0);

  const cat = getCategory(replay.category);
  const seed = replay.id.charCodeAt(0) * 997 + replay.id.charCodeAt(1) * 31;
  const questions = pickDeterministic(QUESTIONS[replay.category] || [], 10, seed);

  const totalQ = replay.results.length;
  const aCorrect = replay.results.filter(r => r.a).length;
  const bCorrect = replay.results.filter(r => r.b).length;

  const winnerName = aCorrect > bCorrect ? replay.playerA : bCorrect > aCorrect ? replay.playerB : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
        style={{ background: "rgba(5,5,10,0.88)", backdropFilter: "blur(14px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          onClick={e => e.stopPropagation()}
          className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
          style={{
            background: "var(--qa-surface)",
            border: "1px solid var(--qa-border-md)",
            boxShadow: `0 20px 60px -20px ${AMBER}44`,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--qa-divider)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold" style={{ color: "var(--qa-text-sub)" }}>
                {replay.tournament} · {replay.round} · {replay.date}
              </div>
              <div className="text-base font-bold mt-0.5 truncate" style={{ color: "var(--qa-text)" }}>
                {replay.playerA} vs {replay.playerB}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <span className="text-xs font-semibold" style={{ color: "var(--qa-text-sub)" }}>
                {replay.duration}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition hover:opacity-70"
                style={{ color: "var(--qa-text-faint)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Page nav */}
          <div
            className="flex items-center gap-1.5 px-4 py-3 overflow-x-auto no-scrollbar"
            style={{ borderBottom: "1px solid var(--qa-divider)" }}
          >
            <button
              onClick={() => setPage(0)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex-shrink-0"
              style={page === 0
                ? { background: `${AMBER}22`, color: AMBER, border: `1px solid ${AMBER}55` }
                : { color: "var(--qa-text-sub)", border: "1px solid var(--qa-border)" }}
            >
              Résumé
            </button>
            {Array.from({ length: totalQ }).map((_, i) => {
              const bothOk = replay.results[i]?.a && replay.results[i]?.b;
              const noneOk = !replay.results[i]?.a && !replay.results[i]?.b;
              const isActive = page === i + 1;
              return (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className="w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 transition"
                  style={isActive
                    ? { background: `${AMBER}22`, color: AMBER, border: `1px solid ${AMBER}55` }
                    : {
                        color: bothOk ? GREEN : noneOk ? RED : "var(--qa-text)",
                        background: bothOk
                          ? "rgba(93,214,110,0.14)"
                          : noneOk
                          ? "rgba(255,85,85,0.14)"
                          : "var(--qa-active)",
                        border: "1px solid transparent",
                      }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            <AnimatePresence mode="wait">

              {/* SUMMARY PAGE */}
              {page === 0 && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {/* VS score */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`flex-1 text-center ${aCorrect > bCorrect ? "" : "opacity-55"}`}>
                      <div className="font-display font-bold text-5xl leading-none mb-2" style={{ color: aCorrect >= bCorrect ? AMBER : "var(--qa-text-faint)" }}>
                        {aCorrect}
                      </div>
                      <div className="text-sm font-bold" style={{ color: "var(--qa-text)" }}>{replay.playerA}</div>
                      {winnerName === replay.playerA && (
                        <div className="flex items-center justify-center gap-1 mt-1 text-xs font-bold" style={{ color: AMBER }}>
                          <Crown className="w-3 h-3" /> Vainqueur
                        </div>
                      )}
                    </div>
                    <div className="font-display font-bold text-lg" style={{ color: "var(--qa-text-faint)" }}>–</div>
                    <div className={`flex-1 text-center ${bCorrect > aCorrect ? "" : "opacity-55"}`}>
                      <div className="font-display font-bold text-5xl leading-none mb-2" style={{ color: bCorrect >= aCorrect ? AMBER : "var(--qa-text-faint)" }}>
                        {bCorrect}
                      </div>
                      <div className="text-sm font-bold" style={{ color: "var(--qa-text)" }}>{replay.playerB}</div>
                      {winnerName === replay.playerB && (
                        <div className="flex items-center justify-center gap-1 mt-1 text-xs font-bold" style={{ color: AMBER }}>
                          <Crown className="w-3 h-3" /> Vainqueur
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Q by Q table */}
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{ background: "var(--qa-surface)", border: "1px solid var(--qa-border)" }}
                  >
                    <div
                      className="grid grid-cols-[32px_1fr_80px_80px] text-xs font-bold px-3 py-2.5 uppercase tracking-widest"
                      style={{
                        color: "var(--qa-text-sub)",
                        borderBottom: "1px solid var(--qa-divider)",
                      }}
                    >
                      <span>#</span>
                      <span>Question</span>
                      <span className="text-center">{replay.playerA.slice(0, 8)}</span>
                      <span className="text-center">{replay.playerB.slice(0, 8)}</span>
                    </div>
                    <div className="divide-y" style={{ borderColor: "var(--qa-divider)" }}>
                      {replay.results.map((r, i) => {
                        const q = questions[i];
                        return (
                          <button
                            key={i}
                            onClick={() => setPage(i + 1)}
                            className="grid grid-cols-[32px_1fr_80px_80px] w-full px-3 py-2.5 text-left transition hover:opacity-90"
                            style={{ background: "transparent" }}
                          >
                            <span className="text-xs font-bold" style={{ color: "var(--qa-text-faint)" }}>{i + 1}</span>
                            <span className="text-xs truncate pr-2" style={{ color: "var(--qa-text-sub)" }}>
                              {q ? q.q[lang] : "—"}
                            </span>
                            <ResultCell ok={r.a} time={r.timeA} />
                            <ResultCell ok={r.b} time={r.timeB} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* QUESTION DETAIL PAGE */}
              {page > 0 && questions[page - 1] && (
                <motion.div
                  key={`q-${page}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {(() => {
                    const q = questions[page - 1];
                    const r = replay.results[page - 1];
                    return (
                      <>
                        {/* Question */}
                        <div
                          className="rounded-2xl p-4 mb-4"
                          style={{ background: "var(--qa-surface-2)", border: "1px solid var(--qa-border)" }}
                        >
                          <div className="text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: "var(--qa-text-faint)" }}>
                            Question {page}
                          </div>
                          <p className="text-sm font-bold leading-snug" style={{ color: "var(--qa-text)" }}>
                            {q.q[lang]}
                          </p>
                        </div>

                        {/* Options with both players' choices revealed */}
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt, i) => {
                            const isCorrect = i === q.answer;
                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
                                style={{
                                  background: isCorrect ? `${GREEN}18` : "var(--qa-active)",
                                  border: `1px solid ${isCorrect ? `${GREEN}55` : "var(--qa-border)"}`,
                                }}
                              >
                                <span
                                  className="font-semibold"
                                  style={{ color: isCorrect ? GREEN : "var(--qa-text)" }}
                                >
                                  {opt}
                                </span>
                                <div className="flex gap-1.5 flex-shrink-0">
                                  {(r.a ? isCorrect : i === (q.answer + 1) % 4) && (
                                    <span
                                      className="text-xs px-2 py-1 rounded-lg font-bold"
                                      style={{ background: r.a && isCorrect ? `${GREEN}33` : `${RED}30`, color: r.a && isCorrect ? GREEN : RED }}
                                    >
                                      {replay.playerA.slice(0, 6)}
                                    </span>
                                  )}
                                  {(r.b ? isCorrect : i === (q.answer + 2) % 4) && (
                                    <span
                                      className="text-xs px-2 py-1 rounded-lg font-bold"
                                      style={{ background: r.b && isCorrect ? `${GREEN}33` : `${RED}30`, color: r.b && isCorrect ? GREEN : RED }}
                                    >
                                      {replay.playerB.slice(0, 6)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Times */}
                        <div className="grid grid-cols-2 gap-2 text-center text-sm mb-4">
                          <div
                            className="rounded-2xl px-3 py-3"
                            style={{ background: "var(--qa-surface-2)", border: "1px solid var(--qa-border)" }}
                          >
                            <div className="text-xs font-bold mb-1" style={{ color: "var(--qa-text-sub)" }}>{replay.playerA}</div>
                            <div className="font-bold" style={{ color: r.a ? GREEN : RED }}>
                              {r.a ? `✓ ${r.timeA}s` : "✗ raté"}
                            </div>
                          </div>
                          <div
                            className="rounded-2xl px-3 py-3"
                            style={{ background: "var(--qa-surface-2)", border: "1px solid var(--qa-border)" }}
                          >
                            <div className="text-xs font-bold mb-1" style={{ color: "var(--qa-text-sub)" }}>{replay.playerB}</div>
                            <div className="font-bold" style={{ color: r.b ? GREEN : RED }}>
                              {r.b ? `✓ ${r.timeB}s` : "✗ raté"}
                            </div>
                          </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition"
                            style={{ background: "var(--qa-active)", color: "var(--qa-text)" }}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            {page === 1 ? "Résumé" : `Q${page - 1}`}
                          </button>
                          <span className="text-xs font-bold" style={{ color: "var(--qa-text-sub)" }}>
                            {page}/{totalQ}
                          </span>
                          {page < totalQ ? (
                            <button
                              onClick={() => setPage(p => Math.min(totalQ, p + 1))}
                              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition"
                              style={{ background: "var(--qa-active)", color: "var(--qa-text)" }}
                            >
                              Q{page + 1} <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setPage(0)}
                              className="flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl transition"
                              style={{ background: `${AMBER}22`, color: AMBER }}
                            >
                              Résumé <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ResultCell({ ok, time }) {
  return (
    <div className="text-center">
      <span className="text-xs font-bold" style={{ color: ok ? GREEN : RED }}>
        {ok ? `✓ ${time}s` : "✗"}
      </span>
    </div>
  );
}
