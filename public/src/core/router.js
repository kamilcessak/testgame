/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: router.js                                                             ║
 * ║  CO ROBI: Nawigacja między "stronami" w aplikacji SPA                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST ROUTER?
 * 
 * Router to mechanizm nawigacji w aplikacji SPA (Single Page Application).
 * 
 * TRADYCYJNA STRONA:
 * - Klikasz link → przeglądarka ładuje NOWĄ stronę HTML
 * - Cała strona się przeładowuje (biały ekran, ponowne ładowanie)
 * 
 * SPA Z ROUTEREM:
 * - Klikasz link → JavaScript PODMIENIA zawartość strony
 * - Strona NIE przeładowuje się (płynne przejście)
 * - URL się zmienia (dla zakładek i przycisku "wstecz")
 * 
 * HASH ROUTING:
 * 
 * Ten router używa "hash" w URL:
 * http://localhost:8001/#/measurements
 *                       ↑
 *                       hash (zaczyna się od #)
 * 
 * DLACZEGO HASH?
 * - Zmiana hash NIE przeładowuje strony
 * - Przeglądarka odpala event "hashchange"
 * - Łatwe do implementacji
 * - Działa z każdym serwerem (nie wymaga konfiguracji)
 * 
 * ALTERNATYWA - History API:
 * http://localhost:8001/measurements (bez #)
 * - Ładniej wygląda
 * - ALE wymaga konfiguracji serwera (fallback na index.html)
 */

import { getErrorMessage } from "../utils/error.js";
import { debounce } from "../utils/debounce.js";
import { RENDER_DEBOUNCE_MS } from "../constants.js";

// ═══════════════════════════════════════════════════════════════════════════════
// REJESTR TRAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mapa zarejestrowanych tras
 * 
 * Klucz: ścieżka (bez #), np. "/", "/measurements"
 * Wartość: funkcja loader która zwraca widok
 * 
 * Map jest lepsze niż Object bo:
 * - Gwarantuje kolejność dodawania
 * - Klucze mogą być dowolnego typu
 * - Ma metodę .get() i .set()
 * 
 * @type {Map<string, () => Promise<{ el: HTMLElement, destroy?: () => void }>>}
 */
const routes = new Map();

/**
 * Ostatni aktywny hash - do optymalizacji setActiveLink()
 * Jeśli hash się nie zmienił, nie aktualizujemy DOM
 */
let lastActiveHash = null;

// ═══════════════════════════════════════════════════════════════════════════════
// REJESTRACJA TRAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rejestruje trasę w routerze
 * 
 * PRZYKŁAD UŻYCIA:
 * registerRoute("/measurements", async () => {
 *   const view = await import("./view.js");
 *   return view.default();
 * });
 * 
 * @param {string} path - Ścieżka bez #, np. "/" lub "/measurements"
 * @param {() => Promise<{el: HTMLElement, destroy?: () => void}>} loader 
 *   Funkcja która zwraca widok. Może zwrócić:
 *   - HTMLElement - sam element
 *   - { el: HTMLElement, destroy: Function } - element + funkcja cleanup
 */
export const registerRoute = (path, loader) => {
  routes.set(path, loader);
};

// ═══════════════════════════════════════════════════════════════════════════════
// GŁÓWNY ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Uruchamia router - nasłuchuje na zmiany URL i renderuje widoki
 * 
 * PRZEPŁYW:
 * 1. Nasłuchuj na event "hashchange" (zmiana URL)
 * 2. Gdy hash się zmieni:
 *    a. Wyczyść poprzedni widok (destroy)
 *    b. Znajdź loader dla nowego hash
 *    c. Wywołaj loader i poczekaj na widok
 *    d. Wstaw widok do DOM
 * 3. Na starcie: wyrenderuj aktualną stronę
 */
export const startRouter = () => {
  /**
   * Funkcja cleanup poprzedniego widoku
   * 
   * Widok może zwrócić { el, destroy } gdzie destroy to funkcja
   * która "sprząta" po widoku (usuwa event listenery itd.)
   * 
   * Musimy ją wywołać przed załadowaniem nowego widoku
   * żeby uniknąć wycieków pamięci (memory leaks)
   */
  let currentCleanup = null;
  
  /**
   * ID aktualnej nawigacji - do wykrywania "przeterminowanych" nawigacji
   * 
   * PROBLEM: User szybko klika między stronami
   * 1. Klik na A → startuje ładowanie A (trwa 500ms)
   * 2. Klik na B → startuje ładowanie B (trwa 100ms)
   * 3. B się załaduje → wyświetl B
   * 4. A się załaduje → wyświetl A ← ŹLEM! User chce B!
   * 
   * ROZWIĄZANIE:
   * Każda nawigacja dostaje ID. Przed wyświetleniem sprawdzamy
   * czy ID się zgadza. Jeśli nie - nawigacja jest "przeterminowana".
   */
  let navigationId = 0;
  
  /**
   * Ostatnio wyrenderowany hash - żeby nie renderować dwa razy tego samego
   */
  let lastRenderedHash = null;

  /**
   * Wywołuje funkcję cleanup poprzedniego widoku
   */
  const runCleanup = () => {
    if (typeof currentCleanup === "function") {
      try {
        currentCleanup();
      } catch (cleanupError) {
        console.error("Błąd podczas czyszczenia widoku:", cleanupError);
      }
      currentCleanup = null;
    }
  };

  /**
   * Główna funkcja renderująca - wywoływana przy każdej zmianie hash
   */
  const render = async () => {
    /**
     * Pobierz aktualny hash
     * 
     * location.hash = "#/measurements" → usuwamy # → "/measurements"
     * Jeśli pusty → domyślnie "/"
     */
    const hash = location.hash.replace("#", "") || "/";
    const normalizedHash = "#" + (hash || "/");

    /**
     * Optymalizacja: nie renderuj jeśli już wyrenderowane
     * 
     * Może się zdarzyć gdy:
     * - Debounce wywołuje render() wielokrotnie
     * - User kliknie ten sam link dwa razy
     */
    if (lastRenderedHash === normalizedHash) {
      return;
    }

    /**
     * Znajdź loader dla tej trasy
     * 
     * routes.get(hash) - szuka dokładnego dopasowania
     * routes.get("/404") - fallback jeśli nie znaleziono
     */
    const loader = routes.get(hash) || routes.get("/404");
    
    /**
     * Znajdź kontener #app w DOM
     */
    const root = document.querySelector("#app");
    if (!root) return;

    /**
     * Wyczyść poprzedni widok
     */
    runCleanup();
    
    /**
     * Inkrementuj ID nawigacji
     * Zapisz lokalne ID żeby sprawdzić po await
     */
    navigationId += 1;
    const thisNavigationId = navigationId;

    try {
      /**
       * Wywołaj loader i poczekaj na widok
       * 
       * Loader jest async bo może:
       * - Dynamicznie importować moduł
       * - Pobierać dane z bazy
       * - Wykonywać operacje sieciowe
       */
      const result = await loader();

      /**
       * SPRAWDŹ CZY NAWIGACJA NIE JEST PRZETERMINOWANA
       * 
       * Jeśli user zmienił stronę w czasie gdy ładowaliśmy,
       * navigationId będzie inne niż thisNavigationId.
       * 
       * W takim przypadku:
       * 1. Nie wyświetlaj tego widoku
       * 2. Wywołaj destroy() jeśli widok go ma
       */
      if (thisNavigationId !== navigationId) {
        // Przeterminowana nawigacja - posprzątaj i wyjdź
        if (result?.el != null && typeof result.destroy === "function") {
          try {
            result.destroy();
          } catch (e) {
            console.error("Błąd podczas czyszczenia odrzuconego widoku:", e);
          }
        }
        return;
      }

      /**
       * Wyciągnij element i destroy z wyniku
       * 
       * Loader może zwrócić:
       * - HTMLElement → viewEl = result, cleanup = null
       * - { el: HTMLElement, destroy: Function } → viewEl = result.el, cleanup = result.destroy
       */
      const viewEl = result?.el != null ? result.el : result;
      
      if (result?.el != null && typeof result.destroy === "function") {
        currentCleanup = result.destroy;
      } else {
        currentCleanup = null;
      }
      
      /**
       * Zapisz hash jako wyrenderowany
       */
      lastRenderedHash = normalizedHash;
      
      /**
       * Wstaw widok do DOM
       * 
       * replaceChildren() usuwa wszystkie dzieci i wstawia nowe.
       * Lepsze niż innerHTML = "" + appendChild() bo:
       * - Jedna operacja DOM (szybsze)
       * - Automatycznie czyści stare dzieci
       */
      root.replaceChildren(viewEl);
      
      /**
       * Zaktualizuj aktywny link w nawigacji
       */
      setActiveLink();
      
    } catch (error) {
      /**
       * Sprawdź czy nawigacja nie jest przeterminowana
       */
      if (thisNavigationId !== navigationId) {
        return;
      }
      
      console.error(error);
      
      /**
       * Wyczyść cleanup (bo widok się nie załadował)
       */
      runCleanup();
      
      /**
       * Pokaż błąd użytkownikowi
       * 
       * Tworzymy prosty error box z wiadomością.
       * getErrorMessage() wyciąga czytelną wiadomość z błędu.
       */
      const box = document.createElement("div");
      box.className = "errorBox";
      
      const strong = document.createElement("strong");
      strong.textContent = "Wystąpił błąd podczas ładowania strony.";
      
      const br = document.createElement("br");
      
      const msg = document.createTextNode(getErrorMessage(error));
      
      box.appendChild(strong);
      box.appendChild(br);
      box.appendChild(msg);
      
      root.replaceChildren(box);
    }
  };

  /**
   * Opóźniona wersja render() - debounce
   * 
   * Zapobiega wielokrotnym renderom przy szybkim klikaniu.
   * Czeka RENDER_DEBOUNCE_MS ms po ostatnim wywołaniu.
   */
  const debouncedRender = debounce(render, RENDER_DEBOUNCE_MS);

  /**
   * Nasłuchuj na zmiany hash
   * 
   * Event "hashchange" odpala się gdy:
   * - User kliknie link z href="#..."
   * - User użyje przycisku wstecz/dalej
   * - JavaScript zmieni location.hash
   */
  addEventListener("hashchange", debouncedRender);

  /**
   * Pierwszy render (przy starcie aplikacji)
   * 
   * Jeśli DOM jeszcze się ładuje, poczekaj na DOMContentLoaded.
   * Inaczej renderuj od razu.
   */
  if (document.readyState === "loading") {
    addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// AKTYWNY LINK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zaznacza aktywny link w nawigacji
 * 
 * Znajduje wszystkie linki z atrybutem data-route
 * i dodaje klasę "active" do tego, którego href
 * odpowiada aktualnemu hash.
 * 
 * PRZYKŁAD HTML:
 * <a href="#/" data-route>Dashboard</a>
 * <a href="#/measurements" data-route>Pomiary</a>
 * 
 * Gdy URL = "...#/measurements":
 * - Link Dashboard: bez klasy active
 * - Link Pomiary: class="active"
 */
export const setActiveLink = () => {
  // Aktualny hash (lub #/ jeśli pusty)
  const current = location.hash || "#/";
  
  /**
   * Optymalizacja: nie aktualizuj DOM jeśli hash się nie zmienił
   */
  if (lastActiveHash === current) return;
  lastActiveHash = current;
  
  /**
   * Znajdź wszystkie linki nawigacji
   * 
   * [data-route] - selektor atrybutu
   * Oznacza: wszystkie elementy które MAJĄ atrybut data-route
   */
  document.querySelectorAll("a[data-route]").forEach((a) => {
    /**
     * classList.toggle(class, force)
     * 
     * force = true → dodaj klasę
     * force = false → usuń klasę
     * 
     * a.getAttribute("href") === current
     * → true jeśli href linku pasuje do aktualnego URL
     */
    a.classList.toggle("active", a.getAttribute("href") === current);
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRASA 404 (Nie znaleziono)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Domyślna trasa dla nieistniejących ścieżek
 * 
 * Gdy user wpisze URL który nie istnieje:
 * http://localhost:8001/#/jakis-bzdura
 * 
 * Router nie znajdzie loadera dla "/jakis-bzdura"
 * i użyje "/404" jako fallback.
 */
registerRoute("/404", async () => {
  const el = document.createElement("div");
  el.className = "page-404 card";
  
  const h2 = document.createElement("h2");
  h2.textContent = "Nie znaleziono strony";
  
  el.appendChild(h2);
  return el;
});
