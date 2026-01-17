import { newMeal } from "./model.js";
import * as repo from "./repo.js";

export const toTimestamp = (date, time) => {
  const hasDate = date && date.trim() !== "";
  const hasTime = time && time.trim() !== "";

  if (!hasDate && !hasTime) return Date.now();

  const d = hasDate ? date : new Date().toISOString().slice(0, 10);
  const t = hasTime ? time : "00:00";

  const [year, month, day] = d.split("-").map(Number);
  const [hours, minutes] = t.split(":").map(Number);

  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error("Nieprawidłowa data");
  }
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error("Nieprawidłowa godzina");
  }

  const localDate = new Date(year, month - 1, day, hours, minutes);
  const ts = localDate.getTime();

  if (!Number.isFinite(ts)) throw new Error("Nieprawidłowa data/godzina");

  return ts;
};

// Dodaje nowy posiłek do bazy danych
export const addMeal = async ({
  calories,
  description,
  protein,
  carbs,
  fats,
  image,
  date,
  time,
  note,
}) => {
  const ts = toTimestamp(date, time);
  const entry = newMeal({
    calories,
    description,
    protein,
    carbs,
    fats,
    image,
    ts,
    note,
  });

  return repo.add(entry);
};

// Pobiera listę ostatnich posiłków
export const getMealList = (limit = 20) => {
  return repo.latestByType("meal", limit);
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

  const allMeals = await repo.latestByType("meal", 100);
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
