import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Bar, Block, ConfirmModal, Label, Loader, Money } from "../ui";
import { CATEGORY_PHOTO, NavIcon } from "../ui/icons";
import { useAuth } from "../context/AuthContext";
import * as duel from "../lib/duelSocket";
import * as music from "../lib/musicEngine";
import { playMatchChime } from "../lib/notifications";
import * as api from "../lib/api";

const LETTERS = ["A", "B", "C", "D"];

/** Duels PvP mélangés ("mixed", §DuelSetup.jsx) n'ont pas UNE catégorie —
 * on tire une image illustrative au hasard mais STABLE pour tout le
 * match (pas une par question, ce serait distrayant), via un hash simple
 * de l'id du match plutôt que Math.random() (mêmes deux joueurs doivent
 * voir la même image, pas juste "un fond qui bouge"). */
const ALL_PHOTOS = Object.values(CATEGORY_PHOTO);
function pickBackdrop(categoryId, matchId) {
  if (categoryId && CATEGORY_PHOTO[categoryId]) return CATEGORY_PHOTO[categoryId];
  if (!matchId) return null;
  let hash = 0;
  for (let i = 0; i < matchId.length; i++) hash = (hash * 31 + matchId.charCodeAt(i)) >>> 0;
  return ALL_PHOTOS[hash % ALL_PHOTOS.length];
}

/**
 * Duel réel — tout est piloté par les événements du serveur
 * (src/modules/duel/engine.ts). Aucun minuteur local ne décide de rien :
 * le client se contente d'afficher ce que le serveur envoie et de lui
 * signaler un choix (§ANTICHEAT_SPEC.md : le serveur reste seul maître
 * du timing et du score, ici plus encore qu'en solo).
 *
 * Sert aussi d'écran pour un match de tournoi (state.tournamentMatchId,
 * depuis Tournaments.jsx) : même moteur serveur, mêmes messages
 * ("matched"/"question"/"reveal"/"duel_result"), stakeCoins vaut juste 0
 * puisque le droit d'entrée a déjà été payé à l'inscription — voir
 * duel/engine.ts createTournamentMatch.
 */
