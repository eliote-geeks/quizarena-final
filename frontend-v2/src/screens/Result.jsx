import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Block, Label, Money, Stat } from "../ui";
import { useCountUp } from "../lib/useCountUp";

/**
 * Écran de fin de duel réel — tout vient de l'événement "duel_result" du
 * serveur (Duel.jsx le transmet tel quel via l'état de navigation). Rien
 * n'est recalculé côté client : le serveur a déjà débité/crédité avant
 * même que cet écran s'affiche.
 */
export default function Result() {
  const nav = useNavigate();
  const { state } = useLocation();
  // Tous les hooks avant tout retour anticipé (règle des hooks) : même
  // sans état de duel valide, useCountUp doit s'exécuter à chaque rendu.
  const balance = useCountUp(state?.balanceCoins ?? 0, 900);

  if (!state?.duel) {
    // Arrivé ici sans venir d'un vrai duel (rechargement de page, lien
    // direct...) : rien à montrer, retour au lobby.
    return <NoResult onBack={() => nav("/")} />;
  }

  const {
    result, // "win" | "draw" | "loss"
    forfeit, // null | "you" | "opponent"
    scoreYou,
    scoreOpponent,
    payoutCoins,
    opponentName = "l'adversaire",
    stake = 0,
    tournament, // { matchId, id } si ce résultat vient d'un match de tournoi
  } = state;

  const won = result === "win";
  const draw = result === "draw";
  const net = payoutCoins - stake;

  if (tournament) {
    return (
      <div className="grain mx-auto flex min-h-dvh w-full max-w-[1100px] flex-col px-5 pb-14 sm:px-8">
        <header className="rule-flare border-t-0 pt-5 pb-4">
          <span className="t-display text-xl text-flare">QUIZARENA</span>
        </header>

        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="anim-rise">
            <Label tone={won ? "live" : "dim"} className="mb-3">
              {won ? "vous avancez au tour suivant" : "éliminé du tournoi"}
              {forfeit === "opponent" && " · adversaire a abandonné"}
            </Label>

            <h1
              className={clsx(
                "t-display text-[clamp(3rem,12vw,7rem)]",
                won ? "text-live" : draw ? "text-bone" : "text-bone-3"
              )}
            >
              {won ? "Gagné" : draw ? "Égalité" : "Perdu"}
            </h1>

            <div className="mt-8 flex items-end gap-5">
              <span className="t-display text-6xl">{scoreYou}</span>
              <span className="t-display pb-2 text-2xl text-flare">—</span>
              <span className="t-display pb-0 text-6xl text-bone-3">{scoreOpponent}</span>
              <span className="t-label pb-3 pl-2 text-bone-4">contre {opponentName}</span>
            </div>
          </div>
        </div>

        <p className="anim-rise-3 t-body max-w-sm text-sm text-bone-4">
          {won
            ? "Les gains du tournoi ne sont distribués qu'à la fin, une fois le vainqueur connu."
            : "Le droit d'entrée n'est remboursé que si le tournoi est annulé avant votre premier match."}
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Block size="lg" full onClick={() => nav(`/tournaments/${tournament.id}`)}>
            Retour au tournoi
          </Block>
        </div>
      </div>
    );
  }

  return (
    <div className="grain mx-auto flex min-h-dvh w-full max-w-[1100px] flex-col px-5 pb-14 sm:px-8">
      <header className="rule-flare border-t-0 pt-5 pb-4">
        <span className="t-display text-xl text-flare">QUIZARENA</span>
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        <div className="anim-rise">
          <Label tone={won ? "live" : "dim"} className="mb-3">
            {won ? "vous remportez la mise" : draw ? "mise rendue" : "mise perdue"}
            {forfeit === "opponent" && " · adversaire a abandonné"}
          </Label>

          <h1
            className={clsx(
              "t-display text-[clamp(3rem,12vw,7rem)]",
              won ? "text-live" : draw ? "text-bone" : "text-bone-3"
            )}
          >
            {won ? "Gagné" : draw ? "Égalité" : "Perdu"}
          </h1>

          <div className="mt-8 flex items-end gap-5">
            <span className="t-display text-6xl">{scoreYou}</span>
            <span className="t-display pb-2 text-2xl text-flare">—</span>
            <span className="t-display pb-0 text-6xl text-bone-3">{scoreOpponent}</span>
            <span className="t-label pb-3 pl-2 text-bone-4">contre {opponentName}</span>
          </div>
        </div>
      </div>

      <section className="anim-rise-3 rule grid grid-cols-2 gap-y-8 pt-7 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>{net >= 0 ? "gain" : "perte"}</Label>
          <Money value={Math.abs(net)} size="lg" tone={won ? "live" : draw ? "dim" : "flare"} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>nouveau solde</Label>
          <Money value={balance} size="lg" />
        </div>

        <Stat label="bonnes réponses" value={`${scoreYou}/10`} tone="dim" />
      </section>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Block size="lg" className="sm:flex-1" onClick={() => nav("/duel")}>
          Revanche · {stake.toLocaleString("fr-FR")} F
        </Block>
        <Block tone="outline" size="lg" onClick={() => nav("/")}>
          Retour au lobby
        </Block>
      </div>
    </div>
  );
}

function NoResult({ onBack }) {
  return (
    <div className="grain flex min-h-dvh flex-col items-center justify-center gap-5 px-5 text-center">
      <Label>Aucun résultat à afficher</Label>
      <Block onClick={onBack}>Retour au lobby</Block>
    </div>
  );
}
