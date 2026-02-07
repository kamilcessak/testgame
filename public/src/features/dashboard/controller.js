/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/dashboard/controller.js                                      ║
 * ║  CO ROBI: Logika biznesowa dashboardu (pobieranie podsumowania)             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST CONTROLLER?
 * 
 * W architekturze MVC (Model-View-Controller):
 * - Model = dane i ich struktura (model.js)
 * - View = wyświetlanie UI (view.js)
 * - Controller = logika łącząca dane z widokiem
 * 
 * Controller NIE wie jak wyświetlić dane (to robi View).
 * Controller NIE wie jak zapisać dane do bazy (to robi Repo).
 * Controller KOORDYNUJE - pobiera, przetwarza, zwraca.
 */

import { latestByType } from "../measurements/repo.js";
import { getTodayCalories } from "../meals/controller.js";
import {
  MEASUREMENT_TYPE_WEIGHT,
  MEASUREMENT_TYPE_BP,
  DASHBOARD_LATEST_COUNT,
  CALORIES_TARGET_DEFAULT,
} from "../../constants.js";

/**
 * Pobiera podsumowanie danych na dzisiaj
 * 
 * Używane na dashboardzie do wyświetlenia:
 * - Ile kalorii zjedzono dzisiaj
 * - Ostatni pomiar wagi
 * - Ostatni pomiar ciśnienia
 * 
 * UWAGA: Ta funkcja jest wywoływana przez store.js który cache'uje wynik.
 * Nie wywołuj jej bezpośrednio z widoku - użyj store.getTodaySummary()
 * 
 * @returns {Promise<{
 *   date: Date,
 *   calories: { eaten: number, target: number },
 *   lastWeight: { kg: number, ts: number } | null,
 *   lastBp: { sys: number, dia: number, ts: number } | null
 * }>}
 */
export const getTodaySummary = async () => {
  /**
   * Pobierz najnowszy pomiar wagi
   * 
   * latestByType() zwraca tablicę, bierzemy DASHBOARD_LATEST_COUNT (1) rekordów
   * Wynik: [{ value: 75.5, ts: 123456789, ... }] lub []
   */
  const latestWg = await latestByType(MEASUREMENT_TYPE_WEIGHT, DASHBOARD_LATEST_COUNT);
  
  /**
   * Pobierz najnowszy pomiar ciśnienia
   * 
   * Wynik: [{ value: 120, value2: 80, ts: 123456789, ... }] lub []
   */
  const latestBp = await latestByType(MEASUREMENT_TYPE_BP, DASHBOARD_LATEST_COUNT);
  
  /**
   * Pobierz sumę kalorii z dzisiejszych posiłków
   * 
   * getTodayCalories() filtruje posiłki po dacie i sumuje kalorie
   */
  const eatenCalories = await getTodayCalories();

  /**
   * Zwróć obiekt podsumowania
   */
  return {
    // Aktualna data
    date: new Date(),
    
    // Kalorie: zjedzone vs cel
    calories: { 
      eaten: eatenCalories, 
      target: CALORIES_TARGET_DEFAULT  // Domyślnie 2000 kcal
    },
    
    /**
     * Ostatnia waga lub null jeśli brak danych
     * 
     * latestWg[0] = pierwszy (najnowszy) pomiar
     * Jeśli tablica pusta, zwracamy null
     */
    lastWeight:
      latestWg && latestWg.length > 0
        ? { 
            kg: latestWg[0].value,  // Waga w kg
            ts: latestWg[0].ts      // Timestamp pomiaru
          }
        : null,
    
    /**
     * Ostatnie ciśnienie lub null jeśli brak danych
     * 
     * value = ciśnienie skurczowe (systolic)
     * value2 = ciśnienie rozkurczowe (diastolic)
     */
    lastBp:
      latestBp && latestBp.length > 0
        ? {
            sys: latestBp[0].value,   // Skurczowe
            dia: latestBp[0].value2,  // Rozkurczowe
            ts: latestBp[0].ts,       // Timestamp
          }
        : null,
  };
};
