import { prisma } from "./prisma.js";

/**
 * Une session par connexion — créée à chaque login/inscription, son id
 * embarqué dans le JWT (§modules/auth/routes.ts) permet de révoquer UNE
 * session précise (déconnexion à distance depuis Profil) sans toucher
 * aux autres appareils connectés avec le même compte.
 */
export async function createSession(userId: string, userAgent: string | undefined, ipAddress: string | undefined) {
  return prisma.loginSession.create({
    data: { userId, userAgent: userAgent?.slice(0, 300), ipAddress },
  });
}

/** Vrai si la session existe encore et n'a pas été révoquée. Appelé à
 * chaque requête authentifiée (§server.ts authenticate) — une seule
 * requête indexée sur la clé primaire, coût négligeable. */
export async function isSessionValid(sessionId: string): Promise<boolean> {
  const session = await prisma.loginSession.findUnique({ where: { id: sessionId }, select: { revokedAt: true } });
  return Boolean(session && !session.revokedAt);
}

/** Best-effort, jamais bloquant : sert juste à afficher "vu il y a..."
 * dans la liste des sessions, une écriture ratée ne doit jamais faire
 * échouer la requête qu'elle accompagne. */
export function touchSession(sessionId: string) {
  prisma.loginSession.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } }).catch(() => {});
}

export async function listSessions(userId: string) {
  return prisma.loginSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
  });
}

export async function revokeSession(userId: string, sessionId: string) {
  await prisma.loginSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
