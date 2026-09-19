// Sahay Service Worker - caching core assets for offline reliability
const CACHE_NAME = "sahay-cache-v2";
const ASSETS = [
  "/",
  "/css/sahay-theme.css",
  "/css/animations.css",
  "/js/safe-html.js",
  "/js/i18n.js",
  "/js/sample-data.js",
  "/js/voice-engine.js",
  "/js/scam-guard.js",
  "/js/journey-bank.js",
  "/js/journey-transport.js",
  "/js/journey-health.js",
  "/js/family-portal.js",
  "/js/app.js",
  "/kiosk"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => cached))
  );
});
