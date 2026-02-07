/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: utils/debounce.js                                                     ║
 * ║  CO ROBI: Opóźnia wywołanie funkcji (debounce pattern)                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST DEBOUNCE?
 * 
 * Debounce to technika opóźniania wywołania funkcji.
 * "Poczekaj aż użytkownik przestanie [coś robić] i dopiero wtedy wywołaj funkcję."
 * 
 * PRZYKŁAD BEZ DEBOUNCE:
 * User wpisuje "hello" w polu wyszukiwania
 * → search("h")
 * → search("he")
 * → search("hel")
 * → search("hell")
 * → search("hello")
 * = 5 wywołań funkcji search!
 * 
 * PRZYKŁAD Z DEBOUNCE (300ms):
 * User wpisuje "hello" (szybko, w ciągu 200ms)
 * → [poczekaj 300ms...]
 * → search("hello")
 * = 1 wywołanie!
 * 
 * KIEDY UŻYWAĆ DEBOUNCE?
 * - Wyszukiwanie podczas pisania
 * - Zapisywanie formularza podczas edycji
 * - Nawigacja (jak w tym projekcie)
 * - Resize okna
 * - Scroll
 */

/**
 * Zwraca opóźnioną wersję funkcji
 * 
 * PRZEPŁYW:
 * 1. Wywołujesz debounced("a")
 * 2. Timer startuje (300ms)
 * 3. Wywołujesz debounced("b") przed końcem timera
 * 4. Stary timer ANULOWANY, nowy timer startuje
 * 5. Nic nie wywołujesz przez 300ms
 * 6. fn("b") zostaje wywołana
 * 
 * @param {Function} fn - Funkcja do opóźnienia
 * @param {number} ms - Opóźnienie w milisekundach
 * @returns {Function} Opóźniona wersja funkcji
 * 
 * PRZYKŁAD UŻYCIA:
 * const debouncedSearch = debounce(search, 300);
 * input.addEventListener("input", (e) => debouncedSearch(e.target.value));
 */
export const debounce = (fn, ms) => {
  /**
   * Przechowuje ID timera
   * null = brak aktywnego timera
   */
  let timeoutId = null;

  /**
   * Opóźniona funkcja
   * 
   * ...args = wszystkie argumenty przekazane do funkcji
   * (spread operator zbiera je do tablicy)
   */
  const debounced = (...args) => {
    /**
     * Jeśli jest aktywny timer - anuluj go
     * 
     * clearTimeout(id) - anuluje timer utworzony przez setTimeout
     * Dzięki temu każde nowe wywołanie "resetuje" opóźnienie
     */
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    /**
     * Ustaw nowy timer
     * 
     * setTimeout(() => ..., ms) - wywołaj funkcję po ms milisekundach
     * Zwraca ID timera (do późniejszego anulowania)
     */
    timeoutId = setTimeout(() => {
      // Wyczyść ID (timer się wykonał)
      timeoutId = null;
      // Wywołaj oryginalną funkcję z argumentami
      fn(...args);
    }, ms);
  };

  return debounced;
};