export default function Duel() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { refreshWallet, setUser, user } = useAuth();
  const tournament = state?.tournamentMatchId ? { matchId: state.tournamentMatchId, id: state.tournamentId } : null;

  const [phase, setPhase] = useState(null); // waiting | waiting_ready | countdown | question | reveal | gone
  const [countdownN, setCountdownN] = useState(5);
  // Phase "Prêt" — état local UI
  const [readyClicked, setReadyClicked] = useState(false);
  const [oppReady, setOppReady] = useState(false);
  // Perte de connexion propre du joueur courant (pas l'adversaire)
  const [selfDisconnected, setSelfDisconnected] = useState(false);
  const [opponent, setOpponent] = useState(null);
  const [stakeCoins, setStakeCoins] = useState(0);
  const [question, setQuestion] = useState(null); // { index, total, questionId, text, options, deadline }
  const [picked, setPicked] = useState(null);
  const [oppAnswered, setOppAnswered] = useState(false);
  const [reveal, setReveal] = useState(null);
  const [nextInSecs, setNextInSecs] = useState(0); // compte à rebours "prochaine question dans Xs"
  const [scores, setScores] = useState([0, 0]);
  const [left, setLeft] = useState(0);
  const [banner, setBanner] = useState(""); // déconnexion adversaire / annulation
  const [graceLeft, setGraceLeft] = useState(0); // secondes restantes avant forfait adversaire
  const [backdrop, setBackdrop] = useState(null); // image de catégorie en fond, chargée en tâche de fond
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  const [muted, setMuted] = useState(music.isMuted());
  const [categoryId, setCategoryId] = useState("mixed");
  const [myClan, setMyClan] = useState(null);
  const [opponentClan, setOpponentClan] = useState(null);
  const [roundOutcomes, setRoundOutcomes] = useState([]);
  const [finalResult, setFinalResult] = useState(null);
  const [clanWarId, setClanWarId] = useState(() => duel.getSnapshot().match?.clanWarId ?? null);

  const questionRef = useRef(null);
  questionRef.current = question;
  const leaveTimeoutRef = useRef(null);

  // Match de tournoi : on annonce sa présence au serveur, qui lance dès
  // que l'adversaire fait de même (pas de file d'attente, les deux
  // joueurs sont déjà connus, §Tournaments.jsx).
  useEffect(() => {
    if (!tournament) return;
    duel.connect();
    duel.tournamentEnter(tournament.matchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Récupère l'état déjà en cours si "matched"/"countdown"/"question" est
  // arrivé pendant que DuelSetup.jsx était encore monté.
  useEffect(() => {
    if (tournament) return; // annoncé ci-dessus, pas de snapshot à relire
    const snap = duel.getSnapshot();
    if (snap.phase === "idle") {
      nav("/duel", { replace: true });
      return;
    }
    applySnapshot(snap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charge l'image de fond en tâche de fond, jamais bloquant : le duel
  // (question, options, timer) s'affiche immédiatement quelle que soit
  // la vitesse du réseau — l'image apparaît en fondu quand (si) elle
  // finit de charger, §DESIGN.md §6 (fondu de lisibilité obligatoire).
  function loadBackdrop(categoryId, matchId) {
    const src = pickBackdrop(categoryId, matchId);
    if (!src) return;
    setBackdrop(src);
    setBackdropLoaded(false);
    const img = new Image();
    img.onload = () => setBackdropLoaded(true);
    img.src = src;
  }

  function applySnapshot(snap) {
    // L'identité du match (adversaire, mise, catégorie) vit dans
    // `snap.match`, séparément du `phase`/`last` "dernier événement" —
    // un duel contre l'ordinateur peut enchaîner matched→countdown→
    // question dans le même tick, avant que ce composant ait fini de
    // monter ; sans ce champ persistant, tout ce qui vient de "matched"
    // était perdu dès que la phase avait avancé plus loin (§duelSocket.js).
    if (snap.match) {
      setOpponent(snap.match.opponent);
      setStakeCoins(snap.match.stakeCoins);
      setCategoryId(snap.match.categoryId ?? "mixed");
      loadBackdrop(snap.match.categoryId, snap.match.duelMatchId);
      setClanWarId(snap.match.clanWarId ?? null);
    }
    const m = snap.last;
    if (!m) return;
    if (snap.phase === "resumed") {
      setScores([m.scoreYou, m.scoreOpponent]);
      if (m.phase === "waiting_ready") {
        setReadyClicked(m.alreadyReady ?? false);
        setOppReady(m.opponentAlreadyReady ?? false);
        setPhase("waiting_ready");
      } else if (m.phase === "question" || m.phase === "reveal") {
        setQuestion({ index: m.index, total: m.total, questionId: m.questionId, text: m.text, options: m.options, deadline: m.deadline });
        setPhase("question");
        setPicked(m.alreadyAnswered ? -2 : null); // -2 : déjà répondu avant la coupure, en attente du reveal
      } else if (m.phase === "countdown") {
        setCountdownN(m.countdownRemainingSeconds ?? 5);
        setPhase("countdown");
      }
    } else if (snap.phase === "waiting_ready") {
      setPhase("waiting_ready");
    } else if (snap.phase === "countdown") {
      setCountdownN(m.seconds ?? 5);
      setPhase("countdown");
    } else if (snap.phase === "question") {
      setPhase("question");
      setQuestion(m);
      setPicked(null);
      setOppAnswered(false);
      setReveal(null);
      setLeft(Math.max(0, m.deadline - Date.now()));
    } else if (snap.phase === "reveal") {
      setPhase("question");
      setReveal(m);
      setScores([m.scoreYou, m.scoreOpponent]);
    }
  }

  // Overlay "reconnexion en cours" quand c'est le joueur LUI-MÊME qui perd
  // la connexion — distingue "je coupe" de "l'adversaire coupe" (qui, lui,
  // utilise le banner opponent_disconnected). On écoute les événements
  // internes "_close"/"_open" du singleton duelSocket.js.
  useEffect(() => {
    const offClose = duel.on("_close", () => setSelfDisconnected(true));
    const offOpen  = duel.on("_open",  () => setSelfDisconnected(false));
    return () => { offClose(); offOpen(); };
  }, []);

  // Filet de sécurité client : si le Loader reste affiché plus de 30 s
  // après "matched" (phase=null) sans que le serveur envoie waiting_ready
  // ou duel_cancelled, c'est qu'il y a eu une erreur silencieuse — on
  // redirige plutôt que de laisser l'utilisateur bloqué indéfiniment.
  // Normalement le fix backend (try/catch + duel_cancelled) rend ça
  // superflu, mais c'est un filet de sécurité supplémentaire.
  useEffect(() => {
    if (phase) return; // phase définie → plus de danger
    const snap = duel.getSnapshot();
    if (snap.phase === "idle") return; // déjà géré par l'autre effet
    const t = setTimeout(() => {
      nav("/duel", { replace: true, state: { cancelledReason: "erreur_serveur" } });
    }, 30_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    const offs = [
      duel.on("tournament_waiting", () => setPhase("waiting")),
      duel.on("matched", (m) => {
        setOpponent(m.opponent);
        setStakeCoins(m.stakeCoins);
        setCategoryId(m.categoryId ?? "mixed");
        loadBackdrop(m.categoryId, m.duelMatchId);
        setClanWarId(m.clanWarId ?? null);
      }),
      // Phase "Prêt" — les deux joueurs doivent confirmer leur présence
      duel.on("waiting_ready", () => {
        setReadyClicked(false);
        setOppReady(false);
        setPhase("waiting_ready");
      }),
      duel.on("opponent_ready", () => setOppReady(true)),
      duel.on("countdown", (m) => {
        setPhase("countdown");
        setCountdownN(m.seconds);
      }),
      duel.on("question", (m) => {
        setPhase("question");
        setQuestion(m);
        setPicked(null);
        setOppAnswered(false);
        setReveal(null);
        setBanner("");
        setLeft(Math.max(0, m.deadline - Date.now())); // évite un "0" affiché le temps du 1er rAF
      }),
      duel.on("opponent_answered", () => setOppAnswered(true)),
      duel.on("reveal", (m) => {
        setReveal(m);
        setScores([m.scoreYou, m.scoreOpponent]);
        setRoundOutcomes((items) => [...items, m.yourCorrect ? "win" : "loss"]);
        // Compte à rebours visible "prochaine question dans Xs"
        if (m.nextInMs > 0) {
          setNextInSecs(Math.round(m.nextInMs / 1000));
        } else {
          setNextInSecs(0);
        }
        // Si la question est passée sans réponse → demander si le joueur est encore là
        if (pickedRef.current === null && m.nextInMs > 0) {
          setAwayPrompt(true);
          setAwaySecs(10);
        }
      }),
      duel.on("opponent_disconnected", (m) => {
        const secs = m.graceMs ? Math.ceil(m.graceMs / 1000) : 20;
        setGraceLeft(secs);
        setBanner("opponent_disconnected");
      }),
      duel.on("opponent_reconnected", () => { setBanner(""); setGraceLeft(0); }),
      duel.on("duel_cancelled", (m) => {
        music.stopMusic();
        if (clanWarId) { nav(`/clan-wars/${clanWarId}`, { replace: true }); return; }
        nav("/duel", {
          replace: true,
          state: { cancelledReason: m.reason },
        });
      }),
      duel.on("duel_result", (m) => {
        music.stopMusic();
        clearTimeout(leaveTimeoutRef.current);
        if (user) setUser({ ...user, eloRating: m.eloRating });
        refreshWallet();
        setFinalResult({ ...m, opponentName: opponent?.username ?? "Adversaire", stake: stakeCoins, tournament });
        setPhase("result");
      }),
    ];
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponent, stakeCoins]);

  useEffect(() => {
    api.getClans(1, 1).then((result) => setMyClan(result.myClan?.clan ?? null)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!opponent?.username) return;
    if (opponent.username.startsWith("Ordinateur ·")) { setOpponentClan(null); return; }
    api.getPlayerProfile(opponent.username).then((profile) => setOpponentClan(profile.clan ?? null)).catch(() => setOpponentClan(null));
  }, [opponent?.username]);

  // Ambiance sonore synthétisée (§lib/musicEngine.js) : calme pendant
  // l'attente et le décompte, plus rythmée dès qu'une question est à
  // l'écran — jamais de fichier téléchargé, donc aucun job réseau qui
  // puisse perturber le duel (voir le commentaire d'en-tête du module).
  useEffect(() => {
    if (phase === "waiting" || phase === "countdown") music.playRelaxing();
    else if (phase === "question") music.playAction();
  }, [phase]);

  // Coupe la musique si l'écran se démonte par un chemin qui n'est pas
  // déjà passé par duel_result/duel_cancelled (ex: navigation manuelle).
  useEffect(() => () => music.stopMusic(), []);

  const toggleMute = () => {
    const next = !muted;
    music.setMuted(next);
    setMuted(next);
  };

  // Décompte d'entrée, 1 tick par seconde (le serveur envoie la durée initiale).
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownN <= 0) return;
    const t = setTimeout(() => setCountdownN((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdownN]);

  // Compte à rebours inter-question (reveal → prochaine question).
  useEffect(() => {
    if (!reveal || nextInSecs <= 0) return;
    const t = setTimeout(() => setNextInSecs((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(t);
  }, [reveal, nextInSecs]);

  // Anti-triche : signale au serveur quand l'onglet est masqué pendant une question.
  // Le serveur donne 3 s de grâce puis force une réponse nulle (§engine.ts handleTabHidden).
  useEffect(() => {
    if (phase !== "question") return;
    const onVisibility = () => {
      if (document.hidden) duel.send({ type: "tab_hidden" });
      else duel.send({ type: "tab_visible" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      // S'assure que le serveur annule le timer si le composant se démonte
      // alors que l'onglet était caché (ex : fin de partie reçue en BG).
      if (document.hidden) duel.send({ type: "tab_visible" });
    };
  }, [phase]);

  // Décompte du délai de grâce avant forfait adversaire (affiché dans le banner).
  useEffect(() => {
    if (banner !== "opponent_disconnected" || graceLeft <= 0) return;
    const t = setTimeout(() => setGraceLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(t);
  }, [banner, graceLeft]);

  // Barre de temps : rendu local contre le "deadline" envoyé par le
  // serveur, purement cosmétique — la résolution du round, elle, est
  // toujours décidée côté serveur.
  useEffect(() => {
    if (phase !== "question" || !question || reveal) return;
    let raf;
    const tick = () => {
      const remaining = Math.max(0, question.deadline - Date.now());
      setLeft(remaining);
      if (remaining > 0 && questionRef.current === question) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, question, reveal]);

  const pick = (i) => {
    if (!question || reveal || left <= 0) return;
    setPicked(i);
    duel.answer(question.questionId, i);
  };

  // Quitter en cours de duel = défaite immédiate (§handleForfeit côté
  // serveur) — pas une simple sortie silencieuse. On laisse le
  // "duel_result" qui suit faire naviguer vers /result comme une fin de
  // partie normale ; filet de sécurité si jamais il n'arrivait pas.
  const backTarget = tournament ? `/tournaments/${tournament.id}` : clanWarId ? `/clan-wars/${clanWarId}` : "/";

  const leaveDuel = () => {
    duel.forfeit(); // no-op côté serveur si aucun match n'a encore démarré (ex: phase "waiting")
    leaveTimeoutRef.current = setTimeout(() => nav(backTarget), 2500);
  };

  // Quitter en pleine partie coûte la mise (abandon = défaite) : jamais
  // silencieux, une modal de confirmation stylée avant d'agir — la
  // phase "waiting" (tournoi, adversaire pas encore là) n'a rien à
  // perdre et garde sa sortie directe, voir plus bas.
  // "Êtes-vous encore là ?" — déclenché quand une question entière passe
  // sans qu'aucune réponse soit donnée (picked===null au moment du reveal).
  // Compte à rebours de 10 s : clic "Je suis là" → reprend, sinon forfait.
  const [awayPrompt, setAwayPrompt] = useState(false);
  const [awaySecs, setAwaySecs] = useState(10);
  const pickedRef = useRef(null);
  pickedRef.current = picked;

  useEffect(() => {
    if (!awayPrompt) return;
    if (awaySecs <= 0) {
      setAwayPrompt(false);
      duel.forfeit();
      leaveTimeoutRef.current = setTimeout(() => nav(backTarget), 2500);
      return;
    }
    const t = setTimeout(() => setAwaySecs((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(t);
  }, [awayPrompt, awaySecs]);

  const dismissAwayPrompt = useCallback(() => {
    setAwayPrompt(false);
    setAwaySecs(10);
  }, []);

  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const askLeave = () => setConfirmingLeave(true);
  const confirmLeave = () => {
    setConfirmingLeave(false);
    leaveDuel();
  };
  const leaveModal = (
    <ConfirmModal
      open={confirmingLeave}
      tone="danger"
      title="Quitter le duel ?"
      message="L'abandon compte comme une défaite — la mise engagée est perdue."
      confirmLabel="Abandonner"
      cancelLabel="Rester"
      onConfirm={confirmLeave}
      onCancel={() => setConfirmingLeave(false)}
    />
  );

  // Fond illustratif : sous TOUTES les phases (attente, décompte,
  // questions) dès qu'une image a été retenue pour ce match — un calque
  // fixe, chargé en tâche de fond (§loadBackdrop), jamais un obstacle au
  // jeu (pointer-events-none, opacité faible pour ne jamais nuire à la
  // lisibilité, DESIGN.md §6). Un seul point de rendu ici plutôt que
  // dupliqué dans Waiting/Countdown/le corps du duel.
  const backdropLayer = backdrop && (
    <div
      aria-hidden="true"
      className={clsx(
        "pointer-events-none fixed inset-0 -z-10 bg-cover bg-center transition-opacity duration-[1200ms] ease-out",
        backdropLoaded ? "opacity-[0.14]" : "opacity-0"
      )}
      style={{ backgroundImage: `url(${backdrop})` }}
    />
  );

  const muteButton = (
    <button
      onClick={toggleMute}
      aria-label={muted ? "Réactiver la musique" : "Couper la musique"}
      className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-(--radius-tag) bg-ink-3 text-bone-3 hover:bg-ink-4 hover:text-bone"
    >
      <NavIcon type={muted ? "speakerMuted" : "speaker"} className="h-4 w-4" />
    </button>
  );

  if (finalResult) return <ArenaResult result={finalResult} meName={user?.username ?? "Vous"} opponent={opponent} myClan={myClan} opponentClan={opponentClan} onRematch={() => nav("/duel", { state: { challengeUsername: opponent?.username } })} onNext={() => nav("/duel")} onHome={() => nav(finalResult.clanWarId ? `/clan-wars/${finalResult.clanWarId}` : finalResult.tournament ? `/tournaments/${finalResult.tournament.id}` : "/")} />;

  if (phase === "waiting")
    return (
      <>
        {backdropLayer}
        {selfDisconnected && <ReconnectingOverlay />}
        <Waiting onLeave={() => nav(backTarget)} muteButton={muteButton} />
      </>
    );
  if (!phase) return <>{selfDisconnected && <ReconnectingOverlay />}<Loader full /></>;
  if (phase === "waiting_ready")
    return (
      <>
        {backdropLayer}
        {selfDisconnected && <ReconnectingOverlay />}
        <ReadyScreen
          opponent={opponent}
          stakeCoins={stakeCoins}
          tournament={!!tournament}
          readyClicked={readyClicked}
          oppReady={oppReady}
          disconnected={banner === "opponent_disconnected"}
          graceLeft={graceLeft}
          muteButton={muteButton}
          onReady={() => {
            if (readyClicked) return;
            setReadyClicked(true);
            playMatchChime(); // geste utilisateur → AudioContext garanti actif
            duel.send({ type: "ready" });
          }}
          onLeave={() => {
            duel.send({ type: "cancel_invite" }); // au cas où l'adversaire n'a pas encore rejoint
            nav(backTarget);
          }}
        />
        {leaveModal}
      </>
    );
  if (phase === "countdown")
    return (
      <>
        {backdropLayer}
        {selfDisconnected && <ReconnectingOverlay />}
        <Countdown
          n={countdownN}
          opponent={opponent}
          stakeCoins={stakeCoins}
          tournament={!!tournament}
          onLeave={askLeave}
          muteButton={muteButton}
          disconnected={banner === "opponent_disconnected"}
          graceLeft={graceLeft}
        />
        {leaveModal}
      </>
    );
  if (!question) return <>{selfDisconnected && <ReconnectingOverlay />}<Loader full /></>;

  const totalMs = 8000;
  const pct = (left / totalMs) * 100;
  const urgent = pct < 30;
  const revealed = !!reveal;
  const secs = Math.max(0, Math.ceil(left / 1000));

  return (
    <>
      {backdropLayer}
      {selfDisconnected && <ReconnectingOverlay />}

      {/* "Êtes-vous encore là ?" — question passée sans réponse */}
      {awayPrompt && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-ink/85 backdrop-blur-[3px]"
          aria-live="assertive"
        >
          <div className="anim-rise mx-5 w-full max-w-sm rounded-(--radius-panel) bg-ink-2 p-7 text-center shadow-2xl">
            <span className="mb-4 block text-4xl">😴</span>
            <h2 className="t-display text-xl mb-2">Êtes-vous encore là ?</h2>
            <p className="t-body text-sm text-bone-3 mb-6">
              Tu n'as pas répondu à la dernière question.
              Si tu ne confirmes pas ta présence dans{" "}
              <strong className="text-flare">{awaySecs}s</strong>
              , tu seras déclaré forfait.
            </p>
            <button
              onClick={dismissAwayPrompt}
              className="press w-full rounded-(--radius-card) bg-flare py-3 font-bold text-ink text-sm transition-opacity hover:opacity-90"
            >
              Je suis là — continuer le duel
            </button>
          </div>
        </div>
      )}

      <div className="arena-shell grain">
        <header className="arena-topbar">
          <button onClick={askLeave} className="t-label text-bone-4 hover:text-flare">← quitter</button>
          <div className="flex items-center gap-3"><Label tone="flare">{tournament ? "tournoi" : categoryId === "mixed" ? "culture générale" : categoryId.replaceAll("-", " ")}</Label>{!tournament && <span className="arena-stake">{stakeCoins.toLocaleString("fr-FR")} F</span>}{muteButton}</div>
        </header>

        <section className="arena-hud">
          <PlayerHud name={user?.username ?? "Vous"} score={scores[0]} clan={myClan} connected={!selfDisconnected} mine />
          <TimerRing progress={revealed ? (nextInSecs / 3) * 100 : pct} urgent={urgent && !revealed} value={revealed ? (nextInSecs || "✓") : secs} index={question.index + 1} total={question.total} />
          <PlayerHud name={opponent?.username ?? "Adversaire"} score={scores[1]} clan={opponentClan} connected={banner !== "opponent_disconnected"} answered={oppAnswered} />
        </section>

        <div className="arena-rounds" aria-label="Progression des manches">{Array.from({ length: question.total }, (_, index) => <span key={index} className={clsx(index < roundOutcomes.length && roundOutcomes[index], index === question.index && "current")} />)}</div>

        {banner && <div className="arena-connection-alert"><span />Adversaire déconnecté{graceLeft > 0 ? ` · forfait dans ${graceLeft}s` : " · forfait en cours…"}</div>}

        <main className="arena-stage">
          <section className={clsx("arena-question-card", revealed && (reveal.yourCorrect ? "round-won" : "round-lost"))}>
            <div className="arena-card-kicker"><span>QUESTION {String(question.index + 1).padStart(2, "0")}</span><span>{picked !== null && !revealed ? "PROPOSITION ENREGISTRÉE · MODIFIABLE" : revealed ? `MANCHE ${reveal.yourCorrect ? "GAGNÉE" : "PERDUE"}` : "8 SECONDES"}</span></div>
            <h1 key={question.index} className="anim-rise arena-question-text">{question.text}</h1>
            {revealed && <div className={clsx("arena-round-feedback", reveal.yourCorrect ? "success" : "failure")}><strong>{reveal.yourCorrect ? "+1 · Bonne réponse" : "Raté"}</strong><span>{nextInSecs > 0 ? `Manche suivante dans ${nextInSecs}s` : "Calcul du résultat…"}</span></div>}

            <div className="arena-answers">
          {question.options.map((opt, i) => {
            let state = "idle";
            const isMine = i === picked;
            const isCorrect = revealed && i === reveal.correctPosition;
            const isMyWrongPick = revealed && isMine && !reveal.yourCorrect;
            const opponentPicked = revealed && i === reveal.opponentChosen;
            if (revealed) state = isCorrect ? "on" : "off";

            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={revealed || left <= 0}
                aria-pressed={isMine}
                className={clsx(
                  "arena-answer press group",
                  state === "on" && "is-correct",
                  state === "off" && "is-dimmed",
                  isMine && !revealed && "is-locked",
                  isMyWrongPick && "is-wrong anim-shake",
                  isCorrect && "anim-correct"
                )}
              >
                <span className="arena-answer-letter">{LETTERS[i]}</span>
                <span className="arena-answer-text">{opt}</span>

                {/* Ce que chacun a joué, révélé en même temps que la bonne
                    réponse — pas avant (§ANTICHEAT_SPEC.md). */}
                {revealed && (isMine || opponentPicked) && (
                  <span className="anim-rise ml-auto flex shrink-0 gap-1">
                    {isMine && (
                      <span
                        className={clsx(
                          "t-label px-1.5 py-0.5 text-[10px]",
                          reveal.yourCorrect ? "bg-live/25 text-live" : "bg-bone-4/20 text-bone-3"
                        )}
                      >
                        vous
                      </span>
                    )}
                    {opponentPicked && (
                      <span
                        className={clsx(
                          "t-label px-1.5 py-0.5 text-[10px]",
                          reveal.opponentCorrect ? "bg-live/25 text-live" : "bg-bone-4/20 text-bone-3"
                        )}
                      >
                        {opponent?.username ?? "adversaire"}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
            </div>
          </section>
        </main>
      </div>
      {leaveModal}
    </>
  );
}

function PlayerHud({ name, score, clan, connected, mine, answered }) {
  return <div className={clsx("arena-player", !mine && "opponent")}>
    <div className="arena-avatar-wrap"><img src={api.avatarUrl(name)} alt="" className="arena-avatar" /><span className={clsx("arena-online", connected ? "connected" : "disconnected")} /></div>
    <div className="arena-player-copy"><div className="flex items-center gap-2"><strong>{mine ? "Vous" : name}</strong>{clan && <span style={{ color: clan.bannerColor, background: `${clan.bannerColor}20` }}>[{clan.tag}]</span>}</div><small>{connected ? (answered ? "proposition enregistrée" : "connecté") : "reconnexion…"}</small></div>
    <b className="arena-score">{score}</b>
  </div>;
}

function TimerRing({ progress, urgent, value, index, total }) {
  const safe = Math.max(0, Math.min(100, progress || 0));
  return <div className={clsx("arena-timer", urgent && "urgent")} style={{ "--timer-progress": `${safe * 3.6}deg` }}><div><strong>{value}</strong><span>{index}/{total}</span></div></div>;
}

function ArenaResult({ result, meName, opponent, myClan, opponentClan, onRematch, onNext, onHome }) {
  const won = result.result === "win"; const draw = result.result === "draw"; const net = result.payoutCoins - result.stake;
  const clanWar = Boolean(result.clanWarId);
  return <div className={clsx("arena-result grain", won ? "victory" : draw ? "draw" : "defeat")}>
    <div className="arena-result-glow" />
    <Label tone={won ? "live" : "flare"}>{clanWar ? "confrontation de guerre de clans" : result.tournament ? "résultat du tournoi" : "résultat officiel"}</Label>
    <h1>{won ? "VICTOIRE" : draw ? "ÉGALITÉ" : "DÉFAITE"}</h1>
    <div className="arena-result-versus"><div><img src={api.avatarUrl(meName)} alt="" /><span>Vous {myClan ? `[${myClan.tag}]` : ""}</span></div><strong>{result.scoreYou}<i>—</i>{result.scoreOpponent}</strong><div><img src={api.avatarUrl(opponent?.username ?? "Adversaire")} alt="" /><span>{opponent?.username ?? "Adversaire"} {opponentClan ? `[${opponentClan.tag}]` : ""}</span></div></div>
    {!result.tournament && !clanWar && <div className="arena-result-reward"><span>{net >= 0 ? "GAIN NET" : "PERTE"}</span><strong className={net >= 0 ? "text-live" : "text-danger"}>{Math.abs(net).toLocaleString("fr-FR")} F</strong></div>}
    {clanWar && <p className="mx-auto mt-5 max-w-md text-center text-sm text-bone-4">Ce résultat compte uniquement pour le score collectif de la guerre. La mise du clan sera distribuée à l’équipe gagnante après toutes les confrontations.</p>}
    <div className="arena-result-actions">{clanWar ? <Block onClick={onHome}>Retour à la guerre de clans</Block> : result.tournament ? <Block onClick={onHome}>Retour au tournoi</Block> : <><Block onClick={onRematch}>Proposer une revanche</Block><Block tone="outline" onClick={onNext}>Défi suivant</Block></>}<button onClick={onHome}>{clanWar ? "Voir le score collectif" : "Retour à Jouer"}</button></div>
  </div>;
}

function Side({ name, score, mine, answered }) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-1", !mine && "items-end text-right")}>
      <span className="t-label truncate text-bone-3">{name}</span>
      <span
        key={score}
        className={clsx("anim-pop t-display text-[clamp(3rem,11vw,5.5rem)]", mine ? "text-bone" : "text-bone-2")}
      >
        {score}
      </span>
      <span className="t-label text-bone-4">{mine ? "" : answered ? "a répondu" : "réfléchit…"}</span>
    </div>
  );
}

function Countdown({ n, opponent, stakeCoins, tournament, onLeave, muteButton, disconnected, graceLeft }) {
  const initialRef = useRef(n);
  if (n > initialRef.current) initialRef.current = n;
  const pct = initialRef.current > 0 ? (n / initialRef.current) * 100 : 0;
  const urgent = n <= 5;

  return (
    <div className="grain relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <button onClick={onLeave} className="t-label absolute left-5 top-6 text-bone-4 hover:text-flare sm:left-8">
        ← quitter
      </button>
      <div className="absolute right-5 top-6 sm:right-8">{muteButton}</div>

      {/* Bannière déconnexion adversaire pendant le countdown */}
      {disconnected && (
        <div className="absolute top-16 left-0 right-0 flex items-center justify-center gap-2 bg-ink-2/90 py-2 px-4">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-danger" />
          <p className="t-body text-sm text-bone-3">
            Adversaire déconnecté{graceLeft > 0 ? ` — annulation dans ${graceLeft}s` : " — annulation…"}
          </p>
        </div>
      )}

      {/* Titre dynamique */}
      <Label tone="flare" className="mb-3 tracking-widest uppercase text-sm">
        {disconnected ? "Adversaire déconnecté" : n > 0 ? "Duel accepté · prépare-toi" : "C'est parti !"}
      </Label>

      {/* Adversaire */}
      {opponent && (
        <h2 className="t-display mb-1 text-[clamp(1.8rem,6vw,3rem)]">
          contre {opponent.username}
        </h2>
      )}
      {!tournament && stakeCoins > 0 && (
        <p className="t-body mb-6 text-bone-4 text-sm">
          mise · {stakeCoins.toLocaleString("fr-FR")} F
        </p>
      )}

      {/* Grand chiffre — grisé si l'adversaire est déconnecté */}
      <span
        key={n}
        className={`anim-slam t-display leading-none ${disconnected ? "text-bone-4" : n > 0 ? (urgent ? "text-danger" : "text-flare") : "text-flare"} text-[clamp(6rem,28vw,14rem)]`}
      >
        {n > 0 ? n : "GO !"}
      </span>

      {/* Barre de progression */}
      {n > 0 && (
        <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-ink-3 sm:w-64">
          <div
            className="h-full rounded-full bg-flare transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Waiting({ onLeave, muteButton }) {
  return (
    <div className="grain relative flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <button onClick={onLeave} className="t-label absolute left-5 top-6 text-bone-4 hover:text-flare sm:left-8">
        ← quitter
      </button>
      <div className="absolute right-5 top-6 sm:right-8">{muteButton}</div>
      <Label tone="flare" className="anim-rise mb-4">
        match de tournoi
      </Label>
      <h1 className="anim-rise-2 t-display text-[clamp(2.2rem,9vw,4rem)]">
        En attente de
        <br />
        l'adversaire…
      </h1>
      <p className="t-body anim-rise-3 mt-5 max-w-xs text-sm text-bone-4">
        Le match démarre dès qu'il ouvre cet écran à son tour. S'il ne se
        présente pas à temps, vous passez au tour suivant par forfait.
      </p>
    </div>
  );
}

/**
 * Écran "Prêt ?" — les deux joueurs voient le nom de l'adversaire et
 * doivent confirmer leur présence avant que le countdown démarre.
 * Le clic est un geste utilisateur garanti → AudioContext se réveille →
 * fanfare jouée à coup sûr, même si l'app était en arrière-plan.
 */
function ReadyScreen({ opponent, stakeCoins, tournament, readyClicked, oppReady, disconnected, graceLeft, muteButton, onReady, onLeave }) {
  return (
    <div className="grain relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <button onClick={onLeave} className="t-label absolute left-5 top-6 text-bone-4 hover:text-flare sm:left-8">
        ← quitter
      </button>
      <div className="absolute right-5 top-6 sm:right-8">{muteButton}</div>

      {/* Bannière déconnexion adversaire pendant l'attente */}
      {disconnected && (
        <div className="absolute top-16 left-0 right-0 flex items-center justify-center gap-2 bg-ink-2/90 py-2 px-4">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-danger" />
          <p className="t-body text-sm text-bone-3">
            Adversaire déconnecté{graceLeft > 0 ? ` — annulation dans ${graceLeft}s` : " — annulation…"}
          </p>
        </div>
      )}

      {/* Étiquette du mode */}
      <Label tone="flare" className="mb-4 text-xs uppercase tracking-widest">
        {tournament ? "match de tournoi" : "duel en ligne"}
      </Label>

      {/* Identité de l'adversaire */}
      {opponent && (
        <h2 className="t-display mb-1 text-[clamp(1.8rem,7vw,3.2rem)]">
          contre <span className="text-flare">{opponent.username}</span>
        </h2>
      )}
      {!tournament && stakeCoins > 0 && (
        <p className="t-body mb-8 text-sm text-bone-4">
          mise · {stakeCoins.toLocaleString("fr-FR")} F
        </p>
      )}
      {tournament && <div className="mb-8" />}

      {/* Bouton Prêt ou état d'attente */}
      {!readyClicked ? (
        <Block
          size="lg"
          onClick={onReady}
          className="min-w-[200px] text-xl"
          disabled={disconnected}
        >
          Prêt !
        </Block>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 text-flare">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-flare" />
            <span className="t-label text-sm">Vous êtes prêt</span>
          </div>
          {oppReady ? (
            <p className="t-body text-sm text-live">L'adversaire est prêt · démarrage…</p>
          ) : (
            <p className="t-body text-sm text-bone-4">
              En attente de {opponent?.username ?? "l'adversaire"}…
            </p>
          )}
        </div>
      )}

      {/* Indicateur statut adversaire (quand on n'a pas encore cliqué) */}
      {!readyClicked && oppReady && (
        <p className="t-body mt-4 text-sm text-live">
          {opponent?.username ?? "L'adversaire"} est prêt — en attente de vous !
        </p>
      )}
    </div>
  );
}

/**
 * Overlay "reconnexion en cours" — s'affiche par-dessus n'importe quelle
 * phase quand c'est le joueur COURANT qui a perdu sa connexion (WebSocket
 * fermé côté client). Disparaît automatiquement dès que le socket est
 * rouvert et que `attachSocket` remet en place l'état du match.
 */
function ReconnectingOverlay() {
  return (
    <div className="fixed inset-0 z-[10001] flex flex-col items-center justify-center bg-ink/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-2.5 w-2.5 animate-bounce rounded-full bg-flare"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="t-display text-2xl">Reconnexion…</p>
        <p className="t-body text-sm text-bone-4">
          Connexion perdue — retour automatique dans quelques secondes.
        </p>
      </div>
    </div>
  );
}
