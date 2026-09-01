export const TOURNAMENT_COVERS = [
  { id: "championship", src: "/tournaments/championship.webp", label: "Championnat" },
  { id: "versus", src: "/tournaments/versus.webp", label: "Face-à-face" },
  { id: "africa", src: "/tournaments/africa.webp", label: "Afrique" },
];

export const DEFAULT_TOURNAMENT_COVER = TOURNAMENT_COVERS[0].src;

export function tournamentCover(tournament) {
  // Photo importée par le créateur (§pages/TournamentCreate.jsx, backend
  // modules/uploads) — servie directement par l'API, pas dans la liste
  // curatée ci-dessous.
  if (tournament?.coverImage?.startsWith("/api/uploads/tournament-covers/")) return tournament.coverImage;
  const selected = TOURNAMENT_COVERS.find((cover) => cover.src === tournament?.coverImage);
  if (selected) return selected.src;
  const category = `${tournament?.categoryId || ""} ${tournament?.categoryName || ""}`.toLowerCase();
  if (category.includes("afrique") || category.includes("africa")) return "/tournaments/africa.webp";
  const seed = String(tournament?.id || tournament?.name || "arena");
  const score = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return TOURNAMENT_COVERS[score % TOURNAMENT_COVERS.length].src;
}
