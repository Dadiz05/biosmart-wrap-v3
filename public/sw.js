const CACHE_NAME = "biosmart-wrap-v5";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/pwa-logo.png",
  "/brand/logo.png",
  "/qr/metadata.json",
  "/qr/fresh.svg",
  "/qr/degraded.svg",
  "/qr/spoiled.svg",
  "/qr/critical.svg",
];

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isAssetRequest(request) {
  const url = new URL(request.url);
  return (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font" ||
    /\.(?:css|js|mjs|png|jpe?g|svg|webp|ico|woff2?)$/i.test(url.pathname)
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && isSameOrigin(request)) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && isSameOrigin(request)) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("network-first failed");
  }
}

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

  self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

    if (!isSameOrigin(request)) {
      return;
    }

    if (request.url.includes("/api/")) {
      return;
    }

    event.respondWith(
      (async () => {
        if (request.mode === "navigate") {
          try {
            return await networkFirst(request);
          } catch {
            return (await caches.match("/offline.html")) || (await caches.match("/")) || Response.error();
          }
        }

        if (isAssetRequest(request)) {
          try {
            return await cacheFirst(request);
          } catch {
            return (await caches.match(request)) || Response.error();
          }
        }

        try {
          return await networkFirst(request);
        } catch {
          return (await caches.match(request)) || Response.error();
        }
      })()
    );
});