# PerfectHealth - Kompletna Dokumentacja Projektu

## Spis treści
1. [O projekcie](#o-projekcie)
2. [Struktura projektu](#struktura-projektu)
3. [Pliki główne](#pliki-główne)
4. [Core (Rdzeń aplikacji)](#core-rdzeń-aplikacji)
5. [Features (Funkcjonalności)](#features-funkcjonalności)
6. [Utils (Narzędzia pomocnicze)](#utils-narzędzia-pomocnicze)

---

## O projekcie

PerfectHealth to **aplikacja PWA (Progressive Web App)** do śledzenia zdrowia. Pozwala na:
- Zapisywanie pomiarów **ciśnienia krwi** (skurczowe/rozkurczowe)
- Zapisywanie pomiarów **wagi**
- Zapisywanie **posiłków** z kaloriami i makroskładnikami (białko, węglowodany, tłuszcze)
- Przeglądanie **dashboardu** z podsumowaniem dzisiejszych danych

Dane są zapisywane **lokalnie w przeglądarce** (IndexedDB), więc działają offline.

---

## Struktura projektu

```
perfectHealthCopy/
├── index.html              # Przekierowanie do public/
├── start.sh                # Skrypt uruchamiający serwer
└── public/
    ├── index.html          # Główna strona HTML
    ├── styles.css          # Style CSS (wygląd)
    ├── serviceWorker.js    # Service Worker (offline + cache)
    └── src/
        ├── main.js         # Punkt wejścia aplikacji
        ├── constants.js    # Stałe (limity, nazwy, ustawienia)
        ├── core/
        │   ├── database.js # Obsługa IndexedDB
        │   ├── store.js    # Cache danych + synchronizacja
        │   └── router.js   # Nawigacja między stronami
        ├── features/
        │   ├── dashboard/  # Strona główna (podsumowanie)
        │   ├── measurements/ # Pomiary ciśnienia i wagi
        │   └── meals/      # Posiłki
        └── utils/
            ├── debounce.js    # Opóźnianie wywołań
            ├── error.js       # Obsługa błędów
            ├── file.js        # Odczyt plików
            ├── image.js       # Zmiana rozmiaru obrazów
            ├── rateLimit.js   # Ograniczanie requestów
            ├── uuid.js        # Generowanie ID
            └── validation.js  # Walidacja danych
```

---

## Pliki główne

### `index.html` (główny folder)

```html
<meta http-equiv="refresh" content="0; url=public/" />
<script>location.replace("public/");</script>
```

**Co robi:** To jest strona "przekierowania". Kiedy ktoś otworzy aplikację, od razu przenosi go do folderu `public/` gdzie jest właściwa aplikacja.

**Jak działa:**
1. `meta http-equiv="refresh"` - po 0 sekundach przekierowuje na `public/`
2. `location.replace("public/")` - to samo w JavaScript (dla pewności)
3. Link "Kliknij tutaj" - gdyby automatyczne przekierowanie nie zadziałało

---

### `start.sh`

```bash
#!/usr/bin/env bash
cd "$(dirname "$0")/public" && python3 -m http.server "${1:-8001}"
```

**Co robi:** Uruchamia lokalny serwer HTTP.

**Jak działa krok po kroku:**
1. `#!/usr/bin/env bash` - mówi systemowi, że to skrypt bash
2. `cd "$(dirname "$0")/public"` - wchodzi do folderu `public` (tam gdzie jest skrypt)
3. `python3 -m http.server` - uruchamia prosty serwer HTTP używając Pythona
4. `"${1:-8001}"` - używa portu podanego jako argument, albo domyślnie 8001

**Jak używać:**
```bash
./start.sh      # uruchomi na porcie 8001
./start.sh 3000 # uruchomi na porcie 3000
```

Potem otwórz `http://localhost:8001` w przeglądarce.

---

### `public/index.html`

**Co robi:** Główna strona HTML aplikacji - "szkielet" na którym wyświetla się cała aplikacja.

**Ważne elementy:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```
Sprawia, że strona dobrze wygląda na telefonach (responsywność).

```html
<link rel="manifest" href="/manifest.webmanifest" />
```
Mówi przeglądarce, że to jest PWA (można "zainstalować" jak aplikację).

```html
<header class="header">
  <nav class="header__nav">
    <a href="#/" data-route>Dashboard</a>
    <a href="#/measurements" data-route>Pomiary</a>
    <a href="#/nutrition" data-route>Żywienie & Trening</a>
  </nav>
</header>
```
Nawigacja - linki zaczynające się od `#` (hash) bo używamy routera hashowego.

```html
<main id="app" class="app-shell">
  <!-- Tu router wstawia zawartość stron -->
</main>
```
Tutaj JavaScript wrzuca treść aktualnej strony.

```html
<script type="module" src="src/main.js"></script>
```
Ładuje główny skrypt JavaScript (moduł ES6).

---

### `public/styles.css`

**Co robi:** Definiuje wygląd całej aplikacji.

**Zmienne CSS (`:root`):**
```css
:root {
  --color-bg: #f7f7f7;        /* kolor tła */
  --color-header-bg: #005b96; /* kolor nagłówka (niebieski) */
  --space-md: 0.75rem;        /* średni odstęp */
  --radius-md: 8px;           /* zaokrąglenie rogów */
}
```
Zmienne CSS to "stałe" - definiujesz raz, używasz wszędzie. Chcesz zmienić kolor? Zmieniasz w jednym miejscu.

**Klasy BEM (Block-Element-Modifier):**
```css
.header { }           /* blok - nagłówek */
.header__title { }    /* element - tytuł w nagłówku */
.header__nav { }      /* element - nawigacja w nagłówku */
.header__nav a.active { }  /* modyfikator - aktywny link */
```

**Media queries (responsywność):**
```css
@media (min-width: 480px) {
  /* style dla ekranów >= 480px (tablety, komputery) */
}
```
Na małym ekranie (telefon) elementy są jeden pod drugim. Na dużym - obok siebie.

---

### `public/serviceWorker.js`

**Co robi:** Service Worker to "pracownik w tle" - działa nawet gdy strona jest zamknięta. Odpowiada za:
- **Cache** - zapisuje pliki aplikacji, żeby działała offline
- **Offline mode** - obsługuje requesty gdy nie ma internetu

**Stałe:**
```javascript
const CACHE = "perfecthealth-cache-v18";
```
Nazwa cache. Numer wersji (`v18`) - gdy zmienisz, stary cache zostanie usunięty.

```javascript
const APP_SHELL_PATHS = [
  "./index.html",
  "./styles.css",
  "./src/main.js",
  // ... wszystkie pliki do cache'owania
];
```
Lista plików do zapisania w cache.

**Funkcje:**

#### `getBaseUrl()`
```javascript
const getBaseUrl = () => new URL("./", self.location.href).href;
```
Zwraca bazowy URL aplikacji (np. `http://localhost:8001/`).

#### `alternateHostUrl(urlString)`
```javascript
function alternateHostUrl(urlString) {
  // zamienia localhost <-> 127.0.0.1
}
```
**Po co?** Czasem przeglądarka zapisała cache pod `localhost`, a teraz otwierasz pod `127.0.0.1` (to to samo, ale przeglądarka traktuje jako różne). Ta funkcja sprawdza oba warianty.

#### `matchCacheAnyHost(request, opts)`
```javascript
async function matchCacheAnyHost(request, opts = {}) {
  const cached = await caches.match(request, opts);
  if (cached) return cached;
  const alt = alternateHostUrl(request.url);
  if (alt) return caches.match(alt, opts);
  return undefined;
}
```
**Co robi:** Szuka pliku w cache. Jeśli nie znajdzie pod oryginalnym URL, próbuje z zamienioną nazwą hosta.

**Event: `install`**
```javascript
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.allSettled(
        APP_SHELL_PATHS.map(async (path) => {
          await cache.add(url);
        })
      );
      return self.skipWaiting();
    })
  );
});
```
**Co robi:** Gdy Service Worker jest instalowany:
1. Otwiera cache
2. Pobiera wszystkie pliki z `APP_SHELL_PATHS` i zapisuje w cache
3. `skipWaiting()` - od razu przejmuje kontrolę (nie czeka na zamknięcie karty)

**Event: `activate`**
```javascript
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
```
**Co robi:** Gdy Service Worker się aktywuje:
1. Usuwa stare cache (inne niż aktualna wersja)
2. `clients.claim()` - przejmuje kontrolę nad wszystkimi kartami

**Event: `fetch`**
```javascript
self.addEventListener("fetch", (e) => {
  // obsługuje każdy request HTTP
});
```
**Co robi:** Przechwytuje KAŻDY request (żądanie HTTP) i decyduje:
- Czy pobrać z sieci?
- Czy zwrócić z cache?
- Co zrobić offline?

**Strategie:**
1. **Network First** (dla nawigacji) - próbuj z sieci, jak nie ma to z cache
2. **Cache First** (dla zasobów) - najpierw cache, jak nie ma to sieć

---

## Core (Rdzeń aplikacji)

### `src/constants.js`

**Co robi:** Przechowuje wszystkie "magiczne liczby" i stałe teksty w jednym miejscu.

**Po co?** Zamiast pisać `20` w 10 miejscach kodu (i potem szukać gdzie zmienić), piszesz `DEFAULT_LIST_LIMIT` i zmieniasz tylko tu.

```javascript
// Baza danych
export const DB_NAME = "healthDB";        // nazwa bazy IndexedDB
export const DB_VERSION = 2;               // wersja schematu (zmień gdy dodajesz pola)
export const STORE_MEASUREMENTS = "measurements";  // nazwa "tabeli" pomiarów
export const STORE_MEALS = "meals";        // nazwa "tabeli" posiłków

// Typy pomiarów
export const MEASUREMENT_TYPE_BP = "bp";       // ciśnienie krwi (blood pressure)
export const MEASUREMENT_TYPE_WEIGHT = "weight"; // waga

// Limity
export const DEFAULT_LIST_LIMIT = 20;    // ile elementów pokazać na liście
export const CALORIES_TARGET_DEFAULT = 2000; // domyślny cel kalorii dziennie

// Walidacja ciśnienia
export const BP_SYS_MIN = 60;   // minimalne skurczowe
export const BP_SYS_MAX = 250;  // maksymalne skurczowe
export const BP_DIA_MIN = 30;   // minimalne rozkurczowe
export const BP_DIA_MAX = 150;  // maksymalne rozkurczowe

// Walidacja wagi
export const WEIGHT_MIN_KG = 1;   // minimalna waga
export const WEIGHT_MAX_KG = 500; // maksymalna waga

// Tekst
export const MAX_NOTE_LENGTH = 500;  // max. długość notatki
```

---

### `src/main.js`

**Co robi:** To jest "punkt wejścia" - pierwszy plik JavaScript który się wykonuje. Inicjalizuje całą aplikację.

```javascript
import { startRouter, setActiveLink } from "./core/router.js";
import "./features/dashboard/routes.js";
import "./features/measurements/routes.js";
import "./features/meals/routes.js";
```
**Importy:**
- `startRouter` - funkcja uruchamiająca nawigację
- `setActiveLink` - zaznacza aktywny link w menu
- Pliki `routes.js` - rejestrują ścieżki (przy imporcie wykonuje się ich kod)

#### `setupOfflineBanner()`
```javascript
const setupOfflineBanner = () => {
  const banner = document.querySelector("#offline-banner");
  if (!banner) return;

  const update = () => {
    const isOnline = navigator.onLine;
    if (isOnline) {
      banner.hidden = true;
    } else {
      banner.hidden = false;
    }
  };

  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update(); // sprawdź od razu
};
```
**Co robi:** Pokazuje/ukrywa banner "Tryb offline" w zależności od połączenia internetowego.

**Jak działa:**
1. Znajduje element `#offline-banner` w HTML
2. Nasłuchuje wydarzeń `online` i `offline` (przeglądarka informuje o zmianie stanu)
3. Gdy offline - pokazuje banner, gdy online - ukrywa

```javascript
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(swUrl, { scope: "/" });
}
```
**Co robi:** Rejestruje Service Worker (jeśli przeglądarka go obsługuje).

```javascript
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
});
```
**Co robi:** Blokuje automatyczny prompt "Zainstaluj aplikację" (możesz to usunąć jeśli chcesz).

---

### `src/core/database.js`

**Co robi:** Obsługuje bazę danych **IndexedDB** - lokalną bazę danych w przeglądarce.

**IndexedDB w skrócie:**
- To baza danych w przeglądarce
- Dane zostają nawet po zamknięciu przeglądarki
- Może przechowywać duże ilości danych
- Działa asynchronicznie (Promise)

#### Schemat bazy

```javascript
const SCHEMA = {
  [STORE_MEASUREMENTS]: {
    keyPath: "id",  // każdy rekord ma unikalne "id"
    indexes: [
      { name: INDEX_BY_TS, keyPath: "ts", unique: false },   // indeks po czasie
      { name: INDEX_BY_TYPE, keyPath: "type", unique: false }, // indeks po typie
    ],
  },
  // ... podobnie dla STORE_MEALS
};
```
**Co to jest:**
- `keyPath: "id"` - każdy rekord musi mieć pole `id` (unikalny identyfikator)
- `indexes` - "indeksy" przyspieszają wyszukiwanie (jak spis treści w książce)

#### `database()`

```javascript
let _dbPromise = null;

export const database = () => {
  if (_dbPromise) return _dbPromise;  // zwróć istniejące połączenie

  _dbPromise = new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      // tworzy/aktualizuje strukturę bazy
      const db = event.target.result;
      for (const [storeName, { keyPath, indexes }] of Object.entries(SCHEMA)) {
        const store = db.objectStoreNames.contains(storeName)
          ? transaction.objectStore(storeName)
          : db.createObjectStore(storeName, { keyPath });
        // dodaj indeksy
      }
    };

    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

  return _dbPromise;
};
```
**Co robi:** Otwiera połączenie z bazą danych.

**Jak działa:**
1. Jeśli już mamy połączenie (`_dbPromise`), zwracamy je (nie otwieramy nowego)
2. `indexedDB.open()` - otwiera bazę (lub tworzy jeśli nie istnieje)
3. `onupgradeneeded` - wywoływane gdy baza nie istnieje lub ma starszą wersję
4. `onsuccess` - połączenie udane, zwracamy obiekt bazy
5. `onerror` - coś poszło nie tak

#### `tx(store, mode)`

```javascript
export const tx = (store, mode = "readonly") => {
  return database().then((d) => d.transaction(store, mode));
};
```
**Co robi:** Tworzy "transakcję" - kontener na operacje bazodanowe.

**Parametry:**
- `store` - nazwa "tabeli" (np. "measurements")
- `mode` - "readonly" (tylko odczyt) lub "readwrite" (odczyt i zapis)

#### `add(storeName, entry)`

```javascript
export const add = async (storeName, entry) => {
  const t = await tx(storeName, "readwrite");
  await new Promise((res, rej) => {
    const req = t.objectStore(storeName).add(entry);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
  // czekaj na zakończenie transakcji
  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
  return entry;
};
```
**Co robi:** Dodaje nowy rekord do bazy.

**Jak działa:**
1. Otwiera transakcję w trybie "readwrite"
2. `objectStore(storeName).add(entry)` - dodaje obiekt
3. Czeka na `onsuccess` (rekord dodany)
4. Czeka na `oncomplete` (transakcja zakończona)
5. Zwraca dodany obiekt

#### `queryIndex(storeName, indexName, opts)`

```javascript
export const queryIndex = async (
  storeName,
  indexName,
  { direction = "prev", limit = 0, filter = null, stopWhen = null } = {}
) => {
  const t = await tx(storeName, "readonly");
  const idx = t.objectStore(storeName).index(indexName);
  const results = [];

  await new Promise((res, rej) => {
    const req = idx.openCursor(null, direction);
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) return res();  // koniec danych

      const v = cur.value;
      if (stopWhen && stopWhen(v)) return res();  // warunek stopu
      if (!filter || filter(v)) results.push(v);  // dodaj jeśli przechodzi filtr
      if (limit > 0 && results.length >= limit) return res();  // limit osiągnięty
      cur.continue();  // następny rekord
    };
    req.onerror = () => rej(req.error);
  });

  return results;
};
```
**Co robi:** Wyszukuje rekordy w bazie używając indeksu.

**Parametry:**
- `direction: "prev"` - od najnowszych (desc), `"next"` - od najstarszych (asc)
- `limit` - maksymalna liczba wyników (0 = bez limitu)
- `filter` - funkcja filtrująca (np. `v => v.type === "bp"`)
- `stopWhen` - funkcja zatrzymująca (optymalizacja - nie trzeba przeglądać wszystkiego)

**Jak działa kursor:**
1. `openCursor()` - otwiera "kursor" (wskaźnik na rekord)
2. `cur.value` - aktualny rekord
3. `cur.continue()` - przejdź do następnego
4. Gdy `cur` jest `null` - koniec danych

---

### `src/core/store.js`

**Co robi:** "Store" to warstwa cache między widokami a bazą danych. Zapamiętuje pobrane dane, żeby nie odpytywać bazy przy każdym wyświetleniu.

**Po co cache?**
- Szybsze ładowanie (dane już są w pamięci)
- Mniejsze obciążenie bazy
- Spójność danych między widokami

#### Zmienne cache

```javascript
let _bpList = null;     // cache listy pomiarów ciśnienia
let _weightList = null; // cache listy pomiarów wagi
let _mealList = null;   // cache listy posiłków
let _summary = null;    // cache podsumowania dashboardu
```

#### `isCacheValid(entry, ttlMs)`

```javascript
const isCacheValid = (entry, ttlMs) =>
  entry && entry.timestamp > 0 && Date.now() - entry.timestamp < ttlMs;
```
**Co robi:** Sprawdza czy cache jest "świeży" (nie starszy niż `ttlMs` milisekund).

**Jak działa:**
- `entry` - obiekt cache z polem `timestamp`
- `ttlMs` - "Time To Live" (czas życia) w milisekundach
- Zwraca `true` jeśli cache istnieje i nie jest przestarzały

#### `getBpList(limit)`

```javascript
export const getBpList = async (limit = DEFAULT_LIST_LIMIT) => {
  // 1. Sprawdź cache
  if (isCacheValid(_bpList, DASHBOARD_CACHE_TTL_MS) && _bpList.limit >= limit) {
    return _bpList.data.slice(0, limit);
  }
  // 2. Pobierz z bazy
  const data = await measurementsController.getBpList(limit);
  // 3. Zapisz w cache
  _bpList = cacheEntry(data, limit);
  return data;
};
```
**Co robi:** Pobiera listę pomiarów ciśnienia (z cache lub bazy).

**Jak działa:**
1. Sprawdza czy cache jest aktualny i ma wystarczająco danych
2. Jeśli tak - zwraca z cache
3. Jeśli nie - pobiera z bazy i zapisuje w cache

#### `addBp(data)`

```javascript
export const addBp = async (data) => {
  const result = await measurementsController.addBp(data);
  _bpList = null;        // invaliduj cache listy
  invalidateSummary();   // invaliduj cache podsumowania
  return result;
};
```
**Co robi:** Dodaje pomiar ciśnienia i **unieważnia cache**.

**Dlaczego invalidacja?** Bo dodaliśmy nowy rekord - stary cache nie zawiera najnowszych danych.

#### `invalidateAll()`

```javascript
export const invalidateAll = () => {
  invalidateLists();
  invalidateSummary();
};
```
**Co robi:** Czyści cały cache (np. po odświeżeniu strony).

---

### `src/core/router.js`

**Co robi:** Router obsługuje nawigację w aplikacji SPA (Single Page Application). Zamiast ładować nowe strony, podmienia tylko zawartość `<main id="app">`.

#### `registerRoute(path, loader)`

```javascript
const routes = new Map();

export const registerRoute = (path, loader) => {
  routes.set(path, loader);
};
```
**Co robi:** Rejestruje trasę (ścieżkę) w routerze.

**Parametry:**
- `path` - ścieżka bez `#`, np. `"/"`, `"/measurements"`
- `loader` - funkcja która zwraca widok (HTML element)

**Przykład użycia:**
```javascript
registerRoute("/measurements", async () => {
  const view = await import("./view.js");
  return view.default();
});
```

#### `startRouter()`

```javascript
export const startRouter = () => {
  let currentCleanup = null;  // funkcja czyszcząca poprzedni widok
  let navigationId = 0;       // ID nawigacji (do wykrywania "przeterminowanych")
  let lastRenderedHash = null; // ostatnio wyrenderowany hash

  const runCleanup = () => {
    if (typeof currentCleanup === "function") {
      currentCleanup();
      currentCleanup = null;
    }
  };

  const render = async () => {
    const hash = location.hash.replace("#", "") || "/";
    
    // Nie renderuj jeśli już wyrenderowane
    if (lastRenderedHash === "#" + hash) return;

    const loader = routes.get(hash) || routes.get("/404");
    const root = document.querySelector("#app");

    runCleanup();  // posprzątaj poprzedni widok
    navigationId += 1;
    const thisNavigationId = navigationId;

    try {
      const result = await loader();

      // Sprawdź czy użytkownik nie zmienił strony w międzyczasie
      if (thisNavigationId !== navigationId) {
        // "przeterminowana" nawigacja - posprzątaj i wyjdź
        if (result?.destroy) result.destroy();
        return;
      }

      // Zapisz funkcję cleanup
      if (result?.destroy) currentCleanup = result.destroy;
      
      // Wstaw widok do DOM
      root.replaceChildren(result?.el || result);
      setActiveLink();
    } catch (error) {
      // Pokaż błąd
    }
  };

  const debouncedRender = debounce(render, RENDER_DEBOUNCE_MS);
  addEventListener("hashchange", debouncedRender);
  render(); // pierwszy render
};
```
**Co robi:** Uruchamia router oparty na hash URL.

**Jak działa hash routing:**
- URL: `http://localhost:8001/#/measurements`
- `location.hash` = `"#/measurements"`
- Zmiana hash nie przeładowuje strony, tylko odpala event `hashchange`

**Mechanizm cleanup:**
- Widok może zwrócić `{ el: HTMLElement, destroy: Function }`
- `destroy()` jest wywoływane przed zmianą widoku
- Używane do usunięcia event listenerów (zapobiega memory leaks)

**navigationId - po co?**
- Użytkownik może szybko przełączać strony
- Stary widok może jeszcze się ładować gdy nowy już startuje
- `navigationId` pozwala wykryć "przeterminowane" ładowania i je anulować

#### `setActiveLink()`

```javascript
export const setActiveLink = () => {
  const current = location.hash || "#/";
  if (lastActiveHash === current) return;
  lastActiveHash = current;
  
  document.querySelectorAll("a[data-route]").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === current);
  });
};
```
**Co robi:** Zaznacza aktywny link w nawigacji (dodaje klasę `active`).

**Jak działa:**
1. Pobiera aktualny hash
2. Znajduje wszystkie linki z atrybutem `data-route`
3. Dodaje klasę `active` do tego, którego `href` pasuje do hash

---

## Features (Funkcjonalności)

Każda funkcjonalność ma strukturę:
- `routes.js` - rejestracja tras w routerze
- `view.js` - widok (HTML + interakcje)
- `controller.js` - logika biznesowa (walidacja, przetwarzanie)
- `model.js` - tworzenie i walidacja obiektów
- `repo.js` - operacje na bazie danych

### Dashboard

#### `features/dashboard/routes.js`

```javascript
registerRoute("/", async () => {
  const view = await import("./view.js");
  return view.default();
});

registerRoute("/dashboard", async () => {
  const view = await import("./view.js");
  return view.default();
});
```
**Co robi:** Rejestruje dwie ścieżki (`/` i `/dashboard`) które pokazują ten sam widok dashboardu.

**Dynamic import (`import()`):**
- Ładuje moduł dopiero gdy jest potrzebny
- Zmniejsza początkowy rozmiar ładowania (code splitting)

#### `features/dashboard/controller.js`

```javascript
export const getTodaySummary = async () => {
  const latestWg = await latestByType(MEASUREMENT_TYPE_WEIGHT, 1);
  const latestBp = await latestByType(MEASUREMENT_TYPE_BP, 1);
  const eatenCalories = await getTodayCalories();

  return {
    date: new Date(),
    calories: { eaten: eatenCalories, target: CALORIES_TARGET_DEFAULT },
    lastWeight: latestWg[0] ? { kg: latestWg[0].value, ts: latestWg[0].ts } : null,
    lastBp: latestBp[0] ? { sys: latestBp[0].value, dia: latestBp[0].value2, ts: latestBp[0].ts } : null,
  };
};
```
**Co robi:** Pobiera dane do wyświetlenia na dashboardzie:
- Ostatni pomiar wagi
- Ostatni pomiar ciśnienia
- Dzisiejsze kalorie

#### `features/dashboard/view.js`

```javascript
const DashboardView = async () => {
  const el = document.createElement("section");

  try {
    const data = await getTodaySummary();
    el.innerHTML = `
      <div>
        <h2>Kalorie dzisiaj:</h2>
        <p><strong>${data.calories.eaten}</strong> / ${data.calories.target} kcal</p>
      </div>
      <!-- ... więcej kart ... -->
    `;
  } catch (error) {
    // pokaż błąd
  }

  return el;
};
```
**Co robi:** Tworzy HTML dashboardu z danymi.

---

### Measurements (Pomiary)

#### `features/measurements/routes.js`

```javascript
registerRoute("/measurements", async () => {
  const view = await import("./view.js");
  return view.default();
});
```

#### `features/measurements/model.js`

##### `newBloodPressure(opts)`

```javascript
export const newBloodPressure = ({ sys, dia, ts = Date.now(), note = "", location = "" }) => {
  const result = {
    id: uuid(),                    // unikalny ID
    type: MEASUREMENT_TYPE_BP,     // typ: "bp"
    value: +sys,                   // ciśnienie skurczowe
    value2: +dia,                  // ciśnienie rozkurczowe
    ts: +ts,                       // timestamp
    note: `${note}`,               // notatka
    location: `${location}`,       // lokalizacja
  };

  return validateBloodPreassure(result);
};
```
**Co robi:** Tworzy nowy obiekt pomiaru ciśnienia.

**`+sys` - co to?**
- `+` przed zmienną konwertuje na liczbę
- `+"123"` = `123`
- `+undefined` = `NaN`

**`` `${note}` `` - co to?**
- Template literal konwertuje na string
- `` `${null}` `` = `"null"` - ups! Dlatego jest `note = ""`

##### `validateBloodPreassure(e)`

```javascript
export const validateBloodPreassure = (e) => {
  if (e.type !== MEASUREMENT_TYPE_BP) 
    throw new Error("Nieprawidłowy typ pomiaru");
  if (e.value < BP_SYS_MIN || e.value > BP_SYS_MAX)
    throw new Error(`Wartość skurczowa poza zakresem (${BP_SYS_MIN}-${BP_SYS_MAX})`);
  // ... więcej walidacji
  return e;
};
```
**Co robi:** Sprawdza czy dane pomiaru są poprawne. Jeśli nie - rzuca błąd.

##### `newWeight(opts)` i `validateWeight(e)`

Analogicznie jak dla ciśnienia, ale dla wagi.

#### `features/measurements/repo.js`

```javascript
export const add = (entry) => dbAdd(STORE_MEASUREMENTS, entry);

export const latestByType = (type, limit = DEFAULT_LIST_LIMIT) =>
  queryIndex(STORE_MEASUREMENTS, INDEX_BY_TS, {
    direction: "prev",  // od najnowszych
    limit,
    filter: (v) => v.type === type,  // tylko dany typ
  });
```
**Co robi:** Operacje na bazie danych dla pomiarów.

#### `features/measurements/controller.js`

##### `getCurrentPosition()`

```javascript
export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolokacja nie jest obsługiwana"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      reject,
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS }
    );
  });
```
**Co robi:** Pobiera współrzędne GPS z przeglądarki.

**Jak działa:**
1. Sprawdza czy przeglądarka obsługuje geolokację
2. `getCurrentPosition()` - pyta użytkownika o pozwolenie i pobiera lokalizację
3. Zwraca obiekt z `latitude` i `longitude`

##### `resolveAddressFromCoords(latitude, longitude)`

```javascript
export const resolveAddressFromCoords = async (latitude, longitude) => {
  const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}`;
  const response = await rateLimitedFetch(url, {
    key: "nominatim",
    minIntervalMs: NOMINATIM_MIN_INTERVAL_MS,  // 1 sekunda między requestami
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
  });

  const data = await response.json();
  // złóż adres z części (ulica, numer, miasto)
  return parts.join(", ");
};
```
**Co robi:** Zamienia współrzędne GPS na adres (reverse geocoding).

**Nominatim:** Darmowe API OpenStreetMap do geokodowania. Wymaga:
- User-Agent (identyfikacja aplikacji)
- Max 1 request na sekundę (rate limit)

##### `addBp(data)`

```javascript
export const addBp = async ({ sys, dia, date, time, note, location }) => {
  // 1. Walidacja
  const sysVal = assertNumberInRange(sys, BP_SYS_MIN, BP_SYS_MAX, "Skurczowe");
  const diaVal = assertNumberInRange(dia, BP_DIA_MIN, BP_DIA_MAX, "Rozkurczowe");
  const ts = parseDateTime(date, time);
  
  // 2. Tworzenie obiektu
  const entry = newBloodPressure({ sys: sysVal, dia: diaVal, ts, note, location });

  // 3. Zapis do bazy
  return repo.add(entry);
};
```
**Co robi:** Waliduje dane, tworzy obiekt pomiaru i zapisuje w bazie.

#### `features/measurements/view.js`

```javascript
const MeasurementsView = async () => {
  const root = document.createElement("section");

  root.innerHTML = `
    <div class="feature-layout">
      <div class="feature-form-col">
        <form id="bp-form" class="app-form">
          <label>Skurczowe
            <input name="sys" type="number" min="${BP_SYS_MIN}" max="${BP_SYS_MAX}" required />
          </label>
          <!-- ... więcej pól ... -->
          <button class="btn" type="submit">Zapisz pomiar</button>
        </form>
      </div>
      <div class="feature-list-col">
        <ul id="bp-list"></ul>
      </div>
    </div>
  `;

  // Znajdź elementy
  const bpForm = root.querySelector("#bp-form");
  const bpList = root.querySelector("#bp-list");

  // Obsługa formularza
  const onBpSubmit = async (e) => {
    e.preventDefault();  // nie przeładowuj strony
    const fd = new FormData(bpForm);

    try {
      await addBp({
        sys: fd.get("sys"),
        dia: fd.get("dia"),
        // ... reszta pól
      });
      bpForm.reset();  // wyczyść formularz
      await refreshBp();  // odśwież listę
    } catch (error) {
      // pokaż błąd
    }
  };

  bpForm.addEventListener("submit", onBpSubmit);

  // Cleanup - usunięcie listenerów
  const destroy = () => {
    bpForm.removeEventListener("submit", onBpSubmit);
  };

  // Pierwszy render listy
  await refreshBp();

  return { el: root, destroy };
};
```
**Co robi:** Tworzy widok pomiarów z formularzami i listami.

**FormData:**
```javascript
const fd = new FormData(bpForm);
fd.get("sys");  // wartość inputa o name="sys"
```
- Automatycznie zbiera wszystkie pola formularza
- Działa z `<input>`, `<select>`, `<textarea>`

**`e.preventDefault()`:**
- Domyślnie formularz przeładowuje stronę
- `preventDefault()` to blokuje

---

### Meals (Posiłki)

#### `features/meals/model.js`

```javascript
export const newMeal = ({
  calories,
  description = "",
  protein = 0,
  carbs = 0,
  fats = 0,
  image = null,
  ts = Date.now(),
  note = "",
}) => {
  const result = {
    id: uuid(),
    type: MEAL_TYPE,
    calories: +calories,
    description: `${description}`,
    protein: +protein,
    carbs: +carbs,
    fats: +fats,
    image: image,  // Blob lub data URL
    ts: +ts,
    note: `${note}`,
  };

  return validateMeal(result);
};
```
**Co robi:** Tworzy obiekt posiłku.

**Przechowywanie zdjęcia:**
- `image` może być `Blob` (binarny obiekt) lub `null`
- IndexedDB może przechowywać Bloby bezpośrednio

#### `features/meals/controller.js`

##### `imageFileToBlob(imageFile)`

```javascript
const imageFileToBlob = async (imageFile) => {
  if (imageFile == null) return null;
  const file = assertImageFile(imageFile, MAX_IMAGE_INPUT_SIZE);
  if (!file) return null;
  return resizeImageToBlob(file, {
    maxDimension: MAX_IMAGE_DIMENSION,  // 1024px
    quality: IMAGE_JPEG_QUALITY,         // 0.82
  });
};
```
**Co robi:** Waliduje i kompresuje zdjęcie.

**Dlaczego kompresja?**
- Użytkownik może wgrać zdjęcie 5MB
- Po kompresji do JPEG 1024px będzie ~200KB
- Mniej miejsca w bazie, szybsze ładowanie

##### `getTodayMeals()` i `getTodayCalories()`

```javascript
export const getTodayMeals = async () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();

  const allMeals = await repo.latestByType(MEAL_TYPE, MEALS_TODAY_FETCH_LIMIT);
  return allMeals.filter((meal) => {
    const mealDate = new Date(meal.ts);
    return mealDate.getDate() === now.getDate() &&
           mealDate.getMonth() === now.getMonth() &&
           mealDate.getFullYear() === now.getFullYear();
  });
};

export const getTodayCalories = async () => {
  const meals = await getTodayMeals();
  return meals.reduce((sum, meal) => sum + meal.calories, 0);
};
```
**Co robi:** Pobiera posiłki z dzisiaj i sumuje kalorie.

**`reduce()` - jak działa:**
```javascript
[100, 200, 300].reduce((sum, val) => sum + val, 0)
// 0 + 100 = 100
// 100 + 200 = 300
// 300 + 300 = 600
// wynik: 600
```

#### `features/meals/view.js`

```javascript
const mealListObjectUrls = new Set();

const renderMealList = (items, error) => {
  // Zwolnij stare Object URLs
  mealListObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  mealListObjectUrls.clear();

  const parts = items.map((e) => {
    let imageUrl = null;
    if (e.image instanceof Blob) {
      imageUrl = URL.createObjectURL(e.image);
      mealListObjectUrls.add(imageUrl);  // zapamiętaj do późniejszego zwolnienia
    }
    return `<li><img src="${imageUrl}" /> ...</li>`;
  });
};

const destroy = () => {
  mealListObjectUrls.forEach((url) => URL.revokeObjectURL(url));
};
```
**Object URL - co to?**
- `URL.createObjectURL(blob)` - tworzy tymczasowy URL do Bloba
- Można go użyć w `<img src="...">`
- **WAŻNE:** Trzeba zwolnić przez `URL.revokeObjectURL()` (memory leak!)

---

## Utils (Narzędzia pomocnicze)

### `utils/uuid.js`

```javascript
export const uuid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
```
**Co robi:** Generuje unikalny identyfikator.

**Jak działa:**
1. Jeśli przeglądarka ma `crypto.randomUUID()` - używa go (standardowe UUID v4)
2. Jeśli nie - tworzy własne z timestamp + losowej liczby

**UUID v4 wygląda tak:** `550e8400-e29b-41d4-a716-446655440000`

---

### `utils/debounce.js`

```javascript
export const debounce = (fn, ms) => {
  let timeoutId = null;

  const debounced = (...args) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);  // anuluj poprzedni timer
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);  // wywołaj funkcję
    }, ms);
  };

  return debounced;
};
```
**Co robi:** Opóźnia wywołanie funkcji i resetuje timer przy każdym wywołaniu.

**Przykład bez debounce:**
```javascript
input.addEventListener("input", search);
// Wpisujesz "test" = 4 wywołania search()
```

**Z debounce (300ms):**
```javascript
input.addEventListener("input", debounce(search, 300));
// Wpisujesz "test" = 1 wywołanie search() (300ms po ostatniej literze)
```

**Użycie w routerze:**
```javascript
const debouncedRender = debounce(render, 80);
addEventListener("hashchange", debouncedRender);
```
Zapobiega wielokrotnym renderom przy szybkim klikaniu.

---

### `utils/rateLimit.js`

```javascript
const lastRequestByKey = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const rateLimitedFetch = async (url, { key, minIntervalMs, headers = {} }) => {
  const last = lastRequestByKey.get(key) ?? 0;
  const elapsed = Date.now() - last;
  
  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed);  // poczekaj
  }

  lastRequestByKey.set(key, Date.now());
  return fetch(url, { headers });
};
```
**Co robi:** Fetch z wymuszonym minimalnym odstępem między requestami.

**Po co?**
- API (np. Nominatim) mają limity requestów
- `minIntervalMs: 1000` = max 1 request na sekundę
- `key` - różne API mogą mieć różne limity

---

### `utils/error.js`

#### `getErrorMessage(error)`

```javascript
export const getErrorMessage = (error) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error ?? "Wystąpił nieznany błąd");
};
```
**Co robi:** Wyciąga czytelny komunikat z błędu.

**Dlaczego potrzebne?**
- `error` może być `Error`, `string`, `undefined`, lub cokolwiek
- Ta funkcja zawsze zwraca string

#### `escapeHtml(s)`

```javascript
export const escapeHtml = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
```
**Co robi:** Zamienia znaki specjalne HTML na encje (ochrona przed XSS).

**XSS atak:**
```javascript
const userInput = '<script>alert("hacked")</script>';
div.innerHTML = userInput;  // NIEBEZPIECZNE! Skrypt się wykona

