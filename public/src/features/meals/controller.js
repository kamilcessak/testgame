import { newMeal } from "./model.js";
import * as repo from "./repo.js";

export const toTimestamp = (date, time) => {
  if (!date && !time) return Date.now();

  const d = date || new Date().toISOString().slice(0, 10);
  const t = time || "00:00";
  const iso = `${d}T${t}:00`;
  const ts = Date.parse(iso);

  if (!Number.isFinite(ts)) throw new Error("Nieprawidłowa data/godzina");

  return ts;
};

export const addMeal = async ({ calories, description, protein, carbs, fats, image, date, time, note }) => {
  const ts = toTimestamp(date, time);
  const entry = newMeal({ calories, description, protein, carbs, fats, image, ts, note });

  return repo.add(entry);
};

export const getMealList = (limit = 20) => {
  return repo.latestByType("meal", limit);
};

export const getTodayMeals = async () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  return repo.getByDateRange(startOfDay, endOfDay);
};

export const getTodayCalories = async () => {
  const meals = await getTodayMeals();
  return meals.reduce((sum, meal) => sum + meal.calories, 0);
};

