/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/meals/repo.js                                                ║
 * ║  CO ROBI: Operacje na bazie danych dla posiłków                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { add as dbAdd, queryIndex } from "../../core/database.js";
import { STORE_MEALS, INDEX_BY_TS, MEAL_TYPE, DEFAULT_LIST_LIMIT } from "../../constants.js";

/**
 * Dodaje posiłek do bazy danych
 * 
 * @param {object} entry - Obiekt posiłku (z model.js)
 * @returns {Promise<object>} Ten sam obiekt po zapisaniu
 */
export const add = (entry) => dbAdd(STORE_MEALS, entry);

/**
 * Pobiera najnowsze posiłki
 * 
 * @param {string} type - Typ (powinien być MEAL_TYPE)
 * @param {number} limit - Ile posiłków pobrać
 * @returns {Promise<object[]>} Lista posiłków (najnowsze pierwsze)
 */
export const latestByType = (type, limit = DEFAULT_LIST_LIMIT) =>
  queryIndex(STORE_MEALS, INDEX_BY_TS, {
    direction: "prev",           // Malejąco (najnowsze pierwsze)
    limit,
    filter: (v) => v.type === type,
  });

/**
 * Pobiera posiłki z określonego zakresu czasowego
 * 
 * WYKORZYSTANIE:
 * Można użyć do pobrania posiłków z dzisiaj, tego tygodnia, itd.
 * 
 * PRZYKŁAD - posiłki z dzisiaj:
 * const startOfDay = new Date();
 * startOfDay.setHours(0, 0, 0, 0);
 * const endOfDay = new Date();
 * endOfDay.setHours(23, 59, 59, 999);
 * 
 * const todayMeals = await getByDateRange(startOfDay.getTime(), endOfDay.getTime());
 * 
 * OPTYMALIZACJA:
 * - stopWhen: (v) => v.ts < startTs - przerywa gdy dojdziemy do
 *   posiłków starszych niż zakres (bo są posortowane malejąco)
 * - Nie musimy przeglądać całej bazy!
 * 
 * @param {number} startTs - Początek zakresu (timestamp ms)
 * @param {number} endTs - Koniec zakresu (timestamp ms)
 * @returns {Promise<object[]>} Posiłki z zakresu
 */
export const getByDateRange = (startTs, endTs) =>
  queryIndex(STORE_MEALS, INDEX_BY_TS, {
    direction: "prev",           // Malejąco (najnowsze pierwsze)
    limit: 0,                    // Bez limitu (wszystkie z zakresu)
    
    /**
     * filter - które posiłki dodać do wyników
     * - type musi być MEAL_TYPE
     * - ts musi być >= startTs i <= endTs
     */
    filter: (v) => v.type === MEAL_TYPE && v.ts >= startTs && v.ts <= endTs,
    
    /**
     * stopWhen - kiedy przerwać iterację
     * - Gdy dotrzemy do posiłku starszego niż startTs
     * - Wszystkie kolejne będą jeszcze starsze, więc nie pasują
     */
    stopWhen: (v) => v.ts < startTs,
  });
