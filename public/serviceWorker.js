const CACHE = "perfecthealth-cache-v7";
const APP_SHELL = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "icons/icon.png",

  "src/main.js",
  "src/core/router.js",
  "src/core/store.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          caches.open(CACHE).then(async (c) => {
            try {
              const idx = await fetch("index.html", { cache: "no-store" });
              if (idx.ok && idx.type === "basic")
                c.put("index.html", idx.clone());
            } catch (_) {}
          });
          return res;
        } catch {
          const cached = await caches.match("index.html");
          return (
            cached ||
            new Response("<h1>Offline</h1>", {
              headers: { "Content-Type": "text/html" },
            })
          );
        }
      })()
    );
    return;
  }

  if (req.url.includes("/src/") || req.destination === "style") {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          })
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
