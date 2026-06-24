import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../context/AppContext";
import { QUESTIONS, getCategory } from "../data/mockData";
import { X, Crown, ChevronLeft, ChevronRight } from "lucide-react";

const AMBER = "#E5A800";

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
  const [page, setPage] = useState(0); // 0 = summary, 1..10 = Q by Q

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
          className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/[0.08] overflow-hidden"
          style={{ background: "#0B0B14" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div>
              <div className="text-[10px] text-white/25 mb-0.5">
                {replay.tournament} · {replay.round} · {replay.date}
              </div>
              <div className="text-xs font-medium text-white">
                {replay.playerA} vs {replay.playerB}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/25">{replay.duration}</span>
              <button onClick={onClose} className="p-1.5 rounded-md text-white/30 hover:text-white/70 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Page nav */}
          <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/[0.05] overflow-x-auto">
            <button
              onClick={() => setPage(0)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition flex-shrink-0 border"
              style={page === 0
                ? { borderColor: `${AMBER}50`, background: `${AMBER}10`, color: AMBER }
                : { borderColor: "transparent", color: "rgba(255,255,255,0.3)" }}
            >
              Résumé
            </button>
            {Array.from({ length: totalQ }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className="w-7 h-7 rounded-md text-xs font-medium flex items-center justify-center flex-shrink-0 border transition"
                style={page === i + 1
                  ? { borderColor: `${AMBER}50`, background: `${AMBER}10`, color: AMBER }
                  : {
                    borderColor: "transparent",
                    color: "rgba(255,255,255,0.3)",
                    background: replay.results[i]?.a && replay.results[i]?.b
                      ? "rgba(93,214,110,0.08)"
                      : !replay.results[i]?.a && !replay.results[i]?.b
                      ? "rgba(255,85,85,0.08)"
                      : "rgba(255,255,255,0.04)",
                  }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="p-4">
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
                    <div className={`flex-1 text-center ${aCorrect > bCorrect ? "" : "opacity-40"}`}>
                      <div className="font-arcade text-4xl leading-none mb-1" style={{ color: AMBER }}>
                        {aCorrect}
                      </div>
                      <div className="text-xs font-medium text-white">{replay.playerA}</div>
                      {winnerName === replay.playerA && (
                        <div className="flex items-center justify-center gap-1 mt-1 text-[10px]" style={{ color: AMBER }}>
                          <Crown className="w-2.5 h-2.5" /> Vainqueur
                        </div>
                      )}
                    </div>
                    <div className="text-white/20 font-arcade text-xs">–</div>
                    <div className={`flex-1 text-center ${bCorrect > aCorrect ? "" : "opacity-40"}`}>
                      <div className="font-arcade text-4xl leading-none mb-1 text-white/50">
                        {bCorrect}
                      </div>
                      <div className="text-xs font-medium text-white/60">{replay.playerB}</div>
                      {winnerName === replay.playerB && (
                        <div className="flex items-center justify-center gap-1 mt-1 text-[10px]" style={{ color: AMBER }}>
                          <Crown className="w-2.5 h-2.5" /> Vainqueur
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Q by Q table */}
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                    <div className="grid grid-cols-[28px_1fr_80px_80px] text-[10px] text-white/25 px-3 py-2 border-b border-white/[0.05] uppercase tracking-widest">
                      <span>#</span>
                      <span>Question</span>
                      <span className="text-center">{replay.playerA.slice(0, 8)}</span>
                      <span className="text-center">{replay.playerB.slice(0, 8)}</span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {replay.results.map((r, i) => {
                        const q = questions[i];
                        return (
                          <button
                            key={i}
                            onClick={() => setPage(i + 1)}
                            className="grid grid-cols-[28px_1fr_80px_80px] w-full px-3 py-2.5 text-left hover:bg-white/[0.02] transition"
                          >
                            <span className="text-[10px] text-white/25">{i + 1}</span>
                            <span className="text-xs text-white/50 truncate pr-2">
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
                        <div className="rounded-xl bg-[#0D0D18] border border-white/[0.06] p-4 mb-4">
                          <div className="text-[10px] text-white/25 mb-1.5">Question {page}</div>
                          <p className="text-sm text-white leading-snug">{q.q[lang]}</p>
                        </div>

                        {/* Options with both players' choices revealed */}
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt, i) => {
                            const isCorrect = i === q.answer;
                            const aChose = r.a ? i === q.answer : i === (q.answer + 1) % 4;
                            const bChose = r.b ? i === q.answer : i === (q.answer + 2) % 4;
                            // Simplified: correct answer gets green; wrong answer (if someone chose it) gets red
                            let bg = "rgba(255,255,255,0.03)";
                            let border = "rgba(255,255,255,0.07)";
                            if (isCorrect) { bg = "#5DD66E10"; border = "#5DD66E40"; }
                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs"
                                style={{ background: bg, borderColor: border }}
                              >
                                <span style={{ color: isCorrect ? "#5DD66E" : "rgba(255,255,255,0.5)" }}>{opt}</span>
                                <div className="flex gap-1.5 flex-shrink-0">
                                  {(r.a ? isCorrect : i === (q.answer + 1) % 4) && (
                                    <span
                                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                                      style={{ background: r.a && isCorrect ? "#5DD66E25" : "#FF555520", color: r.a && isCorrect ? "#5DD66E" : "#FF5555" }}
                                    >
                                      {replay.playerA.slice(0, 6)}
                                    </span>
                                  )}
                                  {(r.b ? isCorrect : i === (q.answer + 2) % 4) && (
                                    <span
                                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                                      style={{ background: r.b && isCorrect ? "#5DD66E25" : "#FF555520", color: r.b && isCorrect ? "#5DD66E" : "#FF5555" }}
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
                        <div className="grid grid-cols-2 gap-2 text-center text-xs mb-4">
                          <div className="rounded-lg bg-[#0D0D18] border border-white/[0.06] px-3 py-2">
                            <div className="text-[10px] text-white/25 mb-0.5">{replay.playerA}</div>
                            <div style={{ color: r.a ? "#5DD66E" : "#FF5555" }}>
                              {r.a ? `✓ ${r.timeA}s` : "✗ raté"}
                            </div>
                          </div>
                          <div className="rounded-lg bg-[#0D0D18] border border-white/[0.06] px-3 py-2">
                            <div className="text-[10px] text-white/25 mb-0.5">{replay.playerB}</div>
                            <div style={{ color: r.b ? "#5DD66E" : "#FF5555" }}>
                              {r.b ? `✓ ${r.timeB}s` : "✗ raté"}
                            </div>
                          </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="flex items-center gap-1 px-3 py-2 border border-white/[0.07] rounded-md text-xs text-white/40 hover:text-white/70 transition"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            {page === 1 ? "Résumé" : `Q${page - 1}`}
                          </button>
                          <span className="text-[10px] text-white/20">{page}/{totalQ}</span>
                          {page < totalQ ? (
                            <button
                              onClick={() => setPage(p => Math.min(totalQ, p + 1))}
                              className="flex items-center gap-1 px-3 py-2 border border-white/[0.07] rounded-md text-xs text-white/40 hover:text-white/70 transition"
                            >
                              Q{page + 1} <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setPage(0)}
                              className="flex items-center gap-1 px-3 py-2 text-xs rounded-md transition"
                              style={{ background: `${AMBER}15`, color: AMBER }}
                            >
                              Résumé <ChevronRight className="w-3.5 h-3.5" />
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
      <span className="text-[10px]" style={{ color: ok ? "#5DD66E" : "#FF5555" }}>
        {ok ? `✓ ${time}s` : "✗"}
      </span>
    </div>
  );
}
