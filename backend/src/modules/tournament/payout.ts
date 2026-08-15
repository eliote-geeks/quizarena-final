// Répartition des gains de tournoi — même rake que le duel PvP (10%,
// §quiz/payout.ts DUEL_WIN_HOUSE_CUT) : 90% du pot total collecté aux
// inscriptions est redistribué, jamais plus. Le pot est un nombre
// d'entiers réels débités (Transaction STAKE à l'inscription) : arrondir
// par défaut (Math.floor) garantit que la somme distribuée ne dépasse
// JAMAIS ce qui a été collecté — l'arrondi perdu reste simplement la
// commission de la maison, comme pour duelWinnerPayout.

export const TOURNAMENT_CAPACITIES = [4, 8, 16] as const;
export type TournamentCapacity = (typeof TOURNAMENT_CAPACITIES)[number];

export function isTournamentCapacity(n: number): n is TournamentCapacity {
  return (TOURNAMENT_CAPACITIES as readonly number[]).includes(n);
}

export function tournamentShares(potCoins: number) {
  return {
    first: Math.floor(potCoins * 0.54), // vainqueur : 60% des 90% redistribués
    second: Math.floor(potCoins * 0.225), // finaliste : 25%
    semiEach: Math.floor(potCoins * 0.0675), // les 2 demi-finalistes : 7.5% chacun
  };
}
