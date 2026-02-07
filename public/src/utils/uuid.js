/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: utils/uuid.js                                                         ║
 * ║  CO ROBI: Generuje unikalne identyfikatory (UUID)                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST UUID?
 * 
 * UUID (Universally Unique Identifier) to unikalny identyfikator.
 * Wygląda tak: "550e8400-e29b-41d4-a716-446655440000"
 * 
 * DLACZEGO UUID A NIE AUTO-INCREMENT?
 * 
 * W bazie SQL często używa się ID: 1, 2, 3, 4...
 * Problem: potrzebujesz bazy żeby wiedzieć następne ID.
 * 
 * UUID możesz wygenerować BEZ BAZY:
 * - Działasz offline? Generujesz UUID.
 * - Synchronizujesz z serwerem? UUID się nie zduplikuje.
 * 
 * UUID V4 (losowy):
 * - 128 bitów losowych danych
 * - 2^122 możliwych kombinacji
 * - Szansa kolizji: praktycznie zerowa
 */

/**
 * Generuje unikalny identyfikator
 * 
 * PRZEPŁYW:
 * 1. Sprawdź czy przeglądarka ma crypto.randomUUID()
 * 2. Jeśli tak - użyj go (standardowy UUID v4)
 * 3. Jeśli nie - stwórz własny fallback
 * 
 * @returns {string} Unikalny identyfikator
 * 
 * PRZYKŁAD:
 * uuid() → "550e8400-e29b-41d4-a716-446655440000" (z crypto)
 * uuid() → "1699123456789-a3f2b1c4d5e6" (fallback)
 */
export const uuid = () =>
  /**
   * Sprawdź czy przeglądarka obsługuje crypto.randomUUID()
   * 
   * typeof crypto !== "undefined" - sprawdź czy crypto istnieje
   * crypto.randomUUID - sprawdź czy ma metodę randomUUID
   */
  (typeof crypto !== "undefined" && crypto.randomUUID)
    /**
     * crypto.randomUUID() - standardowa metoda generowania UUID v4
     * Dostępna w nowoczesnych przeglądarkach (Chrome 92+, Firefox 95+, Safari 15.4+)
     * 
     * Zwraca: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
     * gdzie x to hex, 4 to wersja, y to wariant
     */
    ? crypto.randomUUID()
    /**
     * FALLBACK dla starszych przeglądarek
     * 
     * Nie jest prawdziwym UUID, ale wystarczająco unikalny:
     * - Date.now() - timestamp w milisekundach (unikalne w czasie)
     * - Math.random() - losowa liczba (unikalne w danej chwili)
     * - .toString(16) - konwersja na hex
     * - .slice(2) - usuń "0." z początku
     * 
     * Wynik: "1699123456789-a3f2b1c4d5e6"
     */
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
