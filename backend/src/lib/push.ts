import webpush from "web-push";
import { prisma } from "./prisma.js";
import { env } from "./env.js";

/**
 * Notifications push navigateur — défi reçu, résultat de duel. Pour les
 * événements de compte (vérification, retrait), voir §lib/mailer.ts à la
 * place : c'est le e-mail qui couvre ça, pas le push.
 *
 * Sans clés VAPID configurées (avant que ce soit fait, ou en dev local),
 * on ne fait rien plutôt que de faire planter l'appelant — même principe
 * que mailer.ts.
 */
const configured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
}

export function vapidPublicKey() {
  return env.VAPID_PUBLIC_KEY ?? null;
}

type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Envoie à TOUS les navigateurs abonnés de ce joueur. Un abonnement mort
 * (410 Gone / 404, l'utilisateur a désinstallé ou révoqué la permission)
 * est retiré silencieusement — jamais d'erreur remontée à l'appelant pour
 * un problème d'abonnement d'un tiers. */
export async function sendPush(userId: string, payload: PushPayload) {
  if (!configured) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          // eslint-disable-next-line no-console
          console.warn("[push] envoi échoué :", err?.statusCode, err?.message);
        }
      }
    })
  );
}
