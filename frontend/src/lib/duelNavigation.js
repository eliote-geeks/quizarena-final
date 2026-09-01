import * as duel from "./duelSocket";

export const DUEL_EXIT_GUARD_EVENT = "quizarena:duel-exit-request";

/** Exécute une navigation immédiatement, sauf lorsqu'une mise est encore
 * engagée dans un duel. Dans ce cas le garde global affiche la confirmation. */
export function runWithDuelExitGuard(action, destination = "cette page") {
  if (!duel.hasActiveDuel() || typeof window === "undefined") {
    action();
    return;
  }
  window.dispatchEvent(new CustomEvent(DUEL_EXIT_GUARD_EVENT, {
    detail: { action, destination },
  }));
}
