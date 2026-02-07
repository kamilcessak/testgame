/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/measurements/controller.js                                   ║
 * ║  CO ROBI: Logika biznesowa pomiarów (walidacja, geolokacja, zapis)          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO ROBI CONTROLLER POMIARÓW?
 * 
 * 1. WALIDACJA - sprawdza czy dane od użytkownika są prawidłowe
 * 2. TRANSFORMACJA - zamienia dane z formularza na format bazy
 * 3. GEOLOKACJA - pobiera lokalizację GPS i zamienia na adres
 * 4. KOORDYNACJA - łączy model i repo
 */

import { newBloodPressure, newWeight } from "./model.js";
import * as repo from "./repo.js";
import {
  assertNumberInRange,
  parseDateTime,
  optionalString,
} from "../../utils/validation.js";
import { rateLimitedFetch } from "../../utils/rateLimit.js";
import {
  BP_SYS_MIN,
  BP_SYS_MAX,
  BP_DIA_MIN,
  BP_DIA_MAX,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  MAX_NOTE_LENGTH,
  MAX_LOCATION_LENGTH,
  MEASUREMENT_TYPE_BP,
  MEASUREMENT_TYPE_WEIGHT,
  DEFAULT_LIST_LIMIT,
  GEOLOCATION_TIMEOUT_MS,
  NOMINATIM_BASE_URL,
  NOMINATIM_MIN_INTERVAL_MS,
  NOMINATIM_USER_AGENT,
} from "../../constants.js";

// ═══════════════════════════════════════════════════════════════════════════════
// POMOCNICZE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parsuje datę i czas do timestamp
 * 
 * Po prostu re-eksportuje parseDateTime z validation.js
 * żeby było wygodniej importować w jednym miejscu
 */
export const toTimestamp = (date, time) => parseDateTime(date, time);

// ═══════════════════════════════════════════════════════════════════════════════
// GEOLOKACJA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pobiera aktualne współrzędne GPS
 * 
 * PRZEPŁYW:
 * 1. Sprawdź czy przeglądarka obsługuje geolokację
 * 2. Poproś o pozwolenie (przeglądarka pokaże okno)
 * 3. Poczekaj na pozycję GPS
 * 4. Zwróć { latitude, longitude }
 * 
 * UWAGI:
 * - Wymaga HTTPS (lub localhost) - ograniczenie bezpieczeństwa
 * - User musi dać pozwolenie - może odmówić
 * - W budynkach może być niedokładne lub wolne
 * 
 * @returns {Promise<{ latitude: number, longitude: number }>} Współrzędne
 * @throws {Error} Gdy geolokacja niedostępna lub user odmówił
 */
export const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    // Sprawdź czy przeglądarka obsługuje geolokację
    if (!navigator.geolocation) {
      reject(new Error("Geolokacja nie jest obsługiwana przez twoją przeglądarkę"));
      return;
    }
    
    /**
     * navigator.geolocation.getCurrentPosition(success, error, options)
     * 
     * success = callback gdy sukces, dostaje obiekt Position
     * error = callback gdy błąd
     * options:
     *   - enableHighAccuracy: true = użyj GPS (dokładniejsze ale wolniejsze)
     *   - timeout: max czas oczekiwania (ms)
     *   - maximumAge: 0 = zawsze pobierz nową pozycję (nie używaj cache)
     */
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),  // position.coords = { latitude, longitude, ... }
      reject,                                  // przekaż błąd do reject
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,       // 10 sekund
        maximumAge: 0,
      }
    );
  });

/**
 * Zamienia współrzędne GPS na adres (reverse geocoding)
 * 
 * UŻYWA API NOMINATIM (OpenStreetMap)
 * 
 * PRZEPŁYW:
 * 1. Wyślij request do Nominatim z lat/lon
 * 2. Poczekaj na odpowiedź (JSON z adresem)
 * 3. Złóż adres z części (ulica, numer, miasto)
 * 4. Zwróć string z adresem
 * 
 * RATE LIMITING:
 * Nominatim wymaga max 1 request/sekundę
 * rateLimitedFetch() automatycznie czeka jeśli potrzeba
 * 
 * @param {number} latitude - Szerokość geograficzna
 * @param {number} longitude - Długość geograficzna
 * @returns {Promise<string>} Adres lub "lat, lon" gdy błąd
 */
export const resolveAddressFromCoords = async (latitude, longitude) => {
  /**
   * Zbuduj URL do API Nominatim
   * 
   * /reverse = reverse geocoding (współrzędne → adres)
   * format=json = odpowiedź jako JSON
   * zoom=18 = poziom szczegółowości (18 = budynek)
   * addressdetails=1 = dołącz szczegóły adresu (ulica, miasto, itp.)
   */
  const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
  
  /**
   * Wyślij request z rate limitingiem
   * 
   * key: "nominatim" = identyfikator limitu (wszystkie requesty do Nominatim)
   * minIntervalMs: 1000 = min 1 sekunda między requestami
   * headers: User-Agent wymagany przez API
   */
  const response = await rateLimitedFetch(url, {
    key: "nominatim",
    minIntervalMs: NOMINATIM_MIN_INTERVAL_MS,
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
  });

  /**
   * Jeśli request się nie powiódł, zwróć współrzędne
   */
  if (!response.ok) {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  /**
   * Parsuj odpowiedź JSON
   */
  const data = await response.json();
  const address = data.address;
  
  /**
   * Jeśli brak adresu, zwróć współrzędne
   */
  if (!address) {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  /**
   * Złóż adres z dostępnych części
   * 
   * Nominatim zwraca różne pola w zależności od lokalizacji:
   * - road = ulica
   * - house_number = numer domu
   * - city/town/village = miejscowość
   */
  const parts = [];
  
  if (address.road) parts.push(address.road);
  if (address.house_number) parts.push(address.house_number);
  if (address.city || address.town || address.village) {
    parts.push(address.city || address.town || address.village);
  }
  
  /**
   * Zwróć złożony adres, lub display_name z API, lub współrzędne
   */
  return (
    parts.join(", ") ||
    data.display_name ||
    `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DODAWANIE POMIARÓW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dodaje nowy pomiar ciśnienia krwi
 * 
 * PRZEPŁYW:
 * 1. Waliduj dane wejściowe
 * 2. Parsuj datę/czas do timestamp
 * 3. Stwórz obiekt pomiaru (newBloodPressure)
 * 4. Zapisz do bazy (repo.add)
 * 5. Zwróć zapisany obiekt
 * 
 * @param {object} data - Dane z formularza
 * @param {string|number} data.sys - Ciśnienie skurczowe
 * @param {string|number} data.dia - Ciśnienie rozkurczowe
 * @param {string} [data.date] - Data pomiaru (YYYY-MM-DD)
 * @param {string} [data.time] - Godzina pomiaru (HH:MM)
 * @param {string} [data.note] - Notatka
 * @param {string} [data.location] - Lokalizacja
 * @returns {Promise<object>} Zapisany pomiar
 * @throws {Error} Gdy dane są nieprawidłowe
 */
export const addBp = async ({ sys, dia, date, time, note, location }) => {
  /**
   * WALIDACJA
   * 
   * assertNumberInRange() sprawdza czy wartość jest liczbą w zakresie
   * Jeśli nie - rzuca Error z czytelną wiadomością
   */
  const sysVal = assertNumberInRange(sys, BP_SYS_MIN, BP_SYS_MAX, "Skurczowe (mmHg)");
  const diaVal = assertNumberInRange(dia, BP_DIA_MIN, BP_DIA_MAX, "Rozkurczowe (mmHg)");
  
  /**
   * parseDateTime() zamienia date + time na timestamp
   * Jeśli oba puste - zwraca Date.now()
   */
  const ts = parseDateTime(date, time);
  
  /**
   * optionalString() - opcjonalny tekst z limitem długości
   * Jeśli null/undefined - zwraca ""
   * Jeśli za długi - rzuca Error
   */
  const noteStr = optionalString(note, MAX_NOTE_LENGTH);
  const locationStr = optionalString(location, MAX_LOCATION_LENGTH);

  /**
   * Stwórz obiekt pomiaru
   * 
   * newBloodPressure() tworzy prawidłowy obiekt z:
   * - unikalnym ID
   * - type: "bp"
   * - walidacją
   */
  const entry = newBloodPressure({
    sys: sysVal,
    dia: diaVal,
    ts,
    note: noteStr,
    location: locationStr,
  });

  /**
   * Zapisz do bazy i zwróć
   */
  return repo.add(entry);
};

/**
 * Dodaje nowy pomiar wagi
 * 
 * @param {object} data - Dane z formularza
 * @param {string|number} data.kg - Waga w kilogramach
 * @param {string} [data.date] - Data pomiaru
 * @param {string} [data.time] - Godzina pomiaru
 * @param {string} [data.note] - Notatka
 * @returns {Promise<object>} Zapisany pomiar
 */
export const addWeight = async ({ kg, date, time, note }) => {
  const kgVal = assertNumberInRange(kg, WEIGHT_MIN_KG, WEIGHT_MAX_KG, "Waga (kg)");
  const ts = parseDateTime(date, time);
  const noteStr = optionalString(note, MAX_NOTE_LENGTH);

  const entry = newWeight({ kg: kgVal, ts, note: noteStr });

  return repo.add(entry);
};

// ═══════════════════════════════════════════════════════════════════════════════
// POBIERANIE POMIARÓW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pobiera listę pomiarów ciśnienia
 * 
 * @param {number} limit - Ile pomiarów pobrać
 * @returns {Promise<object[]>} Lista pomiarów (najnowsze pierwsze)
 */
export const getBpList = (limit = DEFAULT_LIST_LIMIT) => {
  return repo.latestByType(MEASUREMENT_TYPE_BP, limit);
};

/**
 * Pobiera listę pomiarów wagi
 */
export const getWeightList = (limit = DEFAULT_LIST_LIMIT) => {
  return repo.latestByType(MEASUREMENT_TYPE_WEIGHT, limit);
};

// ═══════════════════════════════════════════════════════════════════════════════
// POBIERANIE Z OBSŁUGĄ BŁĘDÓW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pobiera pomiary ciśnienia z obsługą błędów
 * 
 * Zamiast rzucać błąd, zwraca { items, error }
 * Łatwiejsze do użycia w widokach
 * 
 * @returns {Promise<{ items: object[], error: Error|null }>}
 */
export const getBpListForDisplay = async (limit = DEFAULT_LIST_LIMIT) => {
  try {
    const items = await getBpList(limit);
    return { items, error: null };
  } catch (e) {
    return { items: [], error: e };
  }
};

/**
 * Pobiera pomiary wagi z obsługą błędów
 */
export const getWeightListForDisplay = async (limit = DEFAULT_LIST_LIMIT) => {
  try {
    const items = await getWeightList(limit);
    return { items, error: null };
  } catch (e) {
    return { items: [], error: e };
  }
};
