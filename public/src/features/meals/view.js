import { getMealList, addMeal } from "./controller.js";

const MealsView = async () => {
  const root = document.createElement("section");

  root.innerHTML = `
  <div class="mealsWrapper">
    <div class="mealsFormWrapper">
      <div class="card">
        <h1>Dodaj posiłek:</h1>
        <form id="meal-form">
          <label>Kalorie
            <input name="calories" type="number" min="1" required />
          </label>
          <label>Opis
            <input name="description" type="text" placeholder="Nazwa posiłku..." />
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
            <input name="image" type="file" accept="image/*" />
          </label>
          <label>Notatka
            <input name="note" type="text" placeholder="Opcjonalna..." />
          </label>
          <button class="btn" type="submit">Zapisz posiłek</button>
        </form>
        <p id="meal-msg" style="margin-top:16px"></p>
      </div>
    </div>
    <div class="mealsListWrapper">
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

  mealForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    mealMsg.textContent = "";
    const fd = new FormData(mealForm);

    try {
      let imageData = null;
      const imageFile = fd.get("image");
      
      if (imageFile && imageFile.size > 0) {
        imageData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      }

      await addMeal({
        calories: fd.get("calories"),
        description: fd.get("description"),
        protein: fd.get("protein") || 0,
        carbs: fd.get("carbs") || 0,
        fats: fd.get("fats") || 0,
        image: imageData,
        date: fd.get("date"),
        time: fd.get("time"),
        note: fd.get("note"),
      });

      mealForm.reset();
      mealMsg.style.color = "#0a7";
      mealMsg.textContent = "Zapisano posiłek!";
      await refreshMeals();
    } catch (error) {
      mealMsg.style.color = "#c00";
      mealMsg.textContent = `Błąd: ${error?.message || error}`;
    }
  });

  const refreshMeals = async () => {
    const items = await getMealList(20);

    if (!items.length) {
      mealList.innerHTML = `<li>Brak danych</li>`;
      return;
    }

    mealList.innerHTML = items
      .map(
        (e) => `
          <li>
            <div style="display: flex; gap: 16px; align-items: start;">
              ${e.image ? `<img src="${e.image}" alt="${escapeHtml(e.description || 'Posiłek')}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;" />` : ''}
              <div style="flex: 1;">
                <div><strong>${fmtDate(e.ts)}</strong> - <strong>${e.calories} kcal</strong></div>
                ${e.description ? `<div>${escapeHtml(e.description)}</div>` : ''}
                <div style="font-size: 0.9em; color: #666; margin-top: 4px;">
                  B: ${e.protein.toFixed(1)}g | W: ${e.carbs.toFixed(1)}g | T: ${e.fats.toFixed(1)}g
                </div>
                ${e.note ? `<div style="font-size: 0.85em; color: #888; margin-top: 4px;"><em>${escapeHtml(e.note)}</em></div>` : ''}
              </div>
            </div>
          </li>
        `
      )
      .join("");
  };

  await refreshMeals();
  return root;
};

const fmtDate = (ts) => {
  return new Date(ts).toLocaleString();
};

const escapeHtml = (s) => {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
};

export default MealsView;

