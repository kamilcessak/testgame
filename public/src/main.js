/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: main.js                                                               ║
 * ║  CO ROBI: Punkt wejścia aplikacji - uruchamia wszystko                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * TO JEST "STARTOWY" PLIK APLIKACJI
 * 
 * Gdy przeglądarka ładuje index.html, napotyka:
 * <script type="module" src="src/main.js"></script>
 * 
 * I wykonuje TEN plik jako pierwszy. Ten plik:
 * 1. Importuje router (nawigację)
 * 2. Importuje trasy (które strony są dostępne)
 * 3. Konfiguruje banner offline
 * 4. Rejestruje Service Worker
 * 5. Uruchamia router
 * 
 * KOLEJNOŚĆ MA ZNACZENIE:
 * - Importy wykonują się od razu (synchronicznie)
 * - Pliki routes.js przy imporcie REJESTRUJĄ trasy w routerze
 * - Dopiero potem startRouter() uruchamia nawigację
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Import funkcji routera
 * - startRouter() - uruchamia nasłuchiwanie na zmiany URL
 * - setActiveLink() - zaznacza aktywny link w nawigacji
 */
import { startRouter, setActiveLink } from "./core/router.js";

/**
 * IMPORTY TRAS - Side Effects!
 * 
 * Te importy NIE eksportują niczego co używamy tutaj.
 * Ale sam IMPORT powoduje wykonanie kodu w tych plikach.
 * 
 * A co robią te pliki? Wywołują registerRoute() żeby
 * dodać swoje trasy do routera.
 * 
 * Czyli po tych 3 linijkach router "wie" o stronach:
 * - "/" i "/dashboard" → dashboard
 * - "/measurements" → pomiary
 * - "/nutrition" i "/meals" → posiłki
 */
import "./features/dashboard/routes.js";
import "./features/measurements/routes.js";
import "./features/meals/routes.js";

// ═══════════════════════════════════════════════════════════════════════════════
// BANNER OFFLINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Konfiguruje banner informujący o trybie offline
 * 
 * CO ROBI:
 * - Znajduje element #offline-banner w HTML
 * - Sprawdza stan połączenia (navigator.onLine)
 * - Pokazuje/ukrywa banner
 * - Nasłuchuje na zmiany stanu połączenia
 * 
 * KIEDY SIĘ POKAZUJE:
 * - navigator.onLine === false (brak internetu)
 * 
 * UWAGA: navigator.onLine nie jest 100% wiarygodny
 * Może zwrócić true gdy jesteś podłączony do routera
 * ale router nie ma internetu. Ale to lepsze niż nic.
 */
const setupOfflineBanner = () => {
  // Znajdź element banera w DOM
  const banner = document.querySelector("#offline-banner");
  
  // Jeśli element nie istnieje (np. ktoś usunął z HTML), nie rób nic
  if (!banner) return;

  /**
   * Funkcja aktualizująca widoczność banera
   * Wywołujemy ją:
   * 1. Od razu przy starcie
   * 2. Przy każdej zmianie stanu połączenia
   */
  const update = () => {
    const isOnline = navigator.onLine;
    
    if (isOnline) {
      // Online - ukryj banner
      banner.hidden = true;
      banner.style.display = "none";
    } else {
      // Offline - pokaż banner
      banner.hidden = false;
      banner.style.display = "flex";
    }
  };

  /**
   * Nasłuchuj na eventy online/offline
   * 
   * Przeglądarka odpala te eventy gdy:
   * - "online" - połączenie wróciło
   * - "offline" - połączenie stracone
   */
  window.addEventListener("online", update);
  window.addEventListener("offline", update);

  /**
   * Wywołaj update() przy starcie
   * 
   * document.readyState może być:
   * - "loading" - HTML jeszcze się parsuje
   * - "interactive" - HTML sparsowany, zasoby się ładują
   * - "complete" - wszystko załadowane
   * 
   * Jeśli jeszcze "loading", poczekaj na DOMContentLoaded
   * Inaczej wywołaj od razu
   */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", update);
  } else {
    update();
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// REJESTRACJA SERVICE WORKER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rejestruj Service Worker (jeśli przeglądarka go obsługuje)
 * 
 * "serviceWorker" in navigator - sprawdza czy przeglądarka obsługuje SW
 * Starsze przeglądarki (IE) nie obsługują, więc trzeba sprawdzić
 */
if ("serviceWorker" in navigator) {
  /**
   * Stwórz URL do pliku Service Worker
   * 
   * import.meta.url = URL tego pliku (main.js)
   * "../serviceWorker.js" = wyjdź z src/, weź serviceWorker.js
   * 
   * new URL(relative, base) - łączy ścieżkę względną z bazowym URL
   */
  const swUrl = new URL("../serviceWorker.js", import.meta.url).href;
  
  /**
   * Zarejestruj Service Worker
   * 
   * navigator.serviceWorker.register() - rejestruje SW
   * { scope: "/" } - SW kontroluje cały origin (wszystkie strony)
   * 
   * .catch() - loguj błąd jeśli rejestracja się nie powiedzie
   * (np. HTTPS wymagany, nieprawidłowa ścieżka)
   */
  navigator.serviceWorker
    .register(swUrl, { scope: "/" })
    .catch((err) => console.error("SW registration failed:", err));
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOKADA PROMPTU INSTALACJI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Blokuj automatyczny prompt "Zainstaluj aplikację"
 * 
 * Przeglądarka (Chrome, Edge) może pokazać prompt "Dodaj do ekranu głównego"
 * gdy wykryje że strona jest PWA.
 * 
 * beforeinstallprompt - event który się odpala PRZED pokazaniem promptu
 * e.preventDefault() - blokuje pokazanie promptu
 * 
 * DLACZEGO BLOKUJEMY?
 * - Możemy chcieć pokazać własny przycisk "Zainstaluj"
 * - Lub w ogóle nie chcemy tego promptu
 * 
 * JEŚLI CHCESZ PROMPT: usuń tę funkcję lub zapisz event do późniejszego użycia:
 * let deferredPrompt;
 * window.addEventListener("beforeinstallprompt", (e) => {
 *   deferredPrompt = e;  // zapisz do użycia później
 *   showInstallButton(); // pokaż własny przycisk
 * });
 */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
});

// ═══════════════════════════════════════════════════════════════════════════════
// START APLIKACJI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ustaw banner offline (pokaż/ukryj w zależności od stanu połączenia)
 */
setupOfflineBanner();

/**
 * Uruchom router
 * 
 * startRouter():
 * 1. Sprawdza aktualny hash URL (np. #/measurements)
 * 2. Znajduje odpowiadającą trasę
 * 3. Ładuje i wyświetla widok
 * 4. Nasłuchuje na zmiany hash (nawigacja)
 */
startRouter();

/**
 * Zaznacz aktywny link w nawigacji
 * 
 * Dodaje klasę "active" do linku odpowiadającego aktualnemu URL
 * Dzięki temu użytkownik widzi na której stronie jest
 */
setActiveLink();
