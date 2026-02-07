/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: constants.js                                                          ║
 * ║  CO ROBI: Przechowuje wszystkie "magiczne liczby" i stałe teksty            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * DLACZEGO STAŁE W OSOBNYM PLIKU?
 * 
 * Wyobraź sobie, że w 10 miejscach kodu masz napisane "20" jako limit listy.
 * Teraz klient mówi: "zmień na 50". Musisz szukać wszystkich "20" i modyfikować.
 * 
 * Ze stałymi:
 * - Piszesz DEFAULT_LIST_LIMIT w 10 miejscach
 * - Zmieniasz TYLKO TUTAJ z 20 na 50
 * - Gotowe!
 * 
 * DODATKOWO:
 * - Kod jest bardziej czytelny (co oznacza BP_SYS_MIN? -> minimalny skurczowy)
 * - Łatwiej zrozumieć intencję programisty
 * - IDE podpowiada nazwy stałych
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BAZA DANYCH IndexedDB
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Nazwa bazy danych IndexedDB
 * IndexedDB to lokalna baza danych w przeglądarce (działa offline)
 */
export const DB_NAME = "healthDB";

/**
 * Wersja schematu bazy danych
 * 
 * WAŻNE: Gdy zmieniasz strukturę bazy (dodajesz pola, indeksy), MUSISZ podbić wersję!
 * Inaczej przeglądarka nie wykona migracji i stare dane mogą być niekompatybilne.
 * 
 * Przykład: dodajesz pole "location" do pomiarów → zmień na DB_VERSION = 3
 */
export const DB_VERSION = 2;

/**
 * Nazwa "object store" dla pomiarów (ciśnienie, waga)
 * 
 * Object Store to odpowiednik TABELI w SQL
 * Przechowuje obiekty JavaScript z unikalnym kluczem (id)
 */
export const STORE_MEASUREMENTS = "measurements";

/**
 * Nazwa object store dla posiłków
 */
export const STORE_MEALS = "meals";

/**
 * Nazwa object store dla ustawień użytkownika (np. cel kalorii)
 * Obecnie nieużywany, ale przygotowany na przyszłość
 */
export const STORE_SETTINGS = "settings";

/**
 * Nazwa indeksu do sortowania po czasie (timestamp)
 * 
 * INDEKS w bazie danych to jak spis treści w książce:
 * - Bez indeksu: musisz przejrzeć WSZYSTKIE rekordy żeby znaleźć najnowsze
 * - Z indeksem: od razu wiesz gdzie są najnowsze
 */
export const INDEX_BY_TS = "by_ts";

/**
 * Nazwa indeksu do filtrowania po typie (bp/weight/meal)
 * Pozwala szybko znaleźć "tylko pomiary ciśnienia" bez przeglądania wszystkiego
 */
export const INDEX_BY_TYPE = "by_type";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPY WPISÓW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Typ: pomiar ciśnienia krwi (Blood Pressure)
 * Używany w polu "type" obiektu pomiaru
 */
export const MEASUREMENT_TYPE_BP = "bp";

/**
 * Typ: pomiar wagi
 */
export const MEASUREMENT_TYPE_WEIGHT = "weight";

/**
 * Typ: posiłek
 */
export const MEAL_TYPE = "meal";

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITY LIST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Domyślna liczba elementów do wyświetlenia na liście
 * 
 * Dlaczego 20?
 * - Wystarczająco dużo żeby zobaczyć historię
 * - Nie za dużo żeby nie obciążać pamięci (szczególnie ze zdjęciami)
 */
export const DEFAULT_LIST_LIMIT = 20;

/**
 * Limit przy pobieraniu posiłków z dzisiaj (do liczenia kalorii)
 * 
 * 100 posiłków dziennie to zdecydowanie więcej niż ktokolwiek zje,
 * ale zostawiamy margines bezpieczeństwa
 */
export const MEALS_TODAY_FETCH_LIMIT = 100;

/**
 * Ile ostatnich pomiarów pokazać na dashboardzie
 * 1 = tylko najnowszy pomiar wagi i ciśnienia
 */
export const DASHBOARD_LATEST_COUNT = 1;

// ═══════════════════════════════════════════════════════════════════════════════
// KALORIE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Domyślny dzienny cel kalorii
 * 2000 kcal to średnia wartość dla dorosłego człowieka
 */
export const CALORIES_TARGET_DEFAULT = 2000;

/**
 * Minimalna liczba kalorii w posiłku
 * 1 kcal - bo 0 nie ma sensu (zjadłeś coś czy nie?)
 */
export const CALORIES_MIN = 1;

/**
 * Maksymalna liczba kalorii w posiłku
 * 99999 - teoretycznie ktoś mógłby wpisać cały dzień w jeden wpis
 */
export const CALORIES_MAX = 99999;

// ═══════════════════════════════════════════════════════════════════════════════
// WALIDACJA CIŚNIENIA KRWI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ciśnienie SKURCZOWE (Systolic) - góra
 * To jest ciśnienie gdy serce się KURCZY i pompuje krew
 * 
 * Normalne: 90-120 mmHg
 * Wysokie: > 140 mmHg
 * Bardzo niskie: < 90 mmHg
 * 
 * Min 60 i Max 250 to wartości MOŻLIWE ale ekstremalne
 */
