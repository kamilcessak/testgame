/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/measurements/model.js                                        ║
 * ║  CO ROBI: Definicje i walidacja obiektów pomiarów (ciśnienie, waga)         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST MODEL?
 * 
 * Model definiuje STRUKTURĘ danych:
 * - Jakie pola ma obiekt pomiaru?
 * - Jakie są dozwolone wartości?
 * - Jak utworzyć nowy prawidłowy obiekt?
 * 
 * Model NIE wie jak zapisać dane (to robi repo).
 * Model NIE wie jak wyświetlić dane (to robi view).
 * Model tylko DEFINIUJE co to jest "prawidłowy pomiar".
 */

import { uuid } from "../../utils/uuid.js";
import {
  MEASUREMENT_TYPE_BP,
  MEASUREMENT_TYPE_WEIGHT,
  BP_SYS_MIN,
  BP_SYS_MAX,
  BP_DIA_MIN,
  BP_DIA_MAX,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  MAX_NOTE_LENGTH,
  MAX_LOCATION_LENGTH,
} from "../../constants.js";

// ═══════════════════════════════════════════════════════════════════════════════
// WALIDACJA CIŚNIENIA KRWI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Waliduje obiekt pomiaru ciśnienia krwi
 * 
 * Sprawdza czy wszystkie pola są prawidłowe:
 * - type = "bp"
 * - value (skurczowe) w zakresie 60-250
 * - value2 (rozkurczowe) w zakresie 30-150
 * - ts to prawidłowy timestamp
 * - note nie przekracza 500 znaków
 * - location nie przekracza 200 znaków
 * 
 * RZUCA BŁĄD jeśli coś jest nie tak!
 * Dzięki temu nie zapiszemy nieprawidłowych danych.
 * 
 * @param {object} e - Obiekt pomiaru do walidacji
 * @returns {object} Ten sam obiekt (jeśli prawidłowy)
 * @throws {Error} Jeśli dane są nieprawidłowe
 */
