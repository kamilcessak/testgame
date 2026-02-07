/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/meals/controller.js                                          ║
 * ║  CO ROBI: Logika biznesowa posiłków (walidacja, kompresja obrazów, zapis)   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { newMeal } from "./model.js";
import * as repo from "./repo.js";
import {
  assertRequired,
  assertNumberInRange,
  assertNonNegativeNumber,
  parseDateTime,
  optionalString,
  assertImageFile,
} from "../../utils/validation.js";
import { resizeImageToBlob } from "../../utils/image.js";
import {
  CALORIES_MIN,
  CALORIES_MAX,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTE_LENGTH,
  MEAL_TYPE,
  MEALS_TODAY_FETCH_LIMIT,
  DEFAULT_LIST_LIMIT,
  MAX_IMAGE_INPUT_SIZE,
  MAX_IMAGE_DIMENSION,
  IMAGE_JPEG_QUALITY,
} from "../../constants.js";

/**
 * Pomocnicza funkcja do parsowania daty i czasu
 */
export const toTimestamp = (date, time) => parseDateTime(date, time);

// ═══════════════════════════════════════════════════════════════════════════════
// PRZETWARZANIE OBRAZÓW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Waliduje i kompresuje plik obrazu
 * 
 * PRZEPŁYW:
 * 1. Sprawdź czy plik istnieje i jest prawidłowy
 * 2. Przeskaluj do max 1024px
 * 3. Skompresuj do JPEG z jakością 82%
 * 4. Zwróć Blob
 * 
 * DLACZEGO KOMPRESJA?
 * 
 * Zdjęcie z telefonu może mieć:
 * - 12 megapikseli (4000x3000)
 * - 5 MB rozmiaru
 * 
 * Po kompresji:
 * - Max 1024x1024 pikseli
 * - ~200 KB rozmiaru
 * 
 * IndexedDB ma ograniczoną pojemność, więc mniejsze pliki to:
 * - Więcej miejsca na dane
 * - Szybsze ładowanie
 * - Szybsze renderowanie
 * 
 * @param {File|null|undefined} imageFile - Plik z input type="file"
 * @returns {Promise<Blob|null>} Skompresowany Blob lub null
 */