export const BP_SYS_MIN = 60;   // mmHg - bardzo niskie ale możliwe
export const BP_SYS_MAX = 250;  // mmHg - kryzys nadciśnieniowy

/**
 * Ciśnienie ROZKURCZOWE (Diastolic) - dół
 * To jest ciśnienie gdy serce ODPOCZYWA między uderzeniami
 * 
 * Normalne: 60-80 mmHg
 * Wysokie: > 90 mmHg
 */
export const BP_DIA_MIN = 30;   // mmHg - bardzo niskie
export const BP_DIA_MAX = 150;  // mmHg - ekstremalnie wysokie

// ═══════════════════════════════════════════════════════════════════════════════
// WALIDACJA WAGI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimalna waga
 * 1 kg - teoretycznie mogłoby być dziecko/zwierzę
 */
export const WEIGHT_MIN_KG = 1;

/**
 * Maksymalna waga
 * 500 kg - rekord świata to ~600kg, 500 to bezpieczny limit
 */
export const WEIGHT_MAX_KG = 500;

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITY TEKSTÓW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maksymalna długość notatki
 * 500 znaków to ~100 słów - wystarczy na krótki opis
 */
export const MAX_NOTE_LENGTH = 500;

/**
 * Maksymalna długość opisu posiłku
 */
export const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Maksymalna długość lokalizacji
 * 200 znaków wystarczy na pełny adres
 */
export const MAX_LOCATION_LENGTH = 200;

// ═══════════════════════════════════════════════════════════════════════════════
// TIMING (OPÓŹNIENIA, TIMEOUTY)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Debounce dla renderowania routera (ms)
 * 
 * DEBOUNCE = "poczekaj aż user przestanie klikać"
 * 
 * Przykład: user szybko klika różne linki nawigacji
 * Bez debounce: renderuj 5 razy (bo 5 kliknięć)
 * Z debounce 80ms: renderuj RAZ (ostatnią stronę)
 * 
 * 80ms to na tyle krótko że user nie zauważy opóźnienia
 */
export const RENDER_DEBOUNCE_MS = 80;

/**
 * Czas życia cache podsumowania dashboardu (ms)
 * 
 * TTL = Time To Live (jak długo dane są "świeże")
 * 30 sekund = jeśli user przełącza między stronami, 
 * nie odpytujemy bazy za każdym razem
 */
export const DASHBOARD_CACHE_TTL_MS = 30_000; // 30 sekund

/**
 * Timeout dla geolokalizacji (ms)
 * 
 * GPS może działać wolno (szczególnie w budynku)
 * 10 sekund to rozsądny limit zanim pokażemy błąd
 */
export const GEOLOCATION_TIMEOUT_MS = 10000; // 10 sekund

// ═══════════════════════════════════════════════════════════════════════════════
// API NOMINATIM (Geokodowanie)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bazowy URL API Nominatim (OpenStreetMap)
 * 
 * NOMINATIM to darmowe API do:
 * - Reverse geocoding: współrzędne GPS → adres
 * - Geocoding: adres → współrzędne GPS
 */
export const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

/**
 * Minimalny odstęp między requestami do Nominatim (ms)
 * 
 * RATE LIMIT - API Nominatim wymaga max 1 request na sekundę
 * Jeśli wyślesz więcej, mogą zablokować twój IP
 */
export const NOMINATIM_MIN_INTERVAL_MS = 1000; // 1 sekunda

/**
 * User-Agent dla requestów do Nominatim
 * 
 * API wymaga identyfikacji aplikacji (żeby wiedzieć kto używa)
 * To jest "wizytówka" naszej aplikacji
 */
export const NOMINATIM_USER_AGENT = "PerfectHealth/1.0 (health tracker; contact: local)";

// ═══════════════════════════════════════════════════════════════════════════════
// OBRAZY (Zdjęcia posiłków)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maksymalny rozmiar pliku wejściowego (bajty)
 * 
 * 10 MB - zdjęcia z nowoczesnych telefonów mogą być duże
 * Akceptujemy duże pliki, ale potem je kompresujemy
 */
export const MAX_IMAGE_INPUT_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Maksymalny wymiar obrazu po przeskalowaniu (px)
 * 
 * 1024px - wystarczająco duże żeby dobrze wyglądać
 * ale nie za duże żeby nie zajmować za dużo miejsca w bazie
 */
export const MAX_IMAGE_DIMENSION = 1024;

/**
 * Jakość kompresji JPEG (0-1)
 * 
 * 0.82 = 82% jakości - dobry kompromis między jakością a rozmiarem
 * Przy 1.0 plik byłby ogromny, przy 0.5 wyglądałby źle
 */
export const IMAGE_JPEG_QUALITY = 0.82;

/**
 * Docelowy maksymalny rozmiar obrazu wyjściowego (bajty)
 * 
 * 800 KB - po kompresji zdjęcie powinno być mniejsze
 * To jest cel, nie twarda granica
 */
export const MAX_IMAGE_OUTPUT_SIZE = 800 * 1024; // 800 KB
