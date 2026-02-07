/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: store.js                                                              ║
 * ║  CO ROBI: Centralny "magazyn" danych z cache (pamięcią podręczną)            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST STORE?
 * 
 * Store to warstwa POMIĘDZY widokami (UI) a bazą danych (IndexedDB).
 * 
 * BEZ STORE:
 * Widok → Baza danych → Widok
 * Każde wyświetlenie listy = zapytanie do bazy = wolno
 * 
 * Z STORE:
 * Widok → Store (cache) → Baza (tylko jeśli cache nieaktualny) → Store → Widok
 * Wielokrotne wyświetlenie = dane z pamięci = szybko
 * 
 * KIEDY CACHE JEST NIEAKTUALNY?
 * 1. Minął TTL (Time To Live) - cache "przeterminowany"
 * 2. Dodano nowy rekord - cache "zinvalidowany"
 * 3. Wywołano invalidateAll() - ręczne wyczyszczenie
 * 
 * DLACZEGO TO WAŻNE?
 * - Szybsze ładowanie (dane już w pamięci)
 * - Mniejsze obciążenie bazy
 * - Spójność między widokami (ten sam cache)
 */

import { DASHBOARD_CACHE_TTL_MS, DEFAULT_LIST_LIMIT } from "../constants.js";
import * as measurementsController from "../features/measurements/controller.js";
import * as mealsController from "../features/meals/controller.js";
import * as dashboardController from "../features/dashboard/controller.js";

// ═══════════════════════════════════════════════════════════════════════════════
// FUNKCJE POMOCNICZE CACHE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sprawdza czy cache jest "świeży" (nieprzetarminowany)
 * 
 * PRZYKŁAD:
 * Cache zapisany 10 sekund temu, TTL = 30 sekund
 * → cache jest ważny (10 < 30)
 * 
 * Cache zapisany 45 sekund temu, TTL = 30 sekund
 * → cache nieważny (45 > 30)
 * 
 * @param {object|null} entry - Obiekt cache z polem timestamp
 * @param {number} ttlMs - Time To Live w milisekundach
 * @returns {boolean} true jeśli cache jest ważny
 */
const isCacheValid = (entry, ttlMs) =>
  entry &&                           // cache istnieje
  entry.timestamp > 0 &&             // ma timestamp
  Date.now() - entry.timestamp < ttlMs;  // nie minął TTL

/**
 * Tworzy nowy obiekt cache
 * 
 * @param {any} data - Dane do zapisania
 * @param {number|null} limit - Limit użyty przy pobieraniu (opcjonalnie)
 * @returns {object} Obiekt cache z timestamp
 */
const cacheEntry = (data, limit = null) => ({
  data,
  timestamp: Date.now(),
  limit,
});

// ═══════════════════════════════════════════════════════════════════════════════
// ZMIENNE CACHE (pamięć podręczna)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cache dla różnych typów danych
 * 
 * Każdy cache to obiekt:
 * {
 *   data: [...],        // faktyczne dane
 *   timestamp: 123...,  // kiedy zapisano (Date.now())
 *   limit: 20           // ile rekordów pobrano
 * }
 * 
 * null = cache pusty, trzeba pobrać z bazy
 */

/** Cache listy pomiarów ciśnienia */
let _bpList = null;

/** Cache listy pomiarów wagi */
let _weightList = null;

/** Cache listy posiłków */
let _mealList = null;

/** Cache podsumowania dashboardu (kalorie, ostatnie pomiary) */
let _summary = null;

// ═══════════════════════════════════════════════════════════════════════════════
// INVALIDACJA (unieważnianie cache)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Unieważnia cache podsumowania
 * 
 * Wywołujemy gdy:
 * - Dodano nowy pomiar (zmienia się "ostatni pomiar")
 * - Dodano nowy posiłek (zmieniają się kalorie)
 */
const invalidateSummary = () => {
  _summary = null;
};

/**
 * Unieważnia cache wszystkich list
 */
export const invalidateLists = () => {
  _bpList = null;
  _weightList = null;
  _mealList = null;
};

/**
 * Unieważnia CAŁY cache
 * 
 * Użyj gdy:
 * - Odświeżasz stronę
 * - Synchronizujesz z serwerem
 * - Coś poszło nie tak i chcesz "zresetować"
 */
export const invalidateAll = () => {
  invalidateLists();
  invalidateSummary();
};

// ═══════════════════════════════════════════════════════════════════════════════
// POBIERANIE DANYCH (z cache lub bazy)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pobiera listę pomiarów ciśnienia
 * 
 * PRZEPŁYW:
 * 1. Sprawdź czy cache jest aktualny i ma wystarczająco danych
 * 2. Jeśli tak → zwróć z cache
 * 3. Jeśli nie → pobierz z bazy, zapisz w cache, zwróć
 * 
 * @param {number} limit - Ile rekordów pobrać (domyślnie 20)
 * @returns {Promise<object[]>} Lista pomiarów
 */
