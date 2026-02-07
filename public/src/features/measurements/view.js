/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/measurements/view.js                                         ║
 * ║  CO ROBI: Widok strony pomiarów (formularze + listy)                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * STRUKTURA STRONY POMIARÓW:
 * 
 * ┌─────────────────────┬─────────────────────┐
 * │ FORMULARZ CIŚNIENIA │ LISTA CIŚNIEŃ       │
 * │ - skurczowe         │ - 120/80 mmHg       │
 * │ - rozkurczowe       │ - 115/75 mmHg       │
 * │ - data/czas         │ - ...               │
 * │ - lokalizacja       │                     │
 * │ - notatka           │                     │
 * │ [ZAPISZ]            │                     │
 * ├─────────────────────┼─────────────────────┤
 * │ FORMULARZ WAGI      │ LISTA WAG           │
 * │ - waga kg           │ - 75.5 kg           │
 * │ - data/czas         │ - 75.2 kg           │
 * │ - notatka           │ - ...               │
 * │ [ZAPISZ]            │                     │
 * └─────────────────────┴─────────────────────┘
 */

import {
  getCurrentPosition,
  resolveAddressFromCoords,
} from "./controller.js";
import {
  getBpListForDisplay,
  getWeightListForDisplay,
  addBp,
  addWeight,
} from "../../core/store.js";
import { getErrorMessage, escapeHtml, safeHtml, trusted } from "../../utils/error.js";
import {
  BP_SYS_MIN,
  BP_SYS_MAX,
  BP_DIA_MIN,
  BP_DIA_MAX,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  MAX_NOTE_LENGTH,
  MAX_LOCATION_LENGTH,
  DEFAULT_LIST_LIMIT,
} from "../../constants.js";

/**
 * Tworzy widok strony pomiarów
 * 
 * @returns {Promise<{ el: HTMLElement, destroy: () => void }>}
 */
