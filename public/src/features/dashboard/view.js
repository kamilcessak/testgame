/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/dashboard/view.js                                            ║
 * ║  CO ROBI: Tworzy i wyświetla widok dashboardu (strona główna)               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST VIEW?
 * 
 * View (widok) odpowiada za:
 * - Tworzenie elementów HTML
 * - Wyświetlanie danych użytkownikowi
 * - Obsługę interakcji (kliknięcia, formularze)
 * 
 * View NIE wie skąd pochodzą dane - dostaje je od store/controller.
 * View NIE wie jak zapisać dane - przekazuje je do store/controller.
 */

import { getTodaySummary } from "../../core/store.js";
import { getErrorMessage } from "../../utils/error.js";

/**
 * Tworzy widok dashboardu
 * 
 * PRZEPŁYW:
 * 1. Stwórz pusty element <section>
 * 2. Pobierz dane z store (getTodaySummary)
 * 3. Wygeneruj HTML z danymi
 * 4. Zwróć element
 * 
 * @returns {Promise<HTMLElement>} Element sekcji z dashboardem
 */
const DashboardView = async () => {
  /**
   * Stwórz główny kontener widoku
   * 
   * <section> to semantyczny element HTML dla "sekcji" strony
   * Lepszy niż <div> dla accessibility (czytniki ekranu)
   */
  const el = document.createElement("section");

  try {
    /**
     * Pobierz podsumowanie z store
     * 
     * Store najpierw sprawdzi cache, a jeśli pusty - pobierze z bazy.
     * Zwraca obiekt z: calories, lastWeight, lastBp
     */
    const data = await getTodaySummary();
    
    /**
     * Stwórz wrapper dla zawartości
     * 
     * Używamy innerHTML z template literal (``) do szybkiego
     * wygenerowania HTML. W tym przypadku to bezpieczne bo:
     * - Dane są liczbami (nie user input)
     * - Escapujemy daty przez .toISOString()
     */
    const wrap = document.createElement("div");
    wrap.innerHTML = `
    <div>
        <!-- KARTA 1: Kalorie dzisiaj -->
        <div>
            <h2>Kalorie dzisiaj:</h2>
            <p>
                <!-- data.calories.eaten = zjedzonych kalorii -->
                <!-- data.calories.target = cel dzienny -->
                <strong>${data.calories.eaten}</strong> / ${data.calories.target} kcal
            </p>
        </div>
        
        <!-- KARTA 2: Ostatnia waga -->
        <div>
            <h2>Ostatnia waga:</h2>
            <p>
                ${
                  /**
                   * Warunkowe renderowanie
                   * 
                   * Jeśli data.lastWeight istnieje:
                   * - Pokaż wagę i datę
                   * 
                   * Jeśli null (brak pomiarów):
                   * - Pokaż "Brak danych"
                   */
                  data.lastWeight
                    ? `<strong>${data.lastWeight.kg} kg</strong><br/><small>${new Date(data.lastWeight.ts).toISOString()}</small>`
                    : "<em>Brak danych</em>"
                }
            </p>
        </div>
        
        <!-- KARTA 3: Ostatnie ciśnienie -->
        <div>
            <h2>Ostatni pomiar ciśnienia:</h2>
            <p>
                ${
                  data.lastBp
                    ? `<strong>${data.lastBp.sys} / ${data.lastBp.dia} mmHg</strong><br/><small>${new Date(data.lastBp.ts).toISOString()}</small>`
                    : "<em>Brak danych</em>"
                }
            </p>
        </div>
    </div>
    `;
    
    /**
     * Dodaj wygenerowaną zawartość do sekcji
     * 
     * wrap.firstElementChild = pierwszy element dziecko <div>
     * (pomijamy whitespace text nodes)
     */
    el.appendChild(wrap.firstElementChild);
    
  } catch (error) {
    /**
     * OBSŁUGA BŁĘDÓW
     * 
     * Jeśli coś pójdzie nie tak (np. błąd bazy danych),
     * pokazujemy użytkownikowi komunikat zamiast crashować.
     */
    console.error(error);
    
    // Stwórz error box
    const box = document.createElement("div");
    box.className = "errorBox";
    
    // Nagłówek błędu
    const strong = document.createElement("strong");
    strong.textContent = "Nie udało się załadować podsumowania.";
    
    const br = document.createElement("br");
    
    // Szczegóły błędu (czytelna wiadomość)
    const msg = document.createTextNode(getErrorMessage(error));
    
    box.appendChild(strong);
    box.appendChild(br);
    box.appendChild(msg);
    
    el.appendChild(box);
  }

  /**
   * Zwróć element
   * 
   * Router wstawi ten element do <main id="app">
   * 
   * UWAGA: Dashboard nie zwraca destroy() bo nie ma event listenerów
   * które trzeba by usunąć. Tylko proste wyświetlanie danych.
   */
  return el;
};

/**
 * Eksportuj jako default
 * 
 * Dzięki temu w routes.js możemy zrobić:
 * const view = await import("./view.js");
 * return view.default();
 */
export default DashboardView;
