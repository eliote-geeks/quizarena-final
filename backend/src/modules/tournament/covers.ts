import { existsSync, readFileSync } from "fs";

export const TOURNAMENT_COVER_IMAGES = [
  "/tournaments/championship.webp",
  "/tournaments/versus.webp",
  "/tournaments/africa.webp",
] as const;

export const DEFAULT_TOURNAMENT_COVER = TOURNAMENT_COVER_IMAGES[0];
export const isTournamentCover = (value: unknown): value is string =>
  typeof value === "string" && (
    (TOURNAMENT_COVER_IMAGES as readonly string[]).includes(value)
    // Photo importée par le créateur (§modules/uploads/routes.ts, 31/08) :
    // sans ce cas, la liste/le détail de tournoi la remplaçait
    // silencieusement par une couverture par défaut à chaque lecture,
    // alors qu'elle est bien enregistrée en base (§tournament/routes.ts
    // POST /api/tournaments, même préfixe vérifié à l'écriture).
    || value.startsWith("/api/uploads/tournament-covers/")
  );

const SETTINGS_PATH = new URL("../../../../settings.json", import.meta.url).pathname;

export function configuredTournamentCover() {
  if (!existsSync(SETTINGS_PATH)) return DEFAULT_TOURNAMENT_COVER;
  try {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
    return isTournamentCover(settings.defaultTournamentCover)
      ? settings.defaultTournamentCover
      : DEFAULT_TOURNAMENT_COVER;
  } catch {
    return DEFAULT_TOURNAMENT_COVER;
  }
}