const MeasurementsView = async () => {
  /**
   * Stwórz główny kontener
   */
  const root = document.createElement("section");

  /**
   * Wygeneruj HTML strukturę strony
   * 
   * UWAGA: Używamy innerHTML z wartościami ze stałych (bezpieczne)
   * Dane użytkownika escapujemy później przez escapeHtml()
   */
  root.innerHTML = `
  <div class="feature-layout">
    <!-- KOLUMNA LEWA: Formularze -->
    <div class="feature-form-col">
      
      <!-- FORMULARZ CIŚNIENIA KRWI -->
      <div class="card">
          <h1>Dodaj pomiar ciśnienia:</h1>
          <form id="bp-form" class="app-form">
              <label>Skurczowe
                  <!-- min/max z stałych dla walidacji HTML5 -->
                  <input name="sys" type="number" min="${BP_SYS_MIN}" max="${BP_SYS_MAX}" required />
              </label>
              <label>Rozkurczowe
                  <input name="dia" type="number" min="${BP_DIA_MIN}" max="${BP_DIA_MAX}" required />
              </label>
              <label>Data pomiaru
                  <input name="date" type="date" />
              </label>
              <label>Godzina pomiaru
                  <input name="time" type="time" />
              </label>
              <label>Lokalizacja
                  <div class="location-input-row">
                      <input name="location" type="text" placeholder="Opcjonalna..." class="location-input" maxlength="${MAX_LOCATION_LENGTH}" />
                      <button type="button" id="get-location-btn" class="btn btn-location">📍 Pobierz</button>
                  </div>
              </label>
              <label>Notatka
                  <input name="note" type="text" placeholder="Opcjonalna..." maxlength="${MAX_NOTE_LENGTH}" />
              </label>
              <button class="btn" type="submit">Zapisz pomiar</button>
          </form>
          <!-- Komunikaty (sukces/błąd) -->
          <p id="bp-msg" class="form-msg"></p>
      </div>

      <!-- FORMULARZ WAGI -->
      <div class="card">
        <h1>Dodaj pomiar wagi:</h1>
        <form id="weight-form" class="app-form">
          <label>Waga (kg)
            <!-- step="0.1" pozwala na wartości dziesiętne jak 75.5 -->
            <input name="kg" type="number" step="0.1" min="${WEIGHT_MIN_KG}" max="${WEIGHT_MAX_KG}" required />
          </label>
          <label>Data pomiaru
              <input name="date" type="date" />
          </label>
          <label>Godzina pomiaru
              <input name="time" type="time" />
          </label>
          <label>Notatka
              <input name="note" type="text" placeholder="Opcjonalna..." maxlength="${MAX_NOTE_LENGTH}" />
          </label>
          <button class="btn" type="submit">Zapisz pomiar</button>
        </form>
        <p id="weight-msg" class="form-msg"></p>
      </div>
    </div>
    
    <!-- KOLUMNA PRAWA: Listy pomiarów -->
    <div class="feature-list-col">
      <div class="card">
          <h2>Ostatnie pomiary ciśnienia:</h2>
          <!-- Lista będzie wypełniona przez JavaScript -->
          <ul id="bp-list"></ul>
      </div>

      <div class="card">
          <h2>Ostatnie pomiary wagi:</h2>
          <ul id="weight-list"></ul>
      </div>
    </div>
  </div>
  `;

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCJE DO ELEMENTÓW DOM
  // ═══════════════════════════════════════════════════════════════════════════

  // Formularz i elementy ciśnienia
  const bpForm = root.querySelector("#bp-form");
  const bpMsg = root.querySelector("#bp-msg");
  const bpList = root.querySelector("#bp-list");
  const locationInput = root.querySelector('input[name="location"]');
  const getLocationBtn = root.querySelector("#get-location-btn");

  // Formularz i elementy wagi
  const wgForm = root.querySelector("#weight-form");
  const wgMsg = root.querySelector("#weight-msg");
  const wgList = root.querySelector("#weight-list");

  // ═══════════════════════════════════════════════════════════════════════════
  // OBSŁUGA GEOLOKACJI
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Resetuje przycisk lokalizacji do stanu początkowego
   */
  const resetLocationButton = () => {
    getLocationBtn.disabled = false;
    getLocationBtn.textContent = "📍 Pobierz";
  };

  /**
   * Pobiera lokalizację GPS i wpisuje adres do pola
   * 
   * PRZEPŁYW:
   * 1. Zmień tekst przycisku na "Pobieranie..."
   * 2. Pobierz współrzędne GPS
   * 3. Zamień współrzędne na adres (reverse geocoding)
   * 4. Wpisz adres do pola input
   * 5. Przywróć przycisk
   */
  const getLocation = async () => {
    // Wyłącz przycisk i pokaż status
    getLocationBtn.disabled = true;
    getLocationBtn.textContent = "⏳ Pobieranie...";
    bpMsg.textContent = "";
    bpMsg.className = "form-msg";

    try {
      // 1. Pobierz współrzędne GPS
      const coords = await getCurrentPosition();
      
      // 2. Zamień na adres
      const address = await resolveAddressFromCoords(coords.latitude, coords.longitude);
      
      // 3. Wpisz do pola
      locationInput.value = address;
      
    } catch (error) {
      // Pokaż błąd użytkownikowi
      bpMsg.className = "form-msg form-msg-error";
      bpMsg.textContent = `Błąd pobierania lokalizacji: ${getErrorMessage(error)}`;
    } finally {
      // Zawsze przywróć przycisk (nawet przy błędzie)
      resetLocationButton();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OBSŁUGA FORMULARZA CIŚNIENIA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obsługuje wysłanie formularza ciśnienia
   * 
   * @param {Event} e - Event submit
   */
  const onBpSubmit = async (e) => {
    /**
     * preventDefault() - zatrzymuje domyślne zachowanie
     * 
     * Bez tego przeglądarka by:
     * 1. Wysłała dane do serwera (którego nie mamy)
     * 2. Przeładowała stronę
     */
    e.preventDefault();
    
    // Wyczyść poprzedni komunikat
    bpMsg.textContent = "";
    
    /**
     * FormData - wygodny sposób na pobranie danych z formularza
     * 
     * fd.get("sys") - wartość pola o name="sys"
     */
    const fd = new FormData(bpForm);

    try {
      // Zapisz pomiar (walidacja + zapis do bazy)
      await addBp({
        sys: fd.get("sys"),
        dia: fd.get("dia"),
        date: fd.get("date"),
        time: fd.get("time"),
        note: fd.get("note"),
        location: fd.get("location"),
      });

      // Sukces - wyczyść formularz i pokaż komunikat
      bpForm.reset();
      bpMsg.className = "form-msg form-msg-success";
      bpMsg.textContent = "Zapisano pomiar!";
      
      // Odśwież listę pomiarów
      await refreshBp();
      
    } catch (error) {
      // Błąd - pokaż komunikat
      bpMsg.className = "form-msg form-msg-error";
      bpMsg.textContent = `Błąd: ${getErrorMessage(error)}`;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OBSŁUGA FORMULARZA WAGI
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obsługuje wysłanie formularza wagi
   */
  const onWgSubmit = async (e) => {
    e.preventDefault();
    wgMsg.textContent = "";

    const fd = new FormData(wgForm);

    try {
      await addWeight({
        kg: fd.get("kg"),
        date: fd.get("date"),
        time: fd.get("time"),
        note: fd.get("note"),
      });

      wgForm.reset();
      wgMsg.className = "form-msg form-msg-success";
      wgMsg.textContent = "Zapisano pomiar!";

      await refreshWg();
      
    } catch (error) {
      wgMsg.className = "form-msg form-msg-error";
      wgMsg.textContent = `Błąd: ${getErrorMessage(error)}`;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // REJESTRACJA EVENT LISTENERÓW
  // ═══════════════════════════════════════════════════════════════════════════

  getLocationBtn.addEventListener("click", getLocation);
  bpForm.addEventListener("submit", onBpSubmit);
  wgForm.addEventListener("submit", onWgSubmit);

  /**
   * FUNKCJA CLEANUP (destroy)
   * 
   * Gdy użytkownik przechodzi na inną stronę, router wywołuje destroy().
   * Musimy usunąć event listenery żeby:
   * 1. Uniknąć wycieków pamięci (memory leaks)
   * 2. Funkcje nie były wywoływane po usunięciu elementów
   */
  const destroy = () => {
    getLocationBtn.removeEventListener("click", getLocation);
    bpForm.removeEventListener("submit", onBpSubmit);
    wgForm.removeEventListener("submit", onWgSubmit);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDEROWANIE LIST
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Renderuje listę pomiarów ciśnienia
   * 
   * @param {object[]} items - Tablica pomiarów
   * @param {Error|null} error - Błąd (jeśli wystąpił)
   */
  const renderBpList = (items, error) => {
    // Obsłuż błąd
    if (error) {
      const li = document.createElement("li");
      li.className = "list-error";
      li.textContent = `Nie udało się załadować pomiarów. ${getErrorMessage(error)}`;
      bpList.replaceChildren(li);
      return;
    }
    
    // Obsłuż pustą listę
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "Brak danych";
      bpList.replaceChildren(li);
      return;
    }
    
    /**
     * Wygeneruj HTML dla każdego pomiaru
     * 
     * safeHtml - template tag który automatycznie escapuje wartości
     * escapeHtml - escapuje tekst (zamienia < > " ' & na encje)
     * trusted - oznacza HTML jako "zaufany" (nie escapuj)
     */
    bpList.innerHTML = items
      .map((e) => {
        // Lokalizacja (opcjonalna)
        const locPart = e.location ? ` <br/><small>📍 ${escapeHtml(e.location)}</small>` : "";
        // Notatka (opcjonalna)
        const notePart = e.note ? ` <br/><em>${escapeHtml(e.note)}</em>` : "";
        
        /**
         * safeHtml`...` - template literal który escapuje interpolacje
         * ${fmtDate(e.ts)} - zostanie escapowane automatycznie
         * ${trusted(locPart)} - NIE zostanie escapowane (już jest bezpieczne)
         */
        return safeHtml`<li>${fmtDate(e.ts)} - <strong>${e.value}/${e.value2} mmHg</strong>${trusted(locPart)}${trusted(notePart)} </li>`;
      })
      .join("");
  };

  /**
   * Renderuje listę pomiarów wagi
   */
  const renderWeightList = (items, error) => {
    if (error) {
      const li = document.createElement("li");
      li.className = "list-error";
      li.textContent = `Nie udało się załadować pomiarów wagi. ${getErrorMessage(error)}`;
      wgList.replaceChildren(li);
      return;
    }
    
    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "Brak danych";
      wgList.replaceChildren(li);
      return;
    }
    
    wgList.innerHTML = items
      .map((e) => {
        const notePart = e.note ? ` <em>${escapeHtml(e.note)}</em>` : "";
        // toFixed(1) - jedna cyfra po przecinku (75.5 kg)
        return safeHtml`<li>${fmtDate(e.ts)} - <strong>${e.value.toFixed(1)} kg</strong>${trusted(notePart)}</li>`;
      })
      .join("");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ODŚWIEŻANIE DANYCH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Odświeża listę pomiarów ciśnienia
   */
  const refreshBp = async () => {
    const { items, error } = await getBpListForDisplay(DEFAULT_LIST_LIMIT);
    renderBpList(items, error);
  };

  /**
   * Odświeża listę pomiarów wagi
   */
  const refreshWg = async () => {
    const { items, error } = await getWeightListForDisplay(DEFAULT_LIST_LIMIT);
    renderWeightList(items, error);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INICJALIZACJA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Pobierz i wyświetl dane przy starcie
   * 
   * Promise.all() wykonuje oba pobierania równolegle
   * (szybciej niż jedno po drugim)
   */
  await Promise.all([refreshBp(), refreshWg()]);
  
  /**
   * Zwróć element i funkcję cleanup
   * 
   * Router:
   * 1. Wstawi el do DOM
   * 2. Zapisze destroy()
   * 3. Wywoła destroy() gdy użytkownik zmieni stronę
   */
  return { el: root, destroy };
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNKCJE POMOCNICZE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formatuje timestamp jako czytelną datę
 * 
 * @param {number} ts - Timestamp (ms)
 * @returns {string} Sformatowana data
 */
const fmtDate = (ts) => {
  return new Date(ts).toLocaleString();
};

export default MeasurementsView;
