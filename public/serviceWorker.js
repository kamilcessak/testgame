/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: serviceWorker.js                                                      ║
 * ║  CO ROBI: "Pracownik w tle" - obsługa cache i trybu offline                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST SERVICE WORKER?
 * - To skrypt JavaScript który działa W TLE przeglądarki
 * - Działa nawet gdy strona jest zamknięta
 * - Przechwytuje WSZYSTKIE requesty sieciowe i może je modyfikować
 * - Pozwala na działanie aplikacji OFFLINE (bo może serwować pliki z cache)
 * 
 * CYKL ŻYCIA SERVICE WORKERA:
 * 1. INSTALL - przeglądarka pobiera i instaluje SW (raz)
 * 2. ACTIVATE - SW przejmuje kontrolę nad stroną
 * 3. FETCH - SW przechwytuje każdy request
 * 
 * STRATEGIE CACHE:
 * - "Cache First" - najpierw szukaj w cache, jak nie ma to sieć
 * - "Network First" - najpierw sieć, jak nie ma to cache (dla nawigacji)
 * 
 * WAŻNE POJĘCIA:
 * - Cache API - przeglądarka może przechowywać odpowiedzi HTTP
 * - Request/Response - obiekty reprezentujące żądanie i odpowiedź HTTP
 * - self - w SW to odpowiednik "window" (globalny obiekt)
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STAŁE KONFIGURACYJNE
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Nazwa cache - ZMIEŃ WERSJĘ gdy zmieniasz pliki
 * 
 * Dlaczego wersja?
 * - Przeglądarka cachuje agresywnie
 * - Zmiana nazwy (v17 → v18) powoduje usunięcie starego cache
 * - Bez tego użytkownicy mogliby mieć stare pliki
 */
const CACHE = "perfecthealth-cache-v18";

/**
 * Lista plików do zapisania w cache podczas instalacji
 * 
 * Te pliki są WYMAGANE do działania aplikacji offline:
 * - HTML (szkielet strony)
 * - CSS (wygląd)
 * - JS (logika)
 * - Ikony (PWA)
 * - Manifest (konfiguracja PWA)
 * 
 * UWAGA: Ścieżki są względne do lokalizacji Service Workera
 * "./" = folder w którym jest ten plik
 */
const APP_SHELL_PATHS = [
  "./",  // Root URL - ważne dla nawigacji offline (http://localhost:8001/)
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  
  // Główne pliki JS
  "./src/main.js",
  "./src/constants.js",
  
  // Core (rdzeń aplikacji)
  "./src/core/router.js",
  "./src/core/database.js",
  "./src/core/store.js",
  
  // Utils (narzędzia pomocnicze)
  "./src/utils/error.js",
  "./src/utils/debounce.js",
  "./src/utils/file.js",
  "./src/utils/image.js",
  "./src/utils/rateLimit.js",
  "./src/utils/uuid.js",
  "./src/utils/validation.js",
  
  // Feature: Dashboard
  "./src/features/dashboard/routes.js",
  "./src/features/dashboard/view.js",
  "./src/features/dashboard/controller.js",
  
  // Feature: Measurements (pomiary)
  "./src/features/measurements/routes.js",
  "./src/features/measurements/view.js",
  "./src/features/measurements/controller.js",
  "./src/features/measurements/model.js",
  "./src/features/measurements/repo.js",
  
  // Feature: Meals (posiłki)
  "./src/features/meals/routes.js",
  "./src/features/meals/view.js",
  "./src/features/meals/controller.js",
  "./src/features/meals/model.js",
  "./src/features/meals/repo.js",
];

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FUNKCJE POMOCNICZE
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Zwraca bazowy URL aplikacji
 * 
 * PRZYKŁAD:
 * Jeśli SW jest na http://localhost:8001/serviceWorker.js
 * to getBaseUrl() zwróci "http://localhost:8001/"
 * 
 * @returns {string} Bazowy URL (np. "http://localhost:8001/")
 */
