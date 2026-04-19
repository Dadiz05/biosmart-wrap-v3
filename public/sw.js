const CACHE_NAME = "biosmart-wrap-v1";
const PRECACHE_URLS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return Promise.resolve();
        })
      );
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const res = await fetch(request);
        const url = new URL(request.url);
        // cache same-origin navigation/assets; never cache API (avoids stale / wrong scan results)
        if (url.origin === self.location.origin && !url.pathname.startsWith("/api/")) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, res.clone()).catch(() => {});
        }
        return res;
      } catch (err) {
        // offline fallback for navigations
        if (request.mode === "navigate") {
          return (await caches.match("/")) || Response.error();
        }
        throw err;
      }
    })()
  );
});