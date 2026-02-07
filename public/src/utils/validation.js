/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: utils/validation.js                                                   ║
 * ║  CO ROBI: Funkcje walidacyjne do sprawdzania danych z formularzy            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * DLACZEGO WALIDACJA?
 * 
 * 1. BEZPIECZEŃSTWO - nie zapisuj śmieci do bazy
 * 2. UX - pokaż użytkownikowi czytelny błąd
 * 3. SPÓJNOŚĆ - dane zawsze mają oczekiwany format
 * 
 * ZASADA: "Nie ufaj danym od użytkownika"
 * 
 * Nawet jeśli HTML ma min="60" max="250", użytkownik może:
 * - Edytować HTML w DevTools
 * - Wysłać request bezpośrednio (bez formularza)
 * - Wkleić tekst zamiast liczby
 * 
 * ZAWSZE WALIDUJ PO STRONIE SERWERA/APLIKACJI!
 */

/**
 * Pomocnicza funkcja - usuwa białe znaki z początku i końca
 */
const trim = (v) => (typeof v === "string" ? v.trim() : v);

// ═══════════════════════════════════════════════════════════════════════════════
// WALIDACJA WYMAGANYCH PÓL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sprawdza czy pole nie jest puste
 * 
 * @param {unknown} value - Wartość do sprawdzenia
 * @param {string} fieldName - Nazwa pola (do komunikatu błędu)
 * @returns {string} Wartość po trim (jeśli prawidłowa)
 * @throws {Error} Jeśli pole jest puste
 * 
 * PRZYKŁADY:
 * assertRequired("hello", "Nazwa") → "hello"
 * assertRequired("  ", "Nazwa") → Error: Pole "Nazwa" jest wymagane.
 * assertRequired(null, "Nazwa") → Error: Pole "Nazwa" jest wymagane.
 */