div.innerHTML = escapeHtml(userInput);  // Bezpieczne - wyświetli jako tekst
// &lt;script&gt;alert("hacked")&lt;/script&gt;
```

#### `safeHtml` i `trusted`

```javascript
const TRUSTED = Symbol("trusted");

export const trusted = (value) => ({ [TRUSTED]: true, value: String(value) });

export const safeHtml = (strings, ...values) => {
  const processed = values.map((v) =>
    v?.[TRUSTED] === true ? v.value : escapeHtml(String(v ?? ""))
  );
  return strings.reduce((acc, s, i) => acc + s + (processed[i] ?? ""), "");
};
```
**Co robi:** Template literal który automatycznie escapuje wartości.

**Użycie:**
```javascript
const userInput = '<script>alert("hacked")</script>';
const safeImg = '<img src="photo.jpg" />';

// Wszystko escapowane
safeHtml`<div>${userInput}</div>`;
// <div>&lt;script&gt;...&lt;/script&gt;</div>

// trusted() omija escapowanie
safeHtml`<div>${trusted(safeImg)}</div>`;
// <div><img src="photo.jpg" /></div>
```

---

### `utils/validation.js`

#### `assertRequired(value, fieldName)`

```javascript
export const assertRequired = (value, fieldName) => {
  const s = value != null ? String(value).trim() : "";
  if (s === "") {
    throw new Error(`Pole "${fieldName}" jest wymagane.`);
  }
  return s;
};
```
**Co robi:** Sprawdza czy pole nie jest puste.

#### `assertNumberInRange(value, min, max, fieldName)`

```javascript
export const assertNumberInRange = (value, min, max, fieldName) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Pole "${fieldName}" musi być liczbą.`);
  }
  if (n < min || n > max) {
    throw new Error(`Pole "${fieldName}" musi być od ${min} do ${max}.`);
  }
  return n;
};
```
**Co robi:** Sprawdza czy wartość jest liczbą w zakresie.

