/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: utils/rateLimit.js                                                    ║
 * ║  CO ROBI: Ogranicza częstotliwość requestów HTTP (rate limiting)            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST RATE LIMITING?
 * 
 * Wiele API ma limity requestów:
 * - Nominatim (OpenStreetMap): max 1 request/sekundę
 * - Twitter API: 300 requestów/15 min
 * - GitHub API: 60 requestów/godzinę (bez auth)
 * 
 * Jeśli przekroczysz limit:
 * - API zwróci błąd 429 (Too Many Requests)
 * - Mogą zablokować twój IP
 * 
 * ROZWIĄZANIE: Rate limiting po stronie klienta
 * Zanim wyślesz request, sprawdź czy minęło wystarczająco czasu od ostatniego.
 * Jeśli nie - poczekaj.
 */

/**
 * Mapa przechowująca timestamp ostatniego requestu dla każdego klucza
 * 
 * Map<string, number>
 * - klucz: identyfikator (np. "nominatim")
 * - wartość: timestamp ostatniego requestu (Date.now())
 */
const lastRequestByKey = new Map();

/**
 * Pomocnicza funkcja do "spania" (opóźnienia)
 * 
 * @param {number} ms - Ile milisekund czekać
 * @returns {Promise<void>} Promise który rozwiązuje się po ms
 * 
 * UŻYCIE:
 * await sleep(1000); // poczekaj 1 sekundę
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wykonuje fetch z rate limitingiem
 * 
 * PRZEPŁYW:
 * 1. Sprawdź kiedy był ostatni request z tym kluczem
 * 2. Jeśli minęło < minIntervalMs - poczekaj
 * 3. Zapisz timestamp obecnego requestu
 * 4. Wykonaj fetch
 * 
 * @param {string} url - URL do pobrania
 * @param {object} opts - Opcje
 * @param {string} opts.key - Identyfikator limitu (np. "nominatim")
 * @param {number} opts.minIntervalMs - Minimalny odstęp między requestami (ms)
 * @param {object} [opts.headers] - Nagłówki HTTP
 * @returns {Promise<Response>} Odpowiedź fetch
 * 
 * PRZYKŁAD:
 * const response = await rateLimitedFetch(url, {
 *   key: "nominatim",
 *   minIntervalMs: 1000,
 *   headers: { "User-Agent": "MyApp/1.0" }
 * });
 */
export const rateLimitedFetch = async (url, { key, minIntervalMs, headers = {} }) => {
  /**
   * Pobierz timestamp ostatniego requestu dla tego klucza
   * 
   * ?? 0 - jeśli nie ma (pierwszy request), użyj 0
   */
  const last = lastRequestByKey.get(key) ?? 0;
  
  /**
   * Oblicz ile czasu minęło od ostatniego requestu
   */
  const elapsed = Date.now() - last;
  
  /**
   * Jeśli minęło mniej niż wymagany interwał - poczekaj
   * 
   * PRZYKŁAD:
   * - minIntervalMs = 1000 (1 sekunda)
   * - elapsed = 300 (300ms od ostatniego)
   * - musimy poczekać: 1000 - 300 = 700ms
   */
  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed);
  }

  /**
   * Zapisz timestamp PRZED wysłaniem requestu
   * 
   * Dlaczego przed, a nie po?
   * Gdybyśmy zapisali po, a request trwałby 500ms,
   * następny request mógłby wystartować zbyt wcześnie.
   */
  lastRequestByKey.set(key, Date.now());

  /**
   * Wykonaj fetch
   * 
   * Object.keys(headers).length - sprawdź czy są jakieś nagłówki
   * Jeśli nie - nie przekazuj pustego obiektu (czystszy request)
   */
  return fetch(url, Object.keys(headers).length ? { headers } : {});
};
