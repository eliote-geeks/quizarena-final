import { prisma } from "../../lib/prisma.js";

export const VIP_WIN_TARGET = 30;
export const VIP_WINDOW_DAYS = 30;

export type VipSource = "ADMIN" | "PERFORMANCE" | null;

/** Fonction pure partagée par l'API et testable sans base de données. */
export function resolveVipStatus(vipGrantedAt: Date | null, duelsWon30d: number, isAdmin = false) {
  const source: VipSource = vipGrantedAt
    ? "ADMIN"
    : duelsWon30d >= VIP_WIN_TARGET
      ? "PERFORMANCE"
      : null;

  return {
    isVip: source !== null,
    source,
    grantedAt: vipGrantedAt,
    duelsWon30d,
    targetWins: VIP_WIN_TARGET,
    remainingWins: Math.max(0, VIP_WIN_TARGET - duelsWon30d),
    // L'administrateur conserve son droit opérationnel de créer les
    // tournois même s'il n'a pas besoin d'un badge VIP personnel.
    canCreateTournament: source !== null || isAdmin,
  };
}

export async function getVipStatus(userId: string) {
  const since = new Date(Date.now() - VIP_WINDOW_DAYS * 24 * 60 * 60_000);
  const [user, duelsWon30d] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { vipGrantedAt: true, isAdmin: true },
    }),
    prisma.duelMatch.count({
      where: { winnerId: userId, status: "COMPLETED", completedAt: { gte: since } },
    }),
  ]);

  if (!user) return null;
  return resolveVipStatus(user.vipGrantedAt, duelsWon30d, user.isAdmin);
}
