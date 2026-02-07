/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/meals/view.js                                                ║
 * ║  CO ROBI: Widok strony posiłków (formularz + lista ze zdjęciami)            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * SPECJALNE WYZWANIE: ZDJĘCIA
 * 
 * Zdjęcia w IndexedDB są zapisane jako Blob.
 * Żeby wyświetlić Blob w <img>, musimy:
 * 1. Stworzyć Object URL: URL.createObjectURL(blob)
 * 2. Użyć go jako src: <img src="blob:http://..." />
 * 3. ZWOLNIĆ go gdy niepotrzebny: URL.revokeObjectURL(url)
 * 
 * Jeśli nie zwolnimy - MEMORY LEAK (wyciek pamięci)!
 */

import { getMealListForDisplay, addMeal } from "../../core/store.js";
import { getErrorMessage, escapeHtml, safeHtml, trusted } from "../../utils/error.js";
import { ALLOWED_IMAGE_TYPES } from "../../utils/validation.js";
import {
  CALORIES_MIN,
  CALORIES_MAX,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTE_LENGTH,
  DEFAULT_LIST_LIMIT,
} from "../../constants.js";

/**
 * Tworzy widok strony posiłków
 * 
 * @returns {Promise<{ el: HTMLElement, destroy: () => void }>}
 */
