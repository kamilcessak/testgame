/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: utils/error.js                                                        ║
 * ║  CO ROBI: Obsługa błędów i ochrona przed XSS                                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * TEN PLIK ZAWIERA:
 * 1. getErrorMessage() - wyciąga czytelny komunikat z błędu
 * 2. escapeHtml() - chroni przed atakami XSS
 * 3. safeHtml() - template tag do bezpiecznego generowania HTML
 * 4. trusted() - oznacza HTML jako bezpieczny (nie escapuj)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// KOMUNIKATY BŁĘDÓW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wyciąga czytelny komunikat z błędu
 * 
 * PROBLEM:
 * Błąd może być:
 * - new Error("coś poszło nie tak") - obiekt Error
 * - "coś poszło nie tak" - string
 * - { message: "coś" } - obiekt
 * - null, undefined - nic
 * 
 * Ta funkcja ZAWSZE zwraca czytelny string.
 * 
 * @param {Error|string|unknown} error - Błąd (dowolny typ)
 * @returns {string} Czytelny komunikat
 * 
 * PRZYKŁADY:
 * getErrorMessage(new Error("Brak połączenia")) → "Brak połączenia"
 * getErrorMessage("Błąd") → "Błąd"
 * getErrorMessage(null) → "Wystąpił nieznany błąd"
 */
export const getErrorMessage = (error) => {
  // Obiekt Error - weź message
  if (error instanceof Error) return error.message;
  
  // String - zwróć bezpośrednio
  if (typeof error === "string") return error;
  
  // Cokolwiek innego - konwertuj na string
  return String(error ?? "Wystąpił nieznany błąd");
};

// ═══════════════════════════════════════════════════════════════════════════════
// OCHRONA PRZED XSS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Zamienia znaki specjalne HTML na encje (escapowanie)
 * 
 * CO TO JEST XSS?
 * 
 * XSS (Cross-Site Scripting) to atak gdzie złośliwy JavaScript
 * jest wstrzyknięty na stronę przez dane użytkownika.
 * 
 * PRZYKŁAD ATAKU:
 * User wpisuje jako notatkę: <script>alert("hacked")</script>
 * 
 * BEZ ESCAPOWANIA:
 * div.innerHTML = userInput;
 * → Skrypt się WYKONA! Przeglądarka myśli że to kod strony.
 * 
 * Z ESCAPOWANIEM:
 * div.innerHTML = escapeHtml(userInput);
 * → Wyświetli się TEKST: "<script>alert("hacked")</script>"
 * 
 * ZAMIENIANE ZNAKI:
 * & → &amp;   (ampersand)
 * < → &lt;    (less than)
 * > → &gt;    (greater than)
 * " → &quot;  (cudzysłów)
 * ' → &#39;  (apostrof)
 * 
 * @param {string} s - Tekst do escapowania
 * @returns {string} Bezpieczny tekst
 */
export const escapeHtml = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,  // Znajdź te znaki
    (c) =>       // Dla każdego znaku
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])  // Zamień na encję
  );

// ═══════════════════════════════════════════════════════════════════════════════
// BEZPIECZNE GENEROWANIE HTML
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Symbol używany do oznaczania zaufanych wartości
 * 
 * Symbol to unikalny identyfikator - nie można go przypadkiem utworzyć.
 * Używamy go jako "znacznik" że wartość jest bezpieczna.
 */
const TRUSTED = Symbol("trusted");

/**
 * Oznacza wartość jako zaufaną (nie będzie escapowana)
 * 
 * KIEDY UŻYWAĆ?
 * - Gdy masz HTML który SAM utworzyłeś i wiesz że jest bezpieczny
 * - Np. <img src="data:image/..."> - data URL który sam wygenerowałeś
 * 
 * KIEDY NIE UŻYWAĆ?
 * - Dla danych od użytkownika!
 * - Dla danych z zewnętrznych źródeł!
 * 
 * @param {string} value - Wartość zaufana
 * @returns {{ [TRUSTED]: true, value: string }} Obiekt z oznaczeniem
 * 
 * PRZYKŁAD:
 * safeHtml`<div>${trusted("<img src='photo.jpg'/>")}</div>`
 * → <div><img src='photo.jpg'/></div>
 */
export const trusted = (value) => ({ [TRUSTED]: true, value: String(value ?? "") });

/**
 * Template tag do bezpiecznego generowania HTML
 * 
 * CO TO JEST TEMPLATE TAG?
 * 
 * Template literal: `Hello ${name}`
 * Template TAG: myTag`Hello ${name}`
 * 
 * Tag to funkcja która otrzymuje:
 * - strings: tablica stałych części ["Hello ", ""]
 * - values: tablica interpolacji [name]
 * 
 * DZIAŁANIE safeHtml:
 * 1. Dla każdej interpolacji (${...})
 * 2. Jeśli jest trusted() - użyj bez zmian
 * 3. Jeśli nie - escapuj HTML
 * 
 * @param {TemplateStringsArray} strings - Stałe części szablonu
 * @param {...any} values - Interpolacje
 * @returns {string} Bezpieczny HTML
 * 
 * PRZYKŁAD:
 * const userInput = '<script>alert("xss")</script>';
 * safeHtml`<div>${userInput}</div>`
 * → <div>&lt;script&gt;alert("xss")&lt;/script&gt;</div>
 * 
 * const safeImg = '<img src="photo.jpg">';
 * safeHtml`<div>${trusted(safeImg)}</div>`
 * → <div><img src="photo.jpg"></div>
 */
export const safeHtml = (strings, ...values) => {
  /**
   * Przetwórz każdą wartość
   */
  const processed = values.map((v) =>
    /**
     * Sprawdź czy wartość jest oznaczona jako trusted
     * 
     * v != null - nie jest null/undefined
     * typeof v === "object" - jest obiektem
     * TRUSTED in v - ma klucz TRUSTED
     * v[TRUSTED] === true - wartość to true
     */
    v != null && typeof v === "object" && TRUSTED in v && v[TRUSTED] === true
      ? v.value  // Zaufana - użyj bez zmian
      : escapeHtml(String(v ?? ""))  // Niezaufana - escapuj
  );
  
  /**
   * Złóż strings i processed na przemian
   * 
   * strings: ["<div>", "</div>"]
   * processed: ["Hello"]
   * wynik: "<div>" + "Hello" + "</div>"
   * 
   * reduce() iteruje przez strings i dodaje processed na przemian:
   * acc = ""
   * + "<div>" + "Hello" = "<div>Hello"
   * + "</div>" + "" = "<div>Hello</div>"
   */
  return strings.reduce((acc, s, i) => acc + s + (processed[i] ?? ""), "");
};
