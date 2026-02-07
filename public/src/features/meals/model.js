/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/meals/model.js                                               ║
 * ║  CO ROBI: Definicje i walidacja obiektów posiłków                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * STRUKTURA POSIŁKU:
 * {
 *   id: "abc-123",          // Unikalny identyfikator
 *   type: "meal",           // Typ (zawsze "meal")
 *   calories: 500,          // Kalorie (wymagane)
 *   description: "Obiad",   // Opis (opcjonalny)
 *   protein: 30,            // Białko w gramach
 *   carbs: 50,              // Węglowodany w gramach
 *   fats: 20,               // Tłuszcze w gramach
 *   image: Blob,            // Zdjęcie jako Blob (opcjonalne)
 *   ts: 1699123456789,      // Timestamp (kiedy zjedzono)
 *   note: "smaczne"         // Notatka (opcjonalna)
 * }
 */

import { uuid } from "../../utils/uuid.js";
import {
  MEAL_TYPE,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTE_LENGTH,
} from "../../constants.js";

/**
 * Waliduje obiekt posiłku
 * 
 * Sprawdza czy wszystkie pola są prawidłowe.
 * RZUCA BŁĄD jeśli coś jest nie tak.
 * 
 * @param {object} e - Obiekt posiłku do walidacji
 * @returns {object} Ten sam obiekt (jeśli prawidłowy)
 * @throws {Error} Jeśli dane są nieprawidłowe
 */
export const validateMeal = (e) => {
  // Sprawdź typ
  if (e.type !== MEAL_TYPE) {
    throw new Error("Nieprawidłowy typ posiłku");
  }
  
  /**
   * Kalorie muszą być liczbą > 0
   * 
   * Number.isFinite() - sprawdza czy to liczba (nie NaN, nie Infinity)
   * e.calories <= 0 - musi być dodatnia
   */
  if (!Number.isFinite(e.calories) || e.calories <= 0) {
    throw new Error("Podaj prawidłową liczbę kalorii");
  }
  
  /**
   * Makroskładniki muszą być >= 0
   * (Mogą być 0, ale nie ujemne)
   */
  if (!Number.isFinite(e.protein) || e.protein < 0) {
    throw new Error("Podaj prawidłową wartość białka");
  }
  
  if (!Number.isFinite(e.carbs) || e.carbs < 0) {
    throw new Error("Podaj prawidłową wartość węglowodanów");
  }
  
  if (!Number.isFinite(e.fats) || e.fats < 0) {
    throw new Error("Podaj prawidłową wartość tłuszczów");
  }
  
  // Timestamp musi być prawidłowy
  if (!Number.isFinite(e.ts)) {
    throw new Error("Nieprawidłowa data");
  }
  
  // Sprawdź długość tekstów
  if (e.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Opis może mieć co najwyżej ${MAX_DESCRIPTION_LENGTH} znaków.`);
  }
  
  if (e.note.length > MAX_NOTE_LENGTH) {
    throw new Error(`Notatka może mieć co najwyżej ${MAX_NOTE_LENGTH} znaków.`);
  }
  
  /**
   * Walidacja zdjęcia (jeśli jest)
   * 
   * Akceptujemy:
   * - null (brak zdjęcia)
   * - Blob z typem image/* (np. image/jpeg)
   * - String zaczynający się od "data:image/" (data URL)
   */
  if (e.image != null) {
    if (e.image instanceof Blob) {
      // Sprawdź czy Blob jest obrazem
      if (!e.image.type.startsWith("image/")) {
        throw new Error("Nieprawidłowy typ zdjęcia (oczekiwano obrazu).");
      }
    } else if (typeof e.image !== "string" || !e.image.startsWith("data:image/")) {
      // Jeśli nie Blob, musi być data URL
      throw new Error("Nieprawidłowy format zdjęcia.");
    }
  }

  return e;
};

/**
 * Tworzy nowy obiekt posiłku
 * 
 * PRZYKŁAD UŻYCIA:
 * const meal = newMeal({
 *   calories: 500,
 *   description: "Obiad",
 *   protein: 30,
 *   carbs: 50,
 *   fats: 20
 * });
 * 
 * @param {object} opts - Opcje
 * @param {number} opts.calories - Kalorie (wymagane)
 * @param {string} [opts.description] - Opis posiłku
 * @param {number} [opts.protein] - Białko w gramach
 * @param {number} [opts.carbs] - Węglowodany w gramach
 * @param {number} [opts.fats] - Tłuszcze w gramach
 * @param {Blob|null} [opts.image] - Zdjęcie jako Blob
 * @param {number} [opts.ts] - Timestamp (domyślnie teraz)
 * @param {string} [opts.note] - Notatka
 * @returns {object} Prawidłowy obiekt posiłku
 */
export const newMeal = ({
  calories,
  description = "",
  protein = 0,
  carbs = 0,
  fats = 0,
  image = null,
  ts = Date.now(),
  note = "",
}) => {
  /**
   * Stwórz obiekt posiłku
   * 
   * +calories = konwertuj na liczbę
   * `${description}` = konwertuj na string
   */
  const result = {
    id: uuid(),               // Unikalny identyfikator
    type: MEAL_TYPE,          // "meal"
    calories: +calories,      // Kalorie (liczba)
    description: `${description}`,
    protein: +protein,        // Białko (liczba)
    carbs: +carbs,            // Węglowodany (liczba)
    fats: +fats,              // Tłuszcze (liczba)
    image: image,             // Blob lub null
    ts: +ts,                  // Timestamp
    note: `${note}`,          // Notatka
  };

  // Waliduj i zwróć
  return validateMeal(result);
};
