import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Réglages plateforme modifiables depuis le dashboard admin (blocage
// dépôts/retraits, maintenance, couverture de tournoi par défaut) —
// stockage simple en fichier JSON, pas de table dédiée pour si peu de
// champs. Partagé entre §modules/admin/routes.ts (lecture/écriture) et
// §modules/wallet/routes.ts (lecture seule, pour appliquer le blocage —
// avant le 31/08 le toggle admin existait mais n'était vérifié nulle
// part : "activer/désactiver" ne faisait rien en pratique).
export type PlatformSettings = {
  blockDeposits?: boolean;
  blockWithdrawals?: boolean;
  maintenance?: boolean;
  maintenanceMessage?: string;
  defaultTournamentCover?: string;
};

export const SETTINGS_PATH = new URL("../../../settings.json", import.meta.url).pathname;

export function loadSettings(): PlatformSettings {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
  } catch {
    return {};
  }
}

export function saveSettings(patch: PlatformSettings): PlatformSettings {
  const next = { ...loadSettings(), ...patch };
  writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2));
  return next;
}
