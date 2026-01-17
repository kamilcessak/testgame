const CACHE = "perfecthealth-cache-v9";
// Lista podstawowych zasobów aplikacji do cache'owania przy instalacji
const APP_SHELL = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "icons/icon.png",

  "src/main.js",
  "src/core/router.js",
  "src/core/store.js",
];

// Instalacja Service Workera - cache'uje podstawowe zasoby aplikacji
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
});

// Aktywacja Service Workera - usuwa stare cache'e
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

// Obsługa żądań sieciowych
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Zewnętrzne API - nie cache'ujemy (zawsze z sieci)
  if (url.origin !== location.origin) {
    if (url.hostname.includes("nominatim.openstreetmap.org")) {
      e.respondWith(fetch(req));
      return;
    }
    // Inne zewnętrzne zasoby - Network First
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // HTML (nawigacja) - Network First z fallback do cache
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
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

  // Statyczne zasoby (JS, CSS) - Cache First (najpierw cache, potem sieć)
  if (
    req.url.includes("/src/") ||
    req.destination === "script" ||
    req.destination === "style"
  ) {
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Obrazy - Cache First z fallback
  if (req.destination === "image") {
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;

        return fetch(req)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => {
            return cached || new Response("", { status: 404 });
          });
      })
    );
    return;
  }

  // Inne zasoby - Network First z fallback do cache
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