const imageFileToBlob = async (imageFile) => {
  // Brak pliku = null
  if (imageFile == null) return null;
  
  /**
   * assertImageFile() sprawdza:
   * - Czy to instancja File
   * - Czy typ to image/* (JPG, PNG, WebP, GIF)
   * - Czy rozmiar <= MAX_IMAGE_INPUT_SIZE (10 MB)
   * 
   * Zwraca File lub null (jeśli plik jest pusty)
   * Rzuca Error jeśli nieprawidłowy
   */
  const file = assertImageFile(imageFile, MAX_IMAGE_INPUT_SIZE);
  if (!file) return null;
  
  /**
   * resizeImageToBlob() - skaluje i kompresuje obraz
   * 
   * maxDimension: 1024 - max szerokość LUB wysokość (zachowuje proporcje)
   * quality: 0.82 - jakość JPEG (82%)
   */
  return resizeImageToBlob(file, {
    maxDimension: MAX_IMAGE_DIMENSION,
    quality: IMAGE_JPEG_QUALITY,
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// DODAWANIE POSIŁKÓW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dodaje nowy posiłek
 * 
 * PRZEPŁYW:
 * 1. Waliduj wszystkie pola
 * 2. Skompresuj zdjęcie (jeśli jest)
 * 3. Stwórz obiekt posiłku
 * 4. Zapisz do bazy
 * 
 * @param {object} data - Dane z formularza
 * @param {string|number} data.calories - Kalorie (wymagane)
 * @param {string} [data.description] - Opis posiłku
 * @param {string|number} [data.protein] - Białko w gramach
 * @param {string|number} [data.carbs] - Węglowodany w gramach
 * @param {string|number} [data.fats] - Tłuszcze w gramach
 * @param {File} [data.imageFile] - Plik zdjęcia
 * @param {string} [data.date] - Data (YYYY-MM-DD)
 * @param {string} [data.time] - Czas (HH:MM)
 * @param {string} [data.note] - Notatka
 * @returns {Promise<object>} Zapisany posiłek
 */
export const addMeal = async ({
  calories,
  description,
  protein,
  carbs,
  fats,
  imageFile,
  date,
  time,
  note,
}) => {
  /**
   * WALIDACJA KALORII
   * 
   * assertRequired() - sprawdza czy pole nie jest puste
   * assertNumberInRange() - sprawdza zakres 1-99999
   */
  const caloriesVal = assertNumberInRange(
    assertRequired(calories, "Kalorie"),
    CALORIES_MIN,
    CALORIES_MAX,
    "Kalorie"
  );
  
  /**
   * WALIDACJA OPISU (opcjonalny)
   * 
   * optionalString() - akceptuje null/undefined, ogranicza długość
   */
  const descriptionStr = optionalString(description, MAX_DESCRIPTION_LENGTH);
  
  /**
   * WALIDACJA MAKROSKŁADNIKÓW
   * 
   * ?? 0 - jeśli null/undefined, użyj 0
   * assertNonNegativeNumber() - musi być >= 0
   */
  const proteinVal = assertNonNegativeNumber(protein ?? 0, "Białko (g)");
  const carbsVal = assertNonNegativeNumber(carbs ?? 0, "Węglowodany (g)");
  const fatsVal = assertNonNegativeNumber(fats ?? 0, "Tłuszcze (g)");
  
  /**
   * PARSOWANIE DATY/CZASU
   */
  const ts = parseDateTime(date, time);
  
  /**
   * WALIDACJA NOTATKI (opcjonalna)
   */
  const noteStr = optionalString(note, MAX_NOTE_LENGTH);
  
  /**
   * PRZETWARZANIE ZDJĘCIA
   * 
   * To może chwilę trwać (skalowanie w canvas)
   */
  const imageBlob = await imageFileToBlob(imageFile);

  /**
   * TWORZENIE OBIEKTU POSIŁKU
   */
  const entry = newMeal({
    calories: caloriesVal,
    description: descriptionStr,
    protein: proteinVal,
    carbs: carbsVal,
    fats: fatsVal,
    image: imageBlob,
    ts,
    note: noteStr,
  });

  /**
   * ZAPIS DO BAZY
   */
  return repo.add(entry);
};

// ═══════════════════════════════════════════════════════════════════════════════
// POBIERANIE POSIŁKÓW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pobiera listę ostatnich posiłków
 * 
 * @param {number} limit - Ile posiłków pobrać
 * @returns {Promise<object[]>} Lista posiłków (najnowsze pierwsze)
 */
export const getMealList = (limit = DEFAULT_LIST_LIMIT) => {
  return repo.latestByType(MEAL_TYPE, limit);
};

/**
 * Pobiera posiłki z obsługą błędów (dla widoków)
 * 
 * @returns {Promise<{ items: object[], error: Error|null }>}
 */
export const getMealListForDisplay = async (limit = DEFAULT_LIST_LIMIT) => {
  try {
    const items = await getMealList(limit);
    return { items, error: null };
  } catch (e) {
    return { items: [], error: e };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// KALORIE DZISIEJSZE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pobiera wszystkie posiłki z dzisiejszego dnia
 * 
 * UWAGA: "Dzisiaj" to lokalna data użytkownika, nie UTC!
 * 
 * @returns {Promise<object[]>} Posiłki z dzisiaj
 */
export const getTodayMeals = async () => {
  const now = new Date();
  
  /**
   * Początek dnia - 00:00:00.000
   * 
   * new Date(year, month, day, hours, minutes, seconds, ms)
   */
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0, 0, 0, 0
  ).getTime();
  
  /**
   * Koniec dnia - 23:59:59.999
   */
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23, 59, 59, 999
  ).getTime();

  /**
   * Pobierz ostatnie posiłki (do limitu)
   * 
   * UWAGA: Używamy latestByType zamiast getByDateRange bo:
   * 1. Jest prostsze
   * 2. Działa wystarczająco dobrze dla typowego użycia
   * 3. getByDateRange może być wolniejsze dla dużych baz
   */
  const allMeals = await repo.latestByType(MEAL_TYPE, MEALS_TODAY_FETCH_LIMIT);
  
  /**
   * Filtruj tylko dzisiejsze
   * 
   * Porównujemy rok, miesiąc i dzień (nie timestamp!)
   * bo timestamp zależy od godziny
   */
  const todayMeals = allMeals.filter((meal) => {
    const mealDate = new Date(meal.ts);
    const isToday =
      mealDate.getFullYear() === now.getFullYear() &&
      mealDate.getMonth() === now.getMonth() &&
      mealDate.getDate() === now.getDate();
    return isToday;
  });

  return todayMeals;
};

/**
 * Oblicza sumę kalorii z dzisiejszych posiłków
 * 
 * UŻYWANE NA DASHBOARDZIE
 * 
 * @returns {Promise<number>} Suma kalorii
 */
export const getTodayCalories = async () => {
  const meals = await getTodayMeals();
  
  /**
   * Array.reduce() - redukuje tablicę do jednej wartości
   * 
   * PRZEPŁYW:
   * 1. Zacznij od sum = 0
   * 2. Dla każdego posiłku: sum = sum + meal.calories
   * 3. Zwróć końcową sumę
   * 
   * PRZYKŁAD:
   * [{ calories: 300 }, { calories: 500 }, { calories: 200 }]
   * → 0 + 300 = 300
   * → 300 + 500 = 800
   * → 800 + 200 = 1000
   * → wynik: 1000
   */
  return meals.reduce((sum, meal) => sum + meal.calories, 0);
};
