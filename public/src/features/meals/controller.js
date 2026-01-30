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

export const toTimestamp = (date, time) => parseDateTime(date, time);

// Waliduje plik i kompresuje do Blob
const imageFileToBlob = async (imageFile) => {
  if (imageFile == null) return null;
  const file = assertImageFile(imageFile, MAX_IMAGE_INPUT_SIZE);
  if (!file) return null;
  return resizeImageToBlob(file, {
    maxDimension: MAX_IMAGE_DIMENSION,
    quality: IMAGE_JPEG_QUALITY,
  });
};

// Dodaje nowy posiłek do bazy danych
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
  const caloriesVal = assertNumberInRange(
    assertRequired(calories, "Kalorie"),
    CALORIES_MIN,
    CALORIES_MAX,
    "Kalorie"
  );
  const descriptionStr = optionalString(description, MAX_DESCRIPTION_LENGTH);
  const proteinVal = assertNonNegativeNumber(protein ?? 0, "Białko (g)");
  const carbsVal = assertNonNegativeNumber(carbs ?? 0, "Węglowodany (g)");
  const fatsVal = assertNonNegativeNumber(fats ?? 0, "Tłuszcze (g)");
  const ts = parseDateTime(date, time);
  const noteStr = optionalString(note, MAX_NOTE_LENGTH);
  const imageBlob = await imageFileToBlob(imageFile);

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

  return repo.add(entry);
};

// Pobiera listę ostatnich posiłków
export const getMealList = (limit = DEFAULT_LIST_LIMIT) => {
  return repo.latestByType(MEAL_TYPE, limit);
};

// Zwraca dane do wyświetlenia listy posiłków
export const getMealListForDisplay = async (limit = DEFAULT_LIST_LIMIT) => {
  try {
    const items = await getMealList(limit);
    return { items, error: null };
  } catch (e) {
    return { items: [], error: e };
  }
};

// Pobiera wszystkie posiłki z dzisiejszego dnia
export const getTodayMeals = async () => {
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  ).getTime();
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  const allMeals = await repo.latestByType(MEAL_TYPE, MEALS_TODAY_FETCH_LIMIT);
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

// Oblicza sumę kalorii z dzisiejszych posiłków
export const getTodayCalories = async () => {
  const meals = await getTodayMeals();
  return meals.reduce((sum, meal) => sum + meal.calories, 0);
};
