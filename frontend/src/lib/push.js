import * as api from "./api";

/**
 * Notifications push navigateur (défi reçu, résultat de duel...). Un seul
 * point d'entrée pour toute l'app — voir components/MobileProfileMenu.jsx
 * et Profile.jsx pour le bouton d'activation.
 *
 * Nécessite un contexte sécurisé (HTTPS) : disponible depuis que
 * quizarenaworld.com sert le site en HTTPS. Sur iPhone, Safari n'active
 * le Web Push que si le site a été ajouté à l'écran d'accueil (iOS 16.4+),
 * jamais depuis un onglet Safari classique — limite d'Apple, pas un bug ici.
 */
export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function getPermission() {
  return isPushSupported() ? Notification.permission : "unsupported"; // "default" | "granted" | "denied"
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

let swRegistration = null;
async function getRegistration() {
  if (!isPushSupported()) return null;
  if (!swRegistration) swRegistration = await navigator.serviceWorker.register("/sw.js");
  return swRegistration;
}

/** État actuel : abonné sur CE navigateur ou non (indépendant de la
 * permission — on peut avoir la permission "granted" mais s'être
 * désabonné explicitement). */
export async function getSubscription() {
  const registration = await getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/** Demande la permission (si besoin) puis abonne ce navigateur et
 * enregistre l'abonnement côté serveur. Idempotent : rappeler sans effet
 * si déjà abonné. */
export async function subscribe() {
  if (!isPushSupported()) throw new Error("Notifications non supportées sur ce navigateur");

  const registration = await getRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await api.subscribePush(existing.toJSON());
    return existing;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permission refusée");

  const { publicKey } = await api.getVapidPublicKey();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  await api.subscribePush(subscription.toJSON());
  return subscription;
}

export async function unsubscribe() {
  const subscription = await getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.unsubscribePush(endpoint).catch(() => {}); // best effort : déjà désabonné localement de toute façon
}