export const assertRequired = (value, fieldName) => {
  // Konwertuj na string i usuń białe znaki
  const s = value != null ? trim(String(value)) : "";
  
  if (s === "") {
    throw new Error(`Pole "${fieldName}" jest wymagane.`);
  }
  
  return s;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WALIDACJA LICZB
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sprawdza czy wartość jest liczbą w określonym zakresie
 * 
 * @param {unknown} value - Wartość do sprawdzenia
 * @param {number} min - Minimalna wartość (włącznie)
 * @param {number} max - Maksymalna wartość (włącznie)
 * @param {string} fieldName - Nazwa pola (do komunikatu błędu)
 * @returns {number} Wartość jako liczba (jeśli prawidłowa)
 * @throws {Error} Jeśli nie jest liczbą lub poza zakresem
 * 
 * PRZYKŁADY:
 * assertNumberInRange("120", 60, 250, "Ciśnienie") → 120
 * assertNumberInRange("abc", 60, 250, "Ciśnienie") → Error: musi być liczbą
 * assertNumberInRange("300", 60, 250, "Ciśnienie") → Error: musi być od 60 do 250
 */
export const assertNumberInRange = (value, min, max, fieldName) => {
  /**
   * Number(value) - konwertuj na liczbę
   * 
   * Number("123") → 123
   * Number("12.5") → 12.5
   * Number("abc") → NaN
   * Number("") → 0
   * Number(null) → 0
   */
  const n = Number(value);
  
  /**
   * Number.isFinite(n) - sprawdź czy to "normalna" liczba
   * 
   * Zwraca false dla:
   * - NaN (Not a Number)
   * - Infinity
   * - -Infinity
   * 
   * W przeciwieństwie do globalnego isFinite(),
   * NIE konwertuje argumentu na liczbę.
   */
  if (!Number.isFinite(n)) {
    throw new Error(`Pole "${fieldName}" musi być liczbą.`);
  }
  
  // Sprawdź zakres
  if (n < min || n > max) {
    throw new Error(`Pole "${fieldName}" musi być od ${min} do ${max}.`);
  }
  
  return n;
};

/**
 * Sprawdza czy wartość jest liczbą >= 0
 * 
 * @param {unknown} value - Wartość do sprawdzenia
 * @param {string} fieldName - Nazwa pola
 * @returns {number} Wartość jako liczba
 * @throws {Error} Jeśli ujemna lub nie jest liczbą
 */
export const assertNonNegativeNumber = (value, fieldName) => {
  const n = Number(value);
  
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Pole "${fieldName}" musi być liczbą nieujemną.`);
  }
  
  return n;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WALIDACJA TEKSTÓW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sprawdza czy tekst nie przekracza maksymalnej długości
 * 
 * @param {unknown} value - Wartość do sprawdzenia
 * @param {number} maxLength - Maksymalna liczba znaków
 * @param {string} fieldName - Nazwa pola
 * @returns {string} Wartość jako string
 * @throws {Error} Jeśli za długa
 */
export const assertMaxLength = (value, maxLength, fieldName) => {
  const s = value != null ? String(value) : "";
  
  if (s.length > maxLength) {
    throw new Error(`Pole "${fieldName}" może mieć co najwyżej ${maxLength} znaków.`);
  }
  
  return s;
};

/**
 * Waliduje opcjonalny tekst (może być pusty)
 * 
 * @param {unknown} value - Wartość do sprawdzenia
 * @param {number} maxLength - Maksymalna długość (0 = bez limitu)
 * @returns {string} Wartość po trim (lub pusty string)
 * @throws {Error} Jeśli za długa
 * 
 * PRZYKŁADY:
 * optionalString("hello", 500) → "hello"
 * optionalString(null, 500) → ""
 * optionalString("  abc  ", 500) → "abc"
 */
export const optionalString = (value, maxLength = 0) => {
  const s = value != null ? trim(String(value)) : "";
  
  if (maxLength > 0 && s.length > maxLength) {
    throw new Error(`Tekst może mieć co najwyżej ${maxLength} znaków.`);
  }
  
  return s;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WALIDACJA DATY I CZASU
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parsuje datę i czas z formularza do timestamp
 * 
 * FORMATY WEJŚCIOWE:
 * - date: "YYYY-MM-DD" (format HTML input type="date")
 * - time: "HH:MM" (format HTML input type="time")
 * 
 * ZACHOWANIE:
 * - Oba puste → Date.now() (teraz)
 * - Tylko data → data o 00:00
 * - Tylko czas → dzisiaj o podanej godzinie
 * - Oba podane → podana data i czas
 * 
 * @param {string|undefined} date - Data w formacie YYYY-MM-DD
 * @param {string|undefined} time - Czas w formacie HH:MM
 * @returns {number} Timestamp (milisekundy od 1970)
 * @throws {Error} Jeśli format nieprawidłowy
 */
export const parseDateTime = (date, time) => {
  // Sprawdź czy wartości są podane (nie puste)
  const hasDate = date != null && trim(String(date)) !== "";
  const hasTime = time != null && trim(String(time)) !== "";

  // Oba puste → zwróć teraz
  if (!hasDate && !hasTime) return Date.now();

  /**
   * Przygotuj wartości
   * 
   * Jeśli brak daty → użyj dzisiejszej
   * Jeśli brak czasu → użyj 00:00
   */
  const d = hasDate ? trim(String(date)) : new Date().toISOString().slice(0, 10);
  const t = hasTime ? trim(String(time)) : "00:00";

  /**
   * Parsuj datę
   * 
   * "2024-01-15".split("-") → ["2024", "01", "15"]
   * .map(Number) → [2024, 1, 15]
   */
  const parts = d.split("-").map(Number);
  const [year, month, day] = parts;
  
  // Sprawdź czy data jest prawidłowa
  if (parts.length !== 3 || !Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error("Nieprawidłowy format daty (oczekiwano RRRR-MM-DD).");
  }

  /**
   * Parsuj czas
   * 
   * "14:30".split(":") → ["14", "30"]
   * .map(Number) → [14, 30]
   */
  const timeParts = t.split(":").map(Number);
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  
  // Sprawdź czy czas jest prawidłowy
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Nieprawidłowa godzina (oczekiwano GG:MM).");
  }

  /**
   * Stwórz datę LOKALNĄ
   * 
   * new Date(year, month, day, hours, minutes)
   * UWAGA: month jest 0-indexed! Styczeń = 0, Grudzień = 11
   * Dlatego month - 1
   */
  const localDate = new Date(year, month - 1, day, hours, minutes);
  const ts = localDate.getTime();
  
  // Sprawdź czy data jest prawidłowa (np. 31 lutego nie istnieje)
  if (!Number.isFinite(ts)) {
    throw new Error("Nieprawidłowa data lub godzina.");
  }
  
  return ts;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WALIDACJA PLIKÓW OBRAZÓW
// ═══════════════════════════════════════════════════════════════════════════════

/** Maksymalny rozmiar pliku (5 MB) */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Dozwolone typy MIME dla obrazów */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Waliduje plik obrazu
 * 
 * @param {File|null|undefined} file - Plik do walidacji
 * @param {number} maxSize - Maksymalny rozmiar w bajtach
 * @returns {File|null} Plik (jeśli prawidłowy) lub null (jeśli brak)
 * @throws {Error} Jeśli plik nieprawidłowy
 */
export const assertImageFile = (file, maxSize = MAX_IMAGE_SIZE) => {
  // Brak pliku = OK
  if (file == null) return null;
  
  // Sprawdź czy to obiekt File
  if (!(file instanceof File)) {
    throw new Error("Zdjęcie musi być plikiem (nie tekstem ani innym obiektem).");
  }
  
  // Pusty plik = OK (user nic nie wybrał)
  if (file.size === 0) return null;

  /**
   * Sprawdź typ MIME
   * 
   * file.type to np. "image/jpeg", "image/png"
   */
  const type = file.type && String(file.type).toLowerCase().trim();
  
  if (!type || !ALLOWED_IMAGE_TYPES.includes(type)) {
    throw new Error("Dozwolone formaty zdjęć: JPG, PNG, WebP, GIF.");
  }
  
  // Sprawdź rozmiar
  if (file.size > maxSize) {
    throw new Error(`Zdjęcie może mieć co najwyżej ${Math.round(maxSize / 1024 / 1024)} MB.`);
  }
  
  return file;
};

/**
 * Sprawdza czy wartość jest prawidłowym Blob obrazu (lub null)
 * 
 * Używane w walidacji modelu (model.js)
 * 
 * @param {any} value - Wartość do sprawdzenia
 * @returns {boolean} true jeśli prawidłowy
 */
export const isValidImageBlob = (value) =>
  value == null ||  // null jest OK
  (value instanceof Blob && value.type.startsWith("image/"));  // Blob z typem image/*
