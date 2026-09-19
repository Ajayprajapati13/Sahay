// Sahay Service Worker - caching core assets for offline reliability
const CACHE_NAME = "sahay-cache-v5";
const ASSETS = [
  "/",
  "/css/sahay-theme.css",
  "/css/animations.css",
  "/js/safe-html.js",
  "/js/photo-capture.js",
  "/js/map-view.js",
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
    // cache: "reload" so a fresh deploy is never cached from a stale HTTP-cache copy
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: "reload" })))).catch(() => {})
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

// Network first, so a new deploy is never hidden behind old cached files; the cache is only the offline fallback.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  const revalidate = e.request.mode === "navigate" ? undefined : { cache: "no-cache" };
  e.respondWith(
    fetch(e.request, revalidate)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match("/")))
  );
});
