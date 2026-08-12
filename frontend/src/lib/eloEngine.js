const K = 32;

export function calcNewElo(myElo, oppElo, result) {
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  const score = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  const delta = Math.round(K * (score - expected));
  return { newElo: Math.max(100, myElo + delta), delta };
}

export const RANKS = [
  { min: 0,    name: "Recrue",  color: "#9aa0a6", emoji: "" },
  { min: 800,  name: "Soldat",  color: "#5DD66E", emoji: "" },
  { min: 1000, name: "Vétéran", color: "#60a5fa", emoji: "" },
  { min: 1200, name: "Expert",  color: "#c084fc", emoji: "" },
  { min: 1500, name: "Maître",  color: "#E5A800", emoji: "" },
  { min: 1800, name: "Légende", color: "#ff6b6b", emoji: "" },
];

export function getRank(elo) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (elo >= r.min) rank = r;
  }
  return rank;
}