const getBaseUrl = () => new URL("./", self.location.href).href;

/**
 * Zamienia localhost ↔ 127.0.0.1 w URL
 * 
 * DLACZEGO TO POTRZEBNE?
 * - localhost i 127.0.0.1 to TO SAMO (twój komputer)
 * - ALE przeglądarka traktuje je jako RÓŻNE origin
 * - Jeśli zapisałeś cache pod localhost, a otwierasz 127.0.0.1 - nie znajdzie
 * - Ta funkcja pozwala sprawdzić oba warianty
 * 
 * PRZYKŁAD:
 * alternateHostUrl("http://localhost:8001/styles.css")
 * → "http://127.0.0.1:8001/styles.css"
 * 
 * @param {string} urlString - URL do przekształcenia
 * @returns {string|null} URL z zamienionym hostem lub null
 */
function alternateHostUrl(urlString) {
  try {
    const u = new URL(urlString);
    
    // Zamień localhost → 127.0.0.1
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
    }
    // Zamień 127.0.0.1 → localhost
    else if (u.hostname === "127.0.0.1") {
      u.hostname = "localhost";
    }
    // Dla innych hostów - nie rób nic
    else {
      return null;
    }
    
    return u.href;
  } catch {
    // URL nieprawidłowy
    return null;
  }
}

/**
 * Szuka w cache - najpierw oryginalny URL, potem alternatywny host
 * 
 * PRZEPŁYW:
 * 1. Szukaj "http://localhost:8001/styles.css" w cache
 * 2. Jeśli nie ma, szukaj "http://127.0.0.1:8001/styles.css"
 * 3. Zwróć co znajdziesz (lub undefined)
 * 
 * @param {Request|string} request - Request lub URL do znalezienia
 * @param {object} opts - Opcje dla caches.match() (np. ignoreSearch)
 * @returns {Promise<Response|undefined>} Odpowiedź z cache lub undefined
 */