const MealsView = async () => {
  const root = document.createElement("section");

  /**
   * Wygeneruj HTML strukturę
   * 
   * ALLOWED_IMAGE_TYPES.join(",") = "image/jpeg,image/png,image/webp,image/gif"
   * Używamy tego w accept="" żeby przeglądarka pokazała tylko obrazy
   */
  root.innerHTML = `
  <div class="feature-layout">
    <!-- KOLUMNA LEWA: Formularz -->
    <div class="feature-form-col">
      <div class="card">
        <h1>Dodaj posiłek:</h1>
        <form id="meal-form" class="app-form">
          <!-- Kalorie (wymagane) -->
          <label>Kalorie
            <input name="calories" type="number" min="${CALORIES_MIN}" max="${CALORIES_MAX}" required />
          </label>
          
          <!-- Opis (opcjonalny) -->
          <label>Opis
            <input name="description" type="text" placeholder="Nazwa posiłku..." maxlength="${MAX_DESCRIPTION_LENGTH}" />
          </label>
          
          <!-- Makroskładniki (domyślnie 0) -->
          <label>Białko (g)
            <input name="protein" type="number" min="0" step="0.1" value="0" />
          </label>
          <label>Węglowodany (g)
            <input name="carbs" type="number" min="0" step="0.1" value="0" />
          </label>
          <label>Tłuszcze (g)
            <input name="fats" type="number" min="0" step="0.1" value="0" />
          </label>
          
          <!-- Data i czas (opcjonalne, domyślnie teraz) -->
          <label>Data posiłku
            <input name="date" type="date" />
          </label>
          <label>Godzina posiłku
            <input name="time" type="time" />
          </label>
          
          <!-- Zdjęcie (opcjonalne) -->
          <label>Zdjęcie
            <!-- accept ogranicza wybór do obrazów -->
            <input name="image" type="file" accept="${ALLOWED_IMAGE_TYPES.join(",")}" />
          </label>
          
          <!-- Notatka (opcjonalna) -->
          <label>Notatka
            <input name="note" type="text" placeholder="Opcjonalna..." maxlength="${MAX_NOTE_LENGTH}" />
          </label>
          
          <button class="btn" type="submit">Zapisz posiłek</button>
        </form>
        <p id="meal-msg" class="form-msg"></p>
      </div>
    </div>
    
    <!-- KOLUMNA PRAWA: Lista posiłków -->
    <div class="feature-list-col">
      <div class="card">
        <h2>Ostatnie posiłki:</h2>
        <ul id="meal-list"></ul>
      </div>
    </div>
  </div>
  `;

  // Referencje do elementów DOM
  const mealForm = root.querySelector("#meal-form");
  const mealMsg = root.querySelector("#meal-msg");
  const mealList = root.querySelector("#meal-list");
  
  /**
   * Set przechowujący Object URLs do późniejszego zwolnienia
   * 
   * Set (zbiór) bo:
   * - Automatycznie usuwa duplikaty
   * - Ma szybkie .add() i .delete()
   * - Łatwo iterować przez .forEach()
   */
  const mealListObjectUrls = new Set();

  // ═══════════════════════════════════════════════════════════════════════════
  // OBSŁUGA FORMULARZA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obsługuje wysłanie formularza posiłku
   */
  const onMealSubmit = async (e) => {
    e.preventDefault();
    mealMsg.textContent = "";
    mealMsg.className = "form-msg";
    
    const fd = new FormData(mealForm);

    try {
      /**
       * Zapisz posiłek
       * 
       * fd.get("image") - dla input type="file" zwraca obiekt File
       * (lub pusty File jeśli nic nie wybrano)
       */
      await addMeal({
        calories: fd.get("calories"),
        description: fd.get("description"),
        protein: fd.get("protein") || 0,  // Puste pole → 0
        carbs: fd.get("carbs") || 0,
        fats: fd.get("fats") || 0,
        imageFile: fd.get("image"),
        date: fd.get("date"),
        time: fd.get("time"),
        note: fd.get("note"),
      });

      mealForm.reset();
      mealMsg.className = "form-msg form-msg-success";
      mealMsg.textContent = "Zapisano posiłek!";
      
      await refreshMeals();
      
    } catch (error) {
      mealMsg.className = "form-msg form-msg-error";
      mealMsg.textContent = `Błąd: ${getErrorMessage(error)}`;
    }
  };

  mealForm.addEventListener("submit", onMealSubmit);

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Funkcja cleanup wywoływana przez router przy zmianie strony
   * 
   * MUSI:
   * 1. Usunąć event listenery
   * 2. Zwolnić Object URLs (WAŻNE - memory leak!)
   */
  const destroy = () => {
    mealForm.removeEventListener("submit", onMealSubmit);
    
    // Zwolnij wszystkie Object URLs
    mealListObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    mealListObjectUrls.clear();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDEROWANIE LISTY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Renderuje listę posiłków
   * 
   * @param {object[]} items - Tablica posiłków
   * @param {Error|null} error - Błąd (jeśli wystąpił)
   */
  const renderMealList = (items, error) => {
    /**
     * NAJPIERW zwolnij stare Object URLs
     * 
     * Przy każdym renderowaniu tworzymy nowe URL dla zdjęć.
     * Stare są niepotrzebne - musimy je zwolnić.
     */
    mealListObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    mealListObjectUrls.clear();

    // Obsłuż błąd
    if (error) {
      const li = document.createElement("li");
      li.className = "list-error";
      li.textContent = `Nie udało się załadować posiłków. ${getErrorMessage(error)}`;
      mealList.replaceChildren(li);
      return;
    }
    
    // Obsłuż pustą listę
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "Brak danych";
      mealList.replaceChildren(li);
      return;
    }

    /**
     * Wygeneruj HTML dla każdego posiłku
     */
    const parts = items.map((e) => {
      let imageUrl = null;
      
      /**
       * Obsługa zdjęcia
       * 
       * e.image może być:
       * - Blob (z IndexedDB) → użyj createObjectURL
       * - string (data URL) → użyj bezpośrednio
       * - null → brak zdjęcia
       */
      if (e.image) {
        if (e.image instanceof Blob) {
          /**
           * URL.createObjectURL(blob)
           * 
           * Tworzy tymczasowy URL który można użyć w <img src="">
           * Format: "blob:http://localhost:8001/abc-123-456"
           * 
           * MUSIMY go zwolnić przez URL.revokeObjectURL() później!
           */
          imageUrl = URL.createObjectURL(e.image);
          mealListObjectUrls.add(imageUrl);  // Zapisz do późniejszego zwolnienia
          
        } else if (typeof e.image === "string" && e.image.startsWith("data:")) {
          // Data URL można użyć bezpośrednio
          imageUrl = e.image;
        }
      }
      
      /**
       * Wygeneruj HTML zdjęcia (lub pusty string)
       * 
       * escapeHtml() dla opisu (może zawierać znaki specjalne)
       */
      const imgPart = imageUrl
        ? `<img src="${imageUrl}" alt="${escapeHtml(e.description || "Posiłek")}" class="meal-item-img" />`
        : "";
      
      /**
       * Wygeneruj cały element listy
       * 
       * safeHtml`` automatycznie escapuje interpolacje
       * trusted() oznacza HTML jako bezpieczny (nie escapuj)
       * 
       * toFixed(1) - jedna cyfra po przecinku (30.0g)
       */
      return safeHtml`<li>
        <div class="meal-item">
          ${trusted(imgPart)}
          <div class="meal-item-body">
            <div><strong>${fmtDate(e.ts)}</strong> - <strong>${e.calories} kcal</strong></div>
            <div>${e.description || ""}</div>
            <div class="meal-item-macros">B: ${e.protein.toFixed(1)}g | W: ${e.carbs.toFixed(1)}g | T: ${e.fats.toFixed(1)}g</div>
            <div class="meal-item-note"><em>${e.note || ""}</em></div>
          </div>
        </div>
      </li>`;
    });
    
    mealList.innerHTML = parts.join("");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ODŚWIEŻANIE DANYCH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Odświeża listę posiłków
   */
  const refreshMeals = async () => {
    const { items, error } = await getMealListForDisplay(DEFAULT_LIST_LIMIT);
    renderMealList(items, error);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INICJALIZACJA
  // ═══════════════════════════════════════════════════════════════════════════

  // Pobierz i wyświetl dane przy starcie
  await refreshMeals();
  
  return { el: root, destroy };
};

/**
 * Formatuje timestamp jako czytelną datę
 */
const fmtDate = (ts) => {
  return new Date(ts).toLocaleString();
};

export default MealsView;
