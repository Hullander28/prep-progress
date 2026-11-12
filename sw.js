/* Prep & Progress service worker — cache-first app shell for offline use. */
const VERSION = "pp-v5-2026-11-12-brands";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/calc.js",
  "./js/achievements.js",
  "./js/config.js",
  "./js/sync.js",
  "./js/catalog.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./data/foods.json",
  "./data/restaurants.json",
  "./data/grocery.json",
  "./data/import-template.csv",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && (url.pathname.endsWith(".json") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.endsWith(".png") || url.pathname.endsWith(".webmanifest") || url.pathname.endsWith(".html") || url.pathname.endsWith("/"))) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
