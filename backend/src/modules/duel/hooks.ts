// Pont entre duel/engine.ts (moteur générique de duel temps réel) et
// tournament/engine.ts (bracket) sans dépendance circulaire directe :
// le moteur de duel ne sait rien des tournois, il se contente d'annoncer
// "ce match lié à tel TournamentMatch est terminé, voici le vainqueur"
// via ce registre. tournament/index.ts branche le vrai handler au
// démarrage du serveur (voir server.ts).

export type TournamentMatchDoneHandler = (tournamentMatchId: string, winnerId: string | null) => Promise<void>;

let handler: TournamentMatchDoneHandler | null = null;

export function setTournamentMatchDoneHandler(fn: TournamentMatchDoneHandler) {
  handler = fn;
}

export async function notifyTournamentMatchDone(tournamentMatchId: string, winnerId: string | null) {
  if (handler) await handler(tournamentMatchId, winnerId);
}