export const validateBloodPreassure = (e) => {
  // Sprawdź typ
  if (e.type !== MEASUREMENT_TYPE_BP) {
    throw new Error("Nieprawidłowy typ pomiaru");
  }
  
  // Sprawdź czy value i value2 to liczby
  // Number.isFinite() zwraca false dla NaN, Infinity, undefined, string
  if (!Number.isFinite(e.value) || !Number.isFinite(e.value2)) {
    throw new Error("Podaj prawidłowe liczby ciśnienia");
  }
  
  // Sprawdź zakres ciśnienia skurczowego (systolic)
  if (e.value < BP_SYS_MIN || e.value > BP_SYS_MAX) {
    throw new Error(`Wartość skurczowa poza zakresem (${BP_SYS_MIN}-${BP_SYS_MAX})`);
  }
  
  // Sprawdź zakres ciśnienia rozkurczowego (diastolic)
  if (e.value2 < BP_DIA_MIN || e.value2 > BP_DIA_MAX) {
    throw new Error(`Wartość rozkurczowa poza zakresem (${BP_DIA_MIN}-${BP_DIA_MAX})`);
  }
  
  // Sprawdź czy timestamp jest prawidłowy
  if (!Number.isFinite(e.ts)) {
    throw new Error("Nieprawidłowa data");
  }
  
  // Sprawdź długość notatki
  if (e.note.length > MAX_NOTE_LENGTH) {
    throw new Error(`Notatka może mieć co najwyżej ${MAX_NOTE_LENGTH} znaków.`);
  }
  
  // Sprawdź długość lokalizacji
  if (e.location.length > MAX_LOCATION_LENGTH) {
    throw new Error(`Lokalizacja może mieć co najwyżej ${MAX_LOCATION_LENGTH} znaków.`);
  }

  // Wszystko OK - zwróć obiekt
  return e;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WALIDACJA WAGI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Waliduje obiekt pomiaru wagi
 * 
 * @param {object} e - Obiekt pomiaru do walidacji
 * @returns {object} Ten sam obiekt (jeśli prawidłowy)
 * @throws {Error} Jeśli dane są nieprawidłowe
 */
export const validateWeight = (e) => {
  if (e.type !== MEASUREMENT_TYPE_WEIGHT) {
    throw new Error("Nieprawidłowy typ pomiaru");
  }
  
  if (!Number.isFinite(e.value)) {
    throw new Error("Podaj poprawną wartość wagi");
  }
  
  // Waga musi być w zakresie 1-500 kg
  if (e.value <= 0 || e.value > WEIGHT_MAX_KG) {
    throw new Error(`Waga poza zakresem (${WEIGHT_MIN_KG} - ${WEIGHT_MAX_KG})kg`);
  }
  
  if (!Number.isFinite(e.ts)) {
    throw new Error("Nieprawidłowa Data");
  }
  
  if (e.note.length > MAX_NOTE_LENGTH) {
    throw new Error(`Notatka może mieć co najwyżej ${MAX_NOTE_LENGTH} znaków.`);
  }

  return e;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TWORZENIE NOWYCH OBIEKTÓW (Factory Functions)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tworzy nowy obiekt pomiaru ciśnienia krwi
 * 
 * FACTORY FUNCTION - funkcja która tworzy i zwraca obiekt.
 * Lepsze niż konstruktor (class) bo:
 * - Prostsze
 * - Łatwiejsze do testowania
 * - Nie wymaga 'new'
 * 
 * PRZEPŁYW:
 * 1. Przyjmij dane od użytkownika
 * 2. Stwórz obiekt z domyślnymi wartościami
 * 3. Waliduj obiekt
 * 4. Zwróć prawidłowy obiekt
 * 
 * PRZYKŁAD UŻYCIA:
 * const bp = newBloodPressure({
 *   sys: 120,
 *   dia: 80,
 *   note: "rano"
 * });
 * // bp = { id: "abc-123", type: "bp", value: 120, value2: 80, ts: 1699..., note: "rano", location: "" }
 * 
 * @param {object} opts - Opcje
 * @param {number} opts.sys - Ciśnienie skurczowe
 * @param {number} opts.dia - Ciśnienie rozkurczowe
 * @param {number} [opts.ts] - Timestamp (domyślnie teraz)
 * @param {string} [opts.note] - Notatka (domyślnie pusta)
 * @param {string} [opts.location] - Lokalizacja (domyślnie pusta)
 * @returns {object} Prawidłowy obiekt pomiaru
 */
export const newBloodPressure = ({ sys, dia, ts = Date.now(), note = "", location = "" }) => {
  /**
   * Stwórz obiekt pomiaru
   * 
   * +sys = konwertuj na liczbę (+"123" = 123)
   * `${note}` = konwertuj na string (null → "null", więc używamy domyślnej wartości)
   */
  const result = {
    id: uuid(),                    // Unikalny identyfikator
    type: MEASUREMENT_TYPE_BP,     // Typ: "bp"
    value: +sys,                   // Ciśnienie skurczowe (konwersja na liczbę)
    value2: +dia,                  // Ciśnienie rozkurczowe
    ts: +ts,                       // Timestamp (konwersja na liczbę)
    note: `${note}`,               // Notatka (konwersja na string)
    location: `${location}`,       // Lokalizacja (konwersja na string)
  };

  // Waliduj i zwróć
  // Jeśli walidacja nie przejdzie - rzuci błąd
  return validateBloodPreassure(result);
};

/**
 * Tworzy nowy obiekt pomiaru wagi
 * 
 * PRZYKŁAD UŻYCIA:
 * const weight = newWeight({
 *   kg: 75.5,
 *   note: "po śniadaniu"
 * });
 * // weight = { id: "def-456", type: "weight", value: 75.5, ts: 1699..., note: "po śniadaniu" }
 * 
 * @param {object} opts - Opcje
 * @param {number} opts.kg - Waga w kilogramach
 * @param {number} [opts.ts] - Timestamp (domyślnie teraz)
 * @param {string} [opts.note] - Notatka (domyślnie pusta)
 * @returns {object} Prawidłowy obiekt pomiaru
 */
export const newWeight = ({ kg, ts = Date.now(), note = "" }) => {
  const result = {
    id: uuid(),                    // Unikalny identyfikator
    type: MEASUREMENT_TYPE_WEIGHT, // Typ: "weight"
    value: +kg,                    // Waga w kg
    ts: +ts,                       // Timestamp
    note: `${note}`,               // Notatka
  };

  return validateWeight(result);
};
