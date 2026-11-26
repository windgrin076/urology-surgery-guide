const CACHE_NAME = "urology-guide-v8";
const ROOT_URL = new URL("./", self.registration.scope).href;
const INDEX_URL = new URL("./index.html", self.registration.scope).href;
const APP_SHELL = [
  ROOT_URL,
  INDEX_URL,
  new URL("./manifest.webmanifest", self.registration.scope).href,
  new URL("./icon-192.png", self.registration.scope).href,
  new URL("./icon-512.png", self.registration.scope).href,
  new URL("./og.png", self.registration.scope).href
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => undefined)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(INDEX_URL, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(event.request, { ignoreSearch: true })) ||
            (await cache.match(INDEX_URL)) ||
            (await cache.match(ROOT_URL));
          return (
            cached ||
            new Response(
              "<!doctype html><meta charset='utf-8'><title>暂时无法打开</title><main style='font-family:system-ui;padding:32px;line-height:1.7'><h1>暂时无法打开网页</h1><p>当前网络无法连接 GitHub Pages，且本机尚无可用离线缓存。请切换网络后刷新一次。</p></main>",
              {
                status: 503,
                headers: { "Content-Type": "text/html; charset=utf-8" }
              }
            )
          );
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return new Response("", { status: 504, statusText: "Offline" });
      }
    })()
  );
});
