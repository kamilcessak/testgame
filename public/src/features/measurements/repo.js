/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/measurements/repo.js                                         ║
 * ║  CO ROBI: Operacje na bazie danych dla pomiarów (zapis, odczyt)             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST REPO (Repository)?
 * 
 * Repo to warstwa ABSTRAKCJI nad bazą danych.
 * 
 * DLACZEGO ABSTRAKCJA?
 * 
 * Bez repo:
 * controller.js → import database → database.add("measurements", entry)
 * controller.js musi WIEDZIEĆ o strukturze bazy (nazwa store, indeksy)
 * 
 * Z repo:
 * controller.js → import repo → repo.add(entry)
 * controller.js nie wie o bazie - deleguje do repo
 * 
 * ZALETY:
 * - Łatwiejsza zmiana bazy (z IndexedDB na API serwera)
 * - Mniej duplikacji (logika zapytań w jednym miejscu)
 * - Łatwiejsze testowanie (można podmienić repo na mock)
 */

import { add as dbAdd, queryIndex } from "../../core/database.js";
import { STORE_MEASUREMENTS, INDEX_BY_TS, DEFAULT_LIST_LIMIT } from "../../constants.js";

/**
 * Dodaje pomiar do bazy danych
 * 
 * PRZYKŁAD:
 * await add({
 *   id: "abc-123",
 *   type: "bp",
 *   value: 120,
 *   value2: 80,
 *   ts: Date.now()
 * });
 * 
 * @param {object} entry - Obiekt pomiaru (musi mieć id, type, value, ts)
 * @returns {Promise<object>} Ten sam obiekt po zapisaniu
 */
export const add = (entry) => dbAdd(STORE_MEASUREMENTS, entry);

/**
 * Pobiera najnowsze pomiary danego typu
 * 
 * JAK TO DZIAŁA?
 * 
 * 1. queryIndex() otwiera cursor na indeksie "by_ts" (timestamp)
 * 2. direction: "prev" = od najwyższego ts do najniższego = od najnowszych
 * 3. filter: (v) => v.type === type = tylko pomiary danego typu
 * 4. limit = ile max zwrócić
 * 
 * PRZYKŁAD - pobierz 10 najnowszych pomiarów ciśnienia:
 * const bpMeasurements = await latestByType("bp", 10);
 * // [{ type: "bp", ts: 999 }, { type: "bp", ts: 998 }, ...]
 * 
 * @param {string} type - Typ pomiaru ("bp" lub "weight")
 * @param {number} limit - Maksymalna liczba wyników
 * @returns {Promise<object[]>} Tablica pomiarów (najnowsze pierwsze)
 */
export const latestByType = (type, limit = DEFAULT_LIST_LIMIT) =>
  queryIndex(STORE_MEASUREMENTS, INDEX_BY_TS, {
    direction: "prev",           // Malejąco po ts (najnowsze pierwsze)
    limit,                       // Max tyle wyników
    filter: (v) => v.type === type,  // Tylko dany typ
  });
