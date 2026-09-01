/* Service worker QuizArena — uniquement le Web Push (pas de cache d'assets,
 * pas de mode hors-ligne : ce n'est pas le rôle demandé ici). Fichier servi
 * à la racine (scope /) pour pouvoir recevoir les push de tout le site. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "QuizArena", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "QuizArena";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || undefined, // même tag = remplace la notif précédente au lieu d'empiler (ex: countdown de duel)
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notif : ramène au premier onglet QuizArena déjà ouvert plutôt
// que d'en empiler un nouveau, sinon en ouvre un sur l'URL ciblée.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.postMessage({ type: "push_navigate", url: targetUrl });
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