async function matchCacheAnyHost(request, opts = {}) {
  // Najpierw szukaj normalnie
  const cached = await caches.match(request, opts);
  if (cached) return cached;
  
  // Wyciągnij URL (request może być obiektem Request lub stringiem)
  const urlString = typeof request === "string" ? request : request.url;
  
  // Spróbuj z alternatywnym hostem
  const alt = alternateHostUrl(urlString);
  if (alt) {
    return caches.match(alt, opts);
  }
  
  return undefined;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EVENT: INSTALL
 * Wywoływany gdy przeglądarka instaluje Service Worker (pierwszy raz lub po aktualizacji)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
self.addEventListener("install", (e) => {
  console.log("[SW] Installing...");
  
  const baseUrl = getBaseUrl();
  
  /**
   * e.waitUntil() - mówi przeglądarce: "Poczekaj aż to się skończy"
   * Jeśli Promise się rozwiąże - instalacja udana
   * Jeśli Promise się odrzuci - instalacja nieudana, spróbuj ponownie
   */
  e.waitUntil(
    // 1. Otwórz cache (lub stwórz jeśli nie istnieje)
    caches.open(CACHE).then(async (cache) => {
      
      /**
       * Promise.allSettled() - czeka na WSZYSTKIE promisy
       * W przeciwieństwie do Promise.all(), NIE przerywa gdy jeden zawiedzie
       * Dzięki temu jeden nieudany plik nie blokuje całej instalacji
       */
      await Promise.allSettled(
        APP_SHELL_PATHS.map(async (path) => {
          // Przekształć względną ścieżkę na pełny URL
          const url = new URL(path, baseUrl).href;
          
          try {
            /**
             * cache.add(url) - pobiera URL i zapisuje odpowiedź w cache
             * To jest jak: fetch(url).then(res => cache.put(url, res))
             */
            await cache.add(url);
          } catch (err) {
            // Loguj błąd ale nie przerywaj (może plik nie istnieje)
            console.warn("[SW] Failed to cache:", url, err.message);
          }
        })
      );
      
      /**
       * self.skipWaiting() - od razu aktywuj nowego SW
       * 
       * Normalnie nowy SW czeka aż wszystkie karty ze starą wersją
       * zostaną zamknięte. skipWaiting() to pomija.
       * 
       * UWAGA: Może powodować problemy jeśli stary i nowy SW
       * są niekompatybilne. Tutaj to bezpieczne.
       */
      return self.skipWaiting();
    })
  );
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EVENT: ACTIVATE
 * Wywoływany gdy SW jest aktywowany (po instalacji lub gdy poprzedni SW został usunięty)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
self.addEventListener("activate", (e) => {
  console.log("[SW] Activating...");
  
  e.waitUntil(
    caches
      // 1. Pobierz wszystkie nazwy cache
      .keys()
      .then((keys) =>
        /**
         * Usuń STARE cache (inne niż aktualna wersja)
         * 
         * Przykład: mamy cache "perfecthealth-cache-v18"
         * keys = ["perfecthealth-cache-v17", "perfecthealth-cache-v18"]
         * Filtrujemy te które NIE są v18 i je usuwamy
         */
        Promise.all(
          keys
            .filter((k) => k !== CACHE)  // Zachowaj tylko aktualny
            .map((k) => caches.delete(k)) // Usuń stare
        )
      )
      .then(() => {
        /**
         * self.clients.claim() - przejmij kontrolę nad wszystkimi kartami
         * 
         * Normalnie nowy SW kontroluje tylko NOWE karty.
         * claim() sprawia że od razu kontroluje WSZYSTKIE karty
         * (nawet te otwarte przed aktywacją).
         */
        return self.clients.claim();
      })
  );
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EVENT: FETCH
 * Wywoływany dla KAŻDEGO żądania sieciowego (HTTP request)
 * Tu decydujemy: zwrócić z cache? z sieci? z cache jako fallback?
 * ═══════════════════════════════════════════════════════════════════════════════
 */
self.addEventListener("fetch", (e) => {
  try {
    const req = e.request;
    const url = new URL(req.url);

    /**
     * ─────────────────────────────────────────────────────────────────────────
     * PRZYPADEK 1: ZEWNĘTRZNE API (inny origin)
     * ─────────────────────────────────────────────────────────────────────────
     * 
     * url.origin !== location.origin sprawdza czy request idzie do INNEGO serwera
     * np. request do nominatim.openstreetmap.org gdy my jesteśmy na localhost
     */
    if (url.origin !== location.origin) {
      
      /**
       * NOMINATIM API (reverse geocoding - zamiana współrzędnych na adres)
       * 
       * Dla Nominatim:
       * - NIE cache'ujemy (za dużo różnych zapytań)
       * - Gdy offline, zwracamy { error: "offline" } zamiast błędu sieciowego
       * - Status 503 = Service Unavailable
       */
      if (url.hostname.includes("nominatim.openstreetmap.org")) {
        e.respondWith(
          fetch(req).catch(() => 
            new Response(
              JSON.stringify({ error: "offline" }), 
              {
                status: 503,
                headers: { "Content-Type": "application/json" }
              }
            )
          )
        );
        return;
      }
      
      /**
       * INNE ZEWNĘTRZNE ZASOBY - Network First
       * 
       * Strategia:
       * 1. Próbuj pobrać z sieci
       * 2. Jeśli sukces (res.ok), zapisz w cache na przyszłość
       * 3. Jeśli błąd sieci, spróbuj z cache
       */
      e.respondWith(
        fetch(req)
          .then((res) => {
            if (res.ok) {
              // Klonuj odpowiedź bo Response można odczytać tylko RAZ
              const clone = res.clone();
              // Zapisz w cache (asynchronicznie, nie czekamy)
              caches.open(CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => matchCacheAnyHost(req))  // Offline fallback
      );
      return;
    }

    /**
     * ─────────────────────────────────────────────────────────────────────────
     * PRZYPADEK 2: NAWIGACJA (ładowanie strony HTML)
     * ─────────────────────────────────────────────────────────────────────────
     * 
     * req.mode === "navigate" - użytkownik przechodzi na URL (wpisał w pasek, kliknął link)
     * req.destination === "document" - request po dokument HTML
     * 
     * Strategia: Network First (bo chcemy świeży HTML jeśli jest dostępny)
     */
    if (req.mode === "navigate" || req.destination === "document") {
      const baseUrl = new URL("./", self.location.href).href;
      const indexUrl = new URL("index.html", baseUrl).href;
      const rootUrl = baseUrl; // np. "http://localhost:8001/"
      
      e.respondWith(
        (async () => {
          try {
            // 1. Próbuj pobrać z sieci
            const res = await fetch(req);
            
            /**
             * res.type === "basic" - odpowiedź z tego samego origin
             * (nie chcemy cache'ować redirectów ani błędów CORS)
             */
            if (res.ok && res.type === "basic") {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(req, clone));
            }
            return res;
            
          } catch (err) {
            /**
             * OFFLINE - szukaj w cache
             * 
             * Próbujemy po kolei:
             * 1. Dokładny URL (np. /#/measurements)
             * 2. index.html (główna strona)
             * 3. Root URL (/)
             * 
             * ignoreSearch: true - ignoruj ?query parametry
             */
            const cached =
              (await matchCacheAnyHost(req, { ignoreSearch: true })) ||
              (await matchCacheAnyHost(indexUrl)) ||
              (await matchCacheAnyHost(rootUrl));
              
            if (cached) return cached;
            
            /**
             * OSTATECZNY FALLBACK - hardcoded HTML
             * 
             * Jeśli NICZEGO nie ma w cache (co nie powinno się zdarzyć
             * jeśli instalacja przebiegła prawidłowo), zwróć minimalny HTML.
             */
            return new Response(
              "<!DOCTYPE html><html lang=\"pl\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Offline</title></head><body><p>Brak połączenia. Otwórz aplikację ponownie, gdy będziesz online.</p></body></html>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            );
          }
        })()
      );
      return;
    }

    /**
     * ─────────────────────────────────────────────────────────────────────────
     * PRZYPADEK 3: WSZYSTKIE INNE ZASOBY (JS, CSS, obrazy)
     * ─────────────────────────────────────────────────────────────────────────
     * 
     * Strategia: Cache First (bo pliki się rzadko zmieniają)
     * 1. Szukaj w cache
     * 2. Jeśli nie ma, pobierz z sieci i zapisz w cache
     * 3. Jeśli offline i nie ma w cache, zwróć placeholder
     */
    e.respondWith(
      (async () => {
        // 1. Szukaj w cache
        const cached = await matchCacheAnyHost(req);
        if (cached) return cached;
        
        // 2. Nie ma w cache - pobierz z sieci
        try {
          const res = await fetch(req);
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
          
        } catch {
          /**
           * OFFLINE i nie ma w cache
           * 
           * Zwracamy "puste" odpowiedzi odpowiedniego typu
           * żeby przeglądarka nie pokazywała błędów sieciowych
           */
          
          // Może sprawdź cache jeszcze raz (na wszelki wypadek)
          const fallback = await matchCacheAnyHost(req);
          if (fallback) return fallback;
          
          // Placeholder dla JS
          if (req.url.endsWith(".js")) {
            return new Response(
              "// Offline", 
              { status: 504, headers: { "Content-Type": "application/javascript" } }
            );
          }
          
          // Placeholder dla CSS
          if (req.url.endsWith(".css")) {
            return new Response(
              "/* Offline */", 
              { status: 504, headers: { "Content-Type": "text/css" } }
            );
          }
          
          // Dla wszystkiego innego - prosty tekst
          return new Response("Offline", { status: 504 });
        }
      })()
    );
    
  } catch (err) {
    // Łap wszelkie nieoczekiwane błędy
    console.error("[SW] Fetch error:", err);
  }
});
