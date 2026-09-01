import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { formatMoney } from "../../lib/currency";
import QuestionMedia from "./QuestionMedia";
import Player from "./Player";
import { AMBIENT_FAINT, AMBIENT_TEXT } from "./ambientColors";

const LABELS = ["A", "B", "C", "D"];

// Carte et options alignées sur le style de Solo (§QuizPlay.jsx
// SoloQuestionCard) — retour Paul du 31/08 : avant, un fond et des
// surbrillances rgba() codés en dur restaient sombres en mode clair
// pendant que le reste de l'écran passait au thème clair, rendant le
// texte des réponses quasi illisible.
export default function ArenaQuestion({ question, reveal, picked, choose, scores, me, opponent, opponentAnswered, left, stake, currency, onZoomImage }) {
  const seconds = Math.max(0, Math.ceil(left / 1000));
  const pct = Math.max(0, Math.min(100, left / 130)); // 13s = 13000ms / 130 = 100%

  return (
    <div className="flex flex-1 flex-col justify-center py-6">
      <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Player name={me || "Vous"} score={scores[0]} status={picked !== null ? "Réponse sélectionnée" : "À toi de jouer"} />
        <div className="text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full border-4 font-display text-3xl" style={{ borderColor: seconds <= 3 ? "var(--danger)" : "var(--accent)", color: AMBIENT_TEXT }}>
            {reveal ? "✓" : seconds}
          </div>
          <p className="mt-2 text-[10px] uppercase" style={{ color: AMBIENT_FAINT }}>{formatMoney(stake, currency)}</p>
        </div>
        <Player name={opponent || "Adversaire"} score={scores[1]} status={opponentAnswered ? "Réponse verrouillée" : "Connecté"} right />
      </div>

      <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border p-5 sm:p-8" style={{ background: "var(--surface)", borderColor: "var(--border-md)" }}>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
          <motion.div className="h-full" animate={{ width: `${pct}%` }} style={{ background: seconds <= 3 ? "var(--danger)" : "var(--accent)" }} />
        </div>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>Question {question.index + 1}/{question.total}</p>
        {question.mediaUrl && <QuestionMedia key={question.questionId} src={question.mediaUrl} alt={question.mediaAlt || "Illustration de la question"} onZoom={onZoomImage} />}
        <h1 className="my-6 text-2xl font-bold leading-snug sm:text-4xl" style={{ color: "var(--text)" }}>{question.text}</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option, index) => {
            const correct = reveal && index === reveal.correctPosition;
            const wrong = reveal && index === picked && !correct;
            return (
              <motion.button
                key={index}
                onClick={() => choose(index)}
                disabled={!!reveal}
                whileTap={!reveal ? { scale: .98 } : {}}
                className="flex min-h-16 items-center gap-3 rounded-2xl border p-4 text-left transition"
                style={{
                  background: correct ? "rgba(16,185,129,.16)" : wrong ? "rgba(244,63,94,.14)" : picked === index ? "var(--active)" : "var(--surface-2)",
                  borderColor: correct ? "var(--success)" : wrong ? "var(--danger)" : picked === index ? "var(--accent)" : "var(--border)",
                }}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-bold" style={{ background: "var(--surface-3)", color: correct ? "var(--success)" : "var(--accent)" }}>
                  {correct ? <Check className="h-4 w-4" /> : LABELS[index]}
                </span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>{option}</span>
              </motion.button>
            );
          })}
        </div>
        {picked !== null && !reveal && (
          <p className="mt-4 text-center text-xs" style={{ color: "var(--accent)" }}>Choix actuel : {LABELS[picked]} · tu peux encore le modifier avant la fin</p>
        )}
        {reveal && (
          <div className="mt-5 space-y-3">
            <p className="text-center font-bold" style={{ color: reveal.yourCorrect ? "var(--success)" : "var(--danger)" }}>{reveal.yourCorrect ? "Bonne réponse ✓" : "Mauvaise réponse ✗"}</p>
            <p className="text-center text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{reveal.nextInMs > 0 ? "Question suivante dans un instant" : "Dernière question · calcul du résultat"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
