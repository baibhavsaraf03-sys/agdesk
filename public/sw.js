/*
 * Ledge Desk app worker.
 *
 * Two jobs. Alerts: show a notification when the checker sends one, and open
 * the right screen when it is tapped. Offline: keep one small page and show
 * it when opening the desk fails for want of a connection. It caches nothing
 * else and leaves every other request alone, so the desk is always live.
 * Bump OFFLINE_CACHE when offline.html or the icon changes.
 */

const OFFLINE_CACHE = "ledge-offline-v1";
const OFFLINE_URLS = ["/offline.html", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((c) => c.addAll(OFFLINE_URLS)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== OFFLINE_CACHE) await caches.delete(k);
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname === "/icon.svg") {
    event.respondWith(fetch(req).catch(() => caches.match("/icon.svg")));
    return;
  }
  if (req.mode !== "navigate") return;
  event.respondWith(
    fetch(req).catch(async () => (await caches.match("/offline.html")) || Response.error())
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Ledge Desk", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Ledge Desk alert";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/#ALR" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/#ALR", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          if ("navigate" in w) return w.navigate(target);
          return;
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});
