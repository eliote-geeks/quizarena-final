import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { Bar, Block, Label, Loader, Money } from "../ui";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

const LETTERS = ["A", "B", "C", "D"];

/**
 * Solo / contre l'ordinateur.
 * Flow par question :
 *   1. Question + timer (barre + chiffre)
 *   2. Joueur choisit → appel /quiz/reveal → reveal (3 s avec animation)
 *   3. Compteur inter-question 3 s → question suivante
 * La soumission globale (paiement, ELO) reste au submit() final.
 */
export default function QuizPlay() {
  const { categoryId } = useParams();
  const { state } = useLocation();
  const nav = useNavigate();
  const { refreshWallet, setUser, user } = useAuth();
  const mode = state?.mode ?? "LIBRE";
  const stakeCoins = state?.stake ?? 0;

  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);          // index shuffled choisi
  const [left, setLeft] = useState(0);                 // ms restantes
  const [countdown, setCountdown] = useState(3);       // décompte d'entrée 3→0
  const [result, setResult] = useState(null);          // réponse finale submit()
  const [submitting, setSubmitting] = useState(false);

  // Reveal per-question
  const [reveal, setReveal] = useState(null);          // { shuffledCorrectIndex } ou null
  const [revealLeft, setRevealLeft] = useState(0);     // ms avant prochaine question

  const answersRef = useRef([]);
  const questionShownAt = useRef(0);
  const tabSwitchesRef = useRef(0);
  const sessionStartedAt = useRef(0);
  const pickingRef = useRef(false);                    // évite les doubles-appels

  // Démarre la session serveur au montage
  useEffect(() => {
    api
      .startQuiz({ categoryId, mode, stakeCoins: mode === "CHALLENGE" ? stakeCoins : undefined })
      .then((s) => {
        setSession(s);
        sessionStartedAt.current = Date.now();
      })
      .catch((err) => setLoadError(err.message || "Impossible de démarrer la partie"));
  }, [categoryId, mode, stakeCoins]);

  // Détection onglet masqué (anti-triche)
  useEffect(() => {
    const onBlur = () => (tabSwitchesRef.current += 1);
    const onVis = () => document.hidden && (tabSwitchesRef.current += 1);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Décompte d'entrée 3→0
  useEffect(() => {
    if (countdown === 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 750);
    return () => clearTimeout(t);
  }, [countdown]);

  const running = session && countdown === 0 && picked === null && !result && !reveal;

  // Timer question (RAF) — s'arrête dès qu'on a choisi ou en révélation
  useEffect(() => {
    if (!running) return;
    questionShownAt.current = performance.now();
    setLeft(session.timePerQuestionMs);
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const remaining = Math.max(0, session.timePerQuestionMs - (now - start));
      setLeft(remaining);
      if (remaining > 0) raf = requestAnimationFrame(tick);
      else pickAnswer(-1); // temps écoulé
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index]);

  // Compte à rebours inter-question (3 s après révélation)
  useEffect(() => {
    if (!reveal || revealLeft <= 0) return;
    const t = setTimeout(() => setRevealLeft((n) => Math.max(0, n - 1000)), 1000);
    return () => clearTimeout(t);
  }, [reveal, revealLeft]);

  // Quand le compteur inter-question arrive à 0 : question suivante ou fin
  useEffect(() => {
    if (!reveal || revealLeft > 0) return;
    // Passer à la suite
    const next = index + 1;
    if (next >= session.questions.length) {
      doFinish();
    } else {
      setIndex(next);
      setPicked(null);
      setReveal(null);
      setLeft(session.timePerQuestionMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, revealLeft]);

  const doFinish = useCallback(async () => {
    setSubmitting(true);
    try {
      const totalDurationMs = Date.now() - sessionStartedAt.current;
      const res = await api.submitQuiz({
        sessionId: session.sessionId,
        answers: answersRef.current,
        tabSwitches: tabSwitchesRef.current,
        totalDurationMs,
      });
      setResult(res);
      if (user) setUser({ ...user, eloRating: res.eloRating });
      refreshWallet();
    } catch (err) {
      setLoadError(err.message || "Échec de la soumission");
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, refreshWallet]);

  const pickAnswer = async (i) => {
    if (picked !== null || !session || pickingRef.current) return;
    pickingRef.current = true;
    const chosenIndex = Math.max(0, i);
    const responseMs = Math.round(performance.now() - questionShownAt.current);
    setPicked(i === -1 ? -1 : i);

    answersRef.current.push({
      questionId: session.questions[index].id,
      chosenIndex,
      responseMs,
    });

    // Demande la bonne réponse au serveur
    try {
      const r = await api.revealQuiz(session.sessionId, session.questions[index].id);
      setReveal(r); // { shuffledCorrectIndex }
    } catch {
      // En cas d'erreur réseau, on passe directement à la suite sans reveal
      setReveal({ shuffledCorrectIndex: -1 });
    }
    setRevealLeft(3000);
    pickingRef.current = false;
  };

  // ── Rendu ────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="grain flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
        <Label tone="flare">Erreur</Label>
        <p className="t-title max-w-sm text-lg">{loadError}</p>
        <Block onClick={() => nav(`/category/${categoryId}`)}>Retour</Block>
      </div>
    );
  }

  if (!session) return <Loader full />;
  if (countdown > 0) return <Countdown n={countdown} />;
  if (result) return <Done result={result} mode={mode} stakeCoins={stakeCoins} categoryId={categoryId} />;
  if (submitting) return <Loader full />;

  const question = session.questions[index];
  const pct = session.timePerQuestionMs > 0 ? (left / session.timePerQuestionMs) * 100 : 0;
  const secs = Math.max(0, Math.ceil(left / 1000));
  const urgent = pct < 30;
  const revealed = reveal !== null;
  const correctIdx = reveal?.shuffledCorrectIndex ?? -1;
  const revealSecs = Math.max(0, Math.ceil(revealLeft / 1000));

  return (
    <div className="grain mx-auto flex min-h-dvh w-full max-w-[1100px] flex-col px-5 sm:px-8">
      <header className="flex items-center justify-between pt-5 pb-4">
        <button onClick={() => nav(`/category/${categoryId}`)} className="t-label text-bone-4 hover:text-flare">
          ← quitter
        </button>
        <Label>{mode === "CHALLENGE" ? `mise ${stakeCoins.toLocaleString("fr-FR")} F` : "contre l'ordinateur"}</Label>
        <span className="t-label text-bone-4">
          {String(index + 1).padStart(2, "0")}/{session.questions.length}
        </span>
      </header>

      {/* Barre + chiffre secondes */}
      <div className="flex items-center gap-3">
        <Bar value={revealed ? 100 : pct} tone={revealed ? (picked === correctIdx ? "live" : "flare") : urgent ? "flare" : "bone"} height={8} className="flex-1" />
        {!revealed && (
          <span className={clsx("t-display w-6 shrink-0 text-right text-xl tabular-nums", urgent ? "text-flare" : "text-bone-3")}>
            {secs}
          </span>
        )}
        {revealed && revealLeft > 0 && (
          <span className="t-label w-6 shrink-0 text-right text-sm tabular-nums text-bone-4">
            {revealSecs}s
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between py-8 sm:justify-center sm:py-12">
        <h1 key={index} className="anim-rise t-display max-w-[19ch] text-[clamp(1.9rem,5.4vw,3.4rem)]">
          {question.text}
        </h1>

        <div className="mt-9 grid gap-2.5 sm:grid-cols-2">
          {question.options.map((opt, i) => {
            const isMine = i === picked;
            const isCorrect = revealed && i === correctIdx;
            const isWrongPick = revealed && isMine && i !== correctIdx;
            const isTimeout = picked === -1 && revealed && !isMine;

            // État visuel
            let bg = "bg-ink-2 hover:bg-ink-3";
            if (revealed) {
              if (isCorrect) bg = "bg-live text-ink";
              else if (isWrongPick) bg = "bg-danger/80 text-bone";
              else bg = "bg-ink-2 opacity-35";
            }

            return (
              <button
                key={i}
                onClick={() => pickAnswer(i)}
                disabled={revealed || picked !== null}
                className={clsx(
                  "press group flex items-center gap-4 px-5 py-5 text-left",
                  "transition-colors duration-200",
                  !revealed && "bg-ink-2 hover:bg-ink-3",
                  isCorrect && "bg-live text-ink anim-correct",
                  isWrongPick && "bg-danger/80 text-bone anim-shake",
                  revealed && !isCorrect && !isWrongPick && "bg-ink-2 opacity-35"
                )}
              >
                <span
                  className={clsx(
                    "t-display w-7 shrink-0 text-xl",
                    !revealed && "text-bone-4 group-hover:text-flare",
                    isCorrect && "text-ink",
                    isWrongPick && "text-bone",
                    revealed && !isCorrect && !isWrongPick && "text-bone-4"
                  )}
                >
                  {isCorrect ? "✓" : isWrongPick ? "✗" : LETTERS[i]}
                </span>
                <span className="t-title text-[17px]">{opt}</span>

                {/* Badges résultat */}
                {revealed && (isCorrect || isWrongPick) && (
                  <span className="anim-rise ml-auto text-[11px] t-label shrink-0">
                    {isCorrect ? "bonne réponse" : "ta réponse"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Message inter-question */}
        {revealed && (
          <div className="anim-rise mt-8 flex flex-col items-center gap-2 text-center">
            {picked === -1 ? (
              <p className="t-body text-sm text-bone-4">Temps écoulé — prochaine question dans {revealSecs}s</p>
            ) : picked === correctIdx ? (
              <p className="t-title text-lg text-live">✓ Bonne réponse ! ({revealSecs}s)</p>
            ) : (
              <p className="t-title text-lg text-danger">✗ Raté — prochaine question dans {revealSecs}s</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Countdown({ n }) {
  return (
    <div className="grain flex min-h-dvh flex-col items-center justify-center">
      <Label className="mb-4">c'est parti</Label>
      <span key={n} className="anim-slam t-display text-[28vw] leading-none text-flare sm:text-[14rem]">
        {n}
      </span>
    </div>
  );
}

function Done({ result, mode, stakeCoins, categoryId }) {
  const nav = useNavigate();
  const { scoreServer, totalQuestions, correctness, payoutCoins, balanceCoins, suspicionAction } = result;
  const net = mode === "CHALLENGE" ? payoutCoins - stakeCoins : 0;
  const won = mode === "CHALLENGE" ? payoutCoins > stakeCoins : scoreServer / totalQuestions >= 0.6;

  return (
    <div className="grain flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Label tone={won ? "live" : "dim"} className="anim-rise mb-3">
        partie terminée
      </Label>
      <span className={clsx("anim-rise-2 t-display text-[clamp(2.5rem,10vw,5rem)]", won ? "text-live" : "text-bone-3")}>
        {scoreServer}/{totalQuestions}
      </span>

      {/* Récapitulatif question par question */}
      {Array.isArray(correctness) && correctness.length > 0 && (
        <div className="anim-rise-3 mt-6 flex gap-1.5 justify-center flex-wrap max-w-xs">
          {correctness.map((ok, i) => (
            <span
              key={i}
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-lg text-sm t-label",
                ok ? "bg-live/20 text-live" : "bg-danger/20 text-danger"
              )}
            >
              {ok ? "✓" : "✗"}
            </span>
          ))}
        </div>
      )}

      {mode === "CHALLENGE" && (
        <div className="anim-rise-3 mt-8 flex items-center justify-center gap-x-10">
          <div className="flex flex-col items-center gap-1.5">
            <Label>{net >= 0 ? "gain" : "perte"}</Label>
            <Money value={Math.abs(net)} size="lg" tone={net >= 0 ? "live" : "flare"} />
          </div>
        </div>
      )}

      {mode === "CHALLENGE" && suspicionAction !== "credit" && (
        <p className="t-body mt-6 max-w-xs text-sm text-bone-4">
          Gains en cours de vérification — crédités sous peu.
        </p>
      )}

      <div className="anim-rise-3 mt-9 flex flex-col gap-3 sm:flex-row">
        <Block size="lg" onClick={() => nav(0)}>Rejouer</Block>
        <Block tone="outline" size="lg" onClick={() => nav(`/category/${categoryId}`)}>Catégories</Block>
      </div>

      <p className="t-body mt-6 text-xs text-bone-4">Solde : {balanceCoins.toLocaleString("fr-FR")} F</p>
    </div>
  );
}
