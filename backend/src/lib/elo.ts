// Port fidèle de frontend/src/lib/eloEngine.js — même formule des deux
// côtés pour que les gains ELO affichés côté client correspondent
// exactement à ce que le serveur calcule (le serveur reste la source
// de vérité ; le client ne fait qu'anticiper visuellement).

const K = 32;

export type EloResult = { newElo: number; delta: number };

export function calcNewElo(myElo: number, oppElo: number, result: "win" | "draw" | "loss"): EloResult {
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  const score = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  const delta = Math.round(K * (score - expected));
  return { newElo: Math.max(100, myElo + delta), delta };
}

export const RANKS = [
  { min: 0, name: "Recrue" },
  { min: 800, name: "Soldat" },
  { min: 1000, name: "Vétéran" },
  { min: 1200, name: "Expert" },
  { min: 1500, name: "Maître" },
  { min: 1800, name: "Légende" },
] as const;

export function getRank(elo: number) {
  let rank: (typeof RANKS)[number] = RANKS[0];
  for (const r of RANKS) if (elo >= r.min) rank = r;
  return rank;
}