export const getBpList = async (limit = DEFAULT_LIST_LIMIT) => {
  /**
   * Warunki użycia cache:
   * 1. isCacheValid() - cache nie jest przeterminowany
   * 2. _bpList.limit >= limit - cache ma WYSTARCZAJĄCO danych
   *    
   *    Przykład: cache ma 20 rekordów, a ty chcesz 10
   *    → możemy zwrócić pierwszych 10 z cache
   *    
   *    Przykład: cache ma 10 rekordów, a ty chcesz 20
   *    → musimy pobrać z bazy (może jest więcej)
   */
  if (isCacheValid(_bpList, DASHBOARD_CACHE_TTL_MS) && _bpList.limit >= limit) {
    // Zwróć tylko tyle ile potrzeba (slice)
    return _bpList.data.slice(0, limit);
  }
  
  // Cache nieaktualny lub niewystarczający → pobierz z bazy
  const data = await measurementsController.getBpList(limit);
  
  // Zapisz w cache
  _bpList = cacheEntry(data, limit);
  
  return data;
};

/**
 * Pobiera listę pomiarów wagi
 * (Działa tak samo jak getBpList)
 */
export const getWeightList = async (limit = DEFAULT_LIST_LIMIT) => {
  if (isCacheValid(_weightList, DASHBOARD_CACHE_TTL_MS) && _weightList.limit >= limit) {
    return _weightList.data.slice(0, limit);
  }
  const data = await measurementsController.getWeightList(limit);
  _weightList = cacheEntry(data, limit);
  return data;
};

/**
 * Pobiera listę posiłków
 * (Działa tak samo jak getBpList)
 */
export const getMealList = async (limit = DEFAULT_LIST_LIMIT) => {
  if (isCacheValid(_mealList, DASHBOARD_CACHE_TTL_MS) && _mealList.limit >= limit) {
    return _mealList.data.slice(0, limit);
  }
  const data = await mealsController.getMealList(limit);
  _mealList = cacheEntry(data, limit);
  return data;
};

/**
 * Pobiera podsumowanie dzisiejszych danych (dla dashboardu)
 * 
 * Zawiera:
 * - Dzisiejsze kalorie (zjedzone / cel)
 * - Ostatni pomiar wagi
 * - Ostatni pomiar ciśnienia
 */
export const getTodaySummary = async () => {
  if (isCacheValid(_summary, DASHBOARD_CACHE_TTL_MS)) {
    return _summary.data;
  }
  const data = await dashboardController.getTodaySummary();
  _summary = cacheEntry(data, null);
  return data;
};

// ═══════════════════════════════════════════════════════════════════════════════
// POBIERANIE Z OBSŁUGĄ BŁĘDÓW (dla widoków)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pobiera listę pomiarów ciśnienia z obsługą błędów
 * 
 * RÓŻNICA OD getBpList:
 * - getBpList() rzuca wyjątek gdy coś pójdzie nie tak
 * - getBpListForDisplay() NIGDY nie rzuca - zwraca { items: [], error: ... }
 * 
 * Widoki używają tej wersji bo łatwiej obsłużyć błąd w UI:
 * const { items, error } = await getBpListForDisplay();
 * if (error) showError(error);
 * else renderList(items);
 * 
 * @returns {Promise<{ items: object[], error: Error|null }>}
 */
export const getBpListForDisplay = async (limit = DEFAULT_LIST_LIMIT) => {
  try {
    const items = await getBpList(limit);
    return { items, error: null };
  } catch (e) {
    return { items: [], error: e };
  }
};

/**
 * Pobiera listę pomiarów wagi z obsługą błędów
 */
export const getWeightListForDisplay = async (limit = DEFAULT_LIST_LIMIT) => {
  try {
    const items = await getWeightList(limit);
    return { items, error: null };
  } catch (e) {
    return { items: [], error: e };
  }
};

/**
 * Pobiera listę posiłków z obsługą błędów
 */
export const getMealListForDisplay = async (limit = DEFAULT_LIST_LIMIT) => {
  try {
    const items = await getMealList(limit);
    return { items, error: null };
  } catch (e) {
    return { items: [], error: e };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DODAWANIE DANYCH (z invalidacją cache)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dodaje pomiar ciśnienia i unieważnia cache
 * 
 * WAŻNE: Po dodaniu nowego rekordu cache jest NIEAKTUALNY!
 * Musimy go zinvalidować, żeby następne pobranie było świeże.
 * 
 * @param {object} data - Dane pomiaru { sys, dia, date, time, note, location }
 * @returns {Promise<object>} Dodany rekord
 */
export const addBp = async (data) => {
  // 1. Dodaj do bazy (przez controller który waliduje)
  const result = await measurementsController.addBp(data);
  
  // 2. Zinvaliduj cache listy (lista się zmieniła)
  _bpList = null;
  
  // 3. Zinvaliduj podsumowanie (ostatni pomiar się zmienił)
  invalidateSummary();
  
  return result;
};

/**
 * Dodaje pomiar wagi i unieważnia cache
 */
export const addWeight = async (data) => {
  const result = await measurementsController.addWeight(data);
  _weightList = null;
  invalidateSummary();
  return result;
};

/**
 * Dodaje posiłek i unieważnia cache
 */
export const addMeal = async (data) => {
  const result = await mealsController.addMeal(data);
  _mealList = null;
  invalidateSummary();  // Kalorie dzisiejsze się zmieniły
  return result;
};