**`Number.isFinite()` - po co?**
```javascript
Number.isFinite(123);      // true
Number.isFinite(NaN);      // false
Number.isFinite(Infinity); // false
Number.isFinite("123");    // false (string!)
```

#### `parseDateTime(date, time)`

```javascript
export const parseDateTime = (date, time) => {
  if (!hasDate && !hasTime) return Date.now();  // teraz

  // Parse date: "2024-01-15" -> [2024, 1, 15]
  const parts = d.split("-").map(Number);
  const [year, month, day] = parts;

  // Parse time: "14:30" -> [14, 30]
  const timeParts = t.split(":").map(Number);
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;

  // Stwórz datę lokalną
  const localDate = new Date(year, month - 1, day, hours, minutes);
  return localDate.getTime();  // timestamp w ms
};
```
**Co robi:** Parsuje datę i godzinę z formularza do timestamp.

**Dlaczego `month - 1`?**
- W JavaScript miesiące są indeksowane od 0
- Styczeń = 0, Grudzień = 11

#### `assertImageFile(file, maxSize)`

```javascript
export const assertImageFile = (file, maxSize) => {
  if (!(file instanceof File)) throw new Error("...");
  if (file.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error("...");
  if (file.size > maxSize) throw new Error("...");
  return file;
};
```
**Co robi:** Waliduje plik obrazu (typ, rozmiar).

