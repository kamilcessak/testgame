import { getMealListForDisplay, addMeal } from "./controller.js";
import { invalidateSummaryCache } from "../dashboard/controller.js";
import { getErrorMessage, escapeHtml, safeHtml, trusted } from "../../utils/error.js";
import { ALLOWED_IMAGE_TYPES } from "../../utils/validation.js";
import {
  CALORIES_MIN,
  CALORIES_MAX,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTE_LENGTH,
  DEFAULT_LIST_LIMIT,
} from "../../constants.js";

const MealsView = async () => {
  const root = document.createElement("section");

  root.innerHTML = `
  <div class="feature-layout">
    <div class="feature-form-col">
      <div class="card">
        <h1>Dodaj posiłek:</h1>
        <form id="meal-form" class="app-form">
          <label>Kalorie
            <input name="calories" type="number" min="${CALORIES_MIN}" max="${CALORIES_MAX}" required />
          </label>
          <label>Opis
            <input name="description" type="text" placeholder="Nazwa posiłku..." maxlength="${MAX_DESCRIPTION_LENGTH}" />
          </label>
          <label>Białko (g)
            <input name="protein" type="number" min="0" step="0.1" value="0" />
          </label>
          <label>Węglowodany (g)
            <input name="carbs" type="number" min="0" step="0.1" value="0" />
          </label>
          <label>Tłuszcze (g)
            <input name="fats" type="number" min="0" step="0.1" value="0" />
          </label>
          <label>Data posiłku
            <input name="date" type="date" />
          </label>
          <label>Godzina posiłku
            <input name="time" type="time" />
          </label>
          <label>Zdjęcie
            <input name="image" type="file" accept="${ALLOWED_IMAGE_TYPES.join(",")}" />
          </label>
          <label>Notatka
            <input name="note" type="text" placeholder="Opcjonalna..." maxlength="${MAX_NOTE_LENGTH}" />
          </label>
          <button class="btn" type="submit">Zapisz posiłek</button>
        </form>
        <p id="meal-msg" class="form-msg"></p>
      </div>
    </div>
    <div class="feature-list-col">
      <div class="card">
        <h2>Ostatnie posiłki:</h2>
        <ul id="meal-list"></ul>
      </div>
    </div>
  </div>
  `;

  const mealForm = root.querySelector("#meal-form");
  const mealMsg = root.querySelector("#meal-msg");
  const mealList = root.querySelector("#meal-list");
  const mealListObjectUrls = new Set();

  const onMealSubmit = async (e) => {
    e.preventDefault();
    mealMsg.textContent = "";
    mealMsg.className = "form-msg";
    const fd = new FormData(mealForm);

    try {
      await addMeal({
        calories: fd.get("calories"),
        description: fd.get("description"),
        protein: fd.get("protein") || 0,
        carbs: fd.get("carbs") || 0,
        fats: fd.get("fats") || 0,
        imageFile: fd.get("image"),
        date: fd.get("date"),
        time: fd.get("time"),
        note: fd.get("note"),
      });

      mealForm.reset();
      invalidateSummaryCache();
      mealMsg.className = "form-msg form-msg-success";
      mealMsg.textContent = "Zapisano posiłek!";
      await refreshMeals();
    } catch (error) {
      mealMsg.className = "form-msg form-msg-error";
      mealMsg.textContent = `Błąd: ${getErrorMessage(error)}`;
    }
  };

  mealForm.addEventListener("submit", onMealSubmit);

  const destroy = () => {
    mealForm.removeEventListener("submit", onMealSubmit);
    mealListObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    mealListObjectUrls.clear();
  };

  const renderMealList = (items, error) => {
    mealListObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    mealListObjectUrls.clear();

    if (error) {
      const li = document.createElement("li");
      li.className = "list-error";
      li.textContent = `Nie udało się załadować posiłków. ${getErrorMessage(error)}`;
      mealList.replaceChildren(li);
      return;
    }
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "Brak danych";
      mealList.replaceChildren(li);
      return;
    }

    const parts = items.map((e) => {
      let imageUrl = null;
      if (e.image) {
        if (e.image instanceof Blob) {
          imageUrl = URL.createObjectURL(e.image);
          mealListObjectUrls.add(imageUrl);
        } else if (typeof e.image === "string" && e.image.startsWith("data:")) {
          imageUrl = e.image;
        }
      }
      const imgPart = imageUrl
        ? `<img src="${imageUrl}" alt="${escapeHtml(e.description || "Posiłek")}" class="meal-item-img" />`
        : "";
      return safeHtml`<li><div class="meal-item">${trusted(imgPart)}<div class="meal-item-body"><div><strong>${fmtDate(e.ts)}</strong> - <strong>${e.calories} kcal</strong></div><div>${e.description || ""}</div><div class="meal-item-macros">B: ${e.protein.toFixed(1)}g | W: ${e.carbs.toFixed(1)}g | T: ${e.fats.toFixed(1)}g</div><div class="meal-item-note"><em>${e.note || ""}</em></div></div></div></li>`;
    });
    mealList.innerHTML = parts.join("");
  };

  const refreshMeals = async () => {
    const { items, error } = await getMealListForDisplay(DEFAULT_LIST_LIMIT);
    renderMealList(items, error);
  };

  await refreshMeals();
  return { el: root, destroy };
};

const fmtDate = (ts) => {
  return new Date(ts).toLocaleString();
};

export default MealsView;