---

### `utils/image.js`

```javascript
export const resizeImageToBlob = (file, { maxDimension = 1024, quality = 0.82 } = {}) => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Oblicz nowe wymiary
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          width = maxDimension;
          height = Math.round((height * maxDimension) / width);
        } else {
          height = maxDimension;
          width = Math.round((width * maxDimension) / height);
        }
      }

      // Narysuj na canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Eksportuj jako JPEG
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Nieprawidłowy plik obrazu"));
    img.src = url;
  });
};
```
**Co robi:** Zmniejsza i kompresuje obraz.

**Jak działa:**
1. Tworzy Object URL z pliku
2. Ładuje do `<img>`
3. Oblicza nowe wymiary (zachowując proporcje)
4. Rysuje na `<canvas>`
5. Eksportuje jako JPEG blob

**Canvas - po co?**
- Jedyny sposób na manipulację obrazami w przeglądarce
- `drawImage()` - narysuj obraz (ze zmianą rozmiaru)
- `toBlob()` - eksportuj do formatu (JPEG, PNG, WebP)

---

### `utils/file.js`

```javascript
export const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
```
**Co robi:** Odczytuje plik jako Data URL.

**Data URL wygląda tak:**
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...
```
Można go użyć bezpośrednio w `<img src="data:...">`.

---

## Podsumowanie architektury

```
Użytkownik
    ↓
HTML (index.html)
    ↓
main.js (uruchomienie)
    ↓
router.js (nawigacja)
    ↓
routes.js → view.js (widok)
    ↓
store.js (cache)
    ↓
controller.js (logika)
    ↓
model.js (walidacja)
    ↓
repo.js → database.js (IndexedDB)
```

**Przepływ danych przy dodawaniu pomiaru:**
1. Użytkownik wypełnia formularz w `view.js`
2. `view.js` wywołuje `store.addBp(data)`
3. `store.js` wywołuje `controller.addBp(data)`
4. `controller.js` waliduje przez `validation.js`
5. `controller.js` tworzy obiekt przez `model.newBloodPressure()`
6. `controller.js` zapisuje przez `repo.add()`
7. `repo.js` używa `database.add()`
8. `store.js` unieważnia cache
9. `view.js` odświeża listę
