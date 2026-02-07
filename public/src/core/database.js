/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: database.js                                                           ║
 * ║  CO ROBI: Obsługa bazy danych IndexedDB (lokalna baza w przeglądarce)        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * CO TO JEST IndexedDB?
 * 
 * IndexedDB to baza danych wbudowana w przeglądarkę:
 * - Przechowuje dane LOKALNIE (na komputerze/telefonie użytkownika)
 * - Dane zostają nawet po zamknięciu przeglądarki
 * - Działa OFFLINE (nie potrzebuje serwera)
 * - Może przechowywać DUŻE ilości danych (setki MB)
 * - Obsługuje Bloby (np. zdjęcia)
 * 
 * PODSTAWOWE POJĘCIA:
 * 
 * 1. DATABASE (baza) - kontener na wszystkie dane
 *    Jak folder na dysku
 * 
 * 2. OBJECT STORE - "tabela" przechowująca obiekty
 *    Jak plik Excel z wieloma wierszami
 * 
 * 3. INDEX - "spis treści" do szybkiego wyszukiwania
 *    Pozwala szybko znaleźć rekordy po konkretnym polu
 * 
 * 4. TRANSACTION - "sesja" operacji na bazie
 *    Grupuje operacje - albo wszystkie się udają, albo żadna
 * 
 * 5. CURSOR - "wskaźnik" do przeglądania rekordów jeden po drugim
 *    Jak palec przesuwający się po wierszach w Excelu
 * 
 * WAŻNE: IndexedDB jest ASYNCHRONICZNE!
 * Wszystko działa przez Promise/callbacki, nie blokuje UI.
 */

import {
  DB_NAME,
  DB_VERSION,
  STORE_MEASUREMENTS,
  STORE_MEALS,
  STORE_SETTINGS,
  INDEX_BY_TS,
  INDEX_BY_TYPE,
} from "../constants.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAT BAZY DANYCH
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Definicja struktury bazy danych
 * 
 * Każdy Object Store (tabela) ma:
 * - keyPath: pole które jest "kluczem głównym" (musi być unikalne)
 * - indexes: lista indeksów do szybkiego wyszukiwania
 * 
 * ANALOGIA DO SQL:
 * Object Store = Tabela
 * keyPath = PRIMARY KEY
 * index = INDEX
 */
const SCHEMA = {
  /**
   * STORE: measurements (pomiary ciśnienia i wagi)
   * 
   * Przykładowy rekord:
   * {
   *   id: "abc-123",           // keyPath - unikalny identyfikator
   *   type: "bp",              // "bp" lub "weight"
   *   value: 120,              // ciśnienie skurczowe LUB waga w kg
   *   value2: 80,              // ciśnienie rozkurczowe (tylko dla BP)
   *   ts: 1699123456789,       // timestamp (kiedy zmierzono)
   *   note: "rano",            // opcjonalna notatka
   *   location: "Warszawa"     // opcjonalna lokalizacja (tylko BP)
   * }
   */
  [STORE_MEASUREMENTS]: {
    keyPath: "id",  // Klucz główny - pole "id" musi być unikalne
    indexes: [
      /**
       * Index by_ts - sortowanie/wyszukiwanie po czasie
       * unique: false - wiele rekordów może mieć ten sam timestamp
       */
      { name: INDEX_BY_TS, keyPath: "ts", unique: false },
      
      /**
       * Index by_type - filtrowanie po typie pomiaru
       * Pozwala szybko znaleźć "tylko ciśnienie" lub "tylko wagę"
       */
      { name: INDEX_BY_TYPE, keyPath: "type", unique: false },
    ],
  },
  
  /**
   * STORE: meals (posiłki)
   * 
   * Przykładowy rekord:
   * {
   *   id: "def-456",
   *   type: "meal",
   *   calories: 500,
   *   description: "Obiad",
   *   protein: 30,
   *   carbs: 50,
   *   fats: 20,
   *   image: Blob,             // zdjęcie jako Blob (opcjonalne)
   *   ts: 1699123456789,
   *   note: "smaczne"
   * }
   */
  [STORE_MEALS]: {
    keyPath: "id",
    indexes: [
      { name: INDEX_BY_TS, keyPath: "ts", unique: false },
      { name: INDEX_BY_TYPE, keyPath: "type", unique: false },
    ],
  },
  
  /**
   * STORE: settings (ustawienia użytkownika)
   * 
   * Przykładowy rekord:
   * {
   *   key: "caloriesTarget",   // keyPath - nazwa ustawienia
   *   value: 2500
   * }
   * 
   * Obecnie nieużywany, ale przygotowany na przyszłość
   */
  [STORE_SETTINGS]: {
    keyPath: "key",
    indexes: [],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// POŁĄCZENIE Z BAZĄ (Singleton Pattern)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Przechowuje Promise połączenia z bazą
 * 
 * SINGLETON PATTERN:
 * - Otwieramy połączenie RAZ
 * - Zwracamy to samo połączenie wszystkim
 * - Unikamy wielokrotnego otwierania (kosztowne)
 * 
 * null = jeszcze nie otwarte
 */
let _dbPromise = null;

/**
 * Zwraca połączenie z bazą danych (otwiera jeśli potrzeba)
 * 
 * PRZYKŁAD UŻYCIA:
 * const db = await database();
 * // teraz możesz używać db
 * 
 * @returns {Promise<IDBDatabase>} Promise który rozwiązuje się do obiektu bazy
 */
export const database = () => {
  // Jeśli już mamy połączenie, zwróć je
  if (_dbPromise) return _dbPromise;

  // Stwórz nowy Promise i zapisz go
  _dbPromise = new Promise((res, rej) => {
    /**
     * indexedDB.open(name, version)
     * 
     * Otwiera bazę o podanej nazwie i wersji.
     * Jeśli baza nie istnieje - tworzy ją.
     * Jeśli wersja jest wyższa niż istniejąca - uruchamia migrację.
     */
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    /**
     * EVENT: onupgradeneeded
     * 
     * Wywoływany gdy:
     * 1. Baza nie istnieje (tworzenie od zera)
     * 2. Wersja jest wyższa niż istniejąca (migracja)
     * 
     * TUTAJ tworzymy/modyfikujemy strukturę bazy (stores, indexy)
     */
    req.onupgradeneeded = (event) => {
      console.log("[DB] Upgrading database schema...");
      
      /**
       * event.target.result - obiekt bazy danych
       * event.target.transaction - transakcja upgrade (automatycznie utworzona)
       */
      const db = event.target.result;
      const transaction = event.target.transaction;
      
      /**
       * Przejdź przez każdy store w schemacie
       * Object.entries() zamienia obiekt na tablicę [klucz, wartość]
       */
      for (const [storeName, { keyPath, indexes }] of Object.entries(SCHEMA)) {
        
        /**
         * Sprawdź czy store już istnieje
         * 
         * db.objectStoreNames - lista istniejących stores
         * .contains() - sprawdza czy nazwa jest na liście
         */
        let store;
        if (db.objectStoreNames.contains(storeName)) {
          // Store istnieje - pobierz go z transakcji
          store = transaction.objectStore(storeName);
        } else {
          // Store nie istnieje - stwórz go
          store = db.createObjectStore(storeName, { keyPath });
          console.log(`[DB] Created store: ${storeName}`);
        }
        
        /**
         * Dodaj indeksy (jeśli nie istnieją)
         */
        for (const idx of indexes) {
          if (!store.indexNames.contains(idx.name)) {
            store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
            console.log(`[DB] Created index: ${storeName}.${idx.name}`);
          }
        }
      }
    };

    /**
     * EVENT: onsuccess
     * Baza otwarta pomyślnie - rozwiąż Promise
     */
    req.onsuccess = () => {
      console.log("[DB] Database opened successfully");
      res(req.result);
    };
    
    /**
     * EVENT: onerror
     * Błąd otwarcia - odrzuć Promise
     */
    req.onerror = () => {
      console.error("[DB] Failed to open database:", req.error);
      rej(req.error);
    };
  });

  return _dbPromise;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSAKCJE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tworzy transakcję na podanym store
 * 
 * CO TO JEST TRANSAKCJA?
 * - Kontener na operacje bazodanowe
 * - Gwarantuje że albo WSZYSTKIE operacje się udają, albo ŻADNA
 * - Automatycznie commituje po zakończeniu
 * 
 * TRYBY:
 * - "readonly" - tylko odczyt (szybsze, może być wiele naraz)
 * - "readwrite" - odczyt i zapis (blokuje store dla innych)
 * 
 * PRZYKŁAD:
 * const transaction = await tx("measurements", "readwrite");
 * const store = transaction.objectStore("measurements");
 * store.add({ ... });
 * 
 * @param {string|string[]} store - Nazwa store (lub tablica nazw)
 * @param {IDBTransactionMode} mode - "readonly" lub "readwrite"
 * @returns {Promise<IDBTransaction>} Promise z transakcją
 */
export const tx = (store, mode = "readonly") => {
  return database().then((db) => db.transaction(store, mode));
};

// ═══════════════════════════════════════════════════════════════════════════════
// OPERACJE CRUD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dodaje nowy rekord do store
 * 
 * UWAGA: add() wymaga unikalnego klucza!
 * Jeśli rekord z tym kluczem już istnieje, rzuca błąd.
 * (Użyj put() jeśli chcesz nadpisać)
 * 
 * PRZYKŁAD:
 * await add("measurements", {
 *   id: "abc-123",
 *   type: "bp",
 *   value: 120,
 *   value2: 80,
 *   ts: Date.now()
 * });
 * 
 * @param {string} storeName - Nazwa Object Store
 * @param {object} entry - Obiekt do zapisania (musi mieć pole keyPath)
 * @returns {Promise<object>} Ten sam obiekt entry
 */
export const add = async (storeName, entry) => {
  // 1. Otwórz transakcję w trybie "readwrite" (bo zapisujemy)
  const t = await tx(storeName, "readwrite");
  
  // 2. Dodaj rekord do store
  await new Promise((res, rej) => {
    /**
     * objectStore(name) - pobierz Object Store z transakcji
     * .add(entry) - dodaj rekord
     * 
     * add() jest asynchroniczne - zwraca IDBRequest
     * Musimy czekać na onsuccess/onerror
     */
    const req = t.objectStore(storeName).add(entry);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
  
  // 3. Poczekaj na zakończenie transakcji
  // (transakcja może się nie powieść nawet jeśli add() się udało)
  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
  
  // 4. Zwróć dodany obiekt
  return entry;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WYSZUKIWANIE (Cursor)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Przeszukuje store używając indeksu i kursora
 * 
 * CO TO JEST CURSOR?
 * - "Wskaźnik" który przesuwa się po rekordach
 * - Pozwala przeglądać rekordy jeden po drugim
 * - Efektywny dla dużych zbiorów (nie ładuje wszystkiego naraz)
 * 
 * PRZEPŁYW:
 * 1. Otwórz kursor na indeksie
 * 2. Dla każdego rekordu: sprawdź filtry, dodaj do wyników
 * 3. Przesuń kursor do następnego rekordu
 * 4. Powtarzaj aż koniec lub osiągnięto limit
 * 
 * PRZYKŁAD - pobierz 10 najnowszych pomiarów ciśnienia:
 * const results = await queryIndex("measurements", "by_ts", {
 *   direction: "prev",        // od najnowszych
 *   limit: 10,                // max 10 wyników
 *   filter: (v) => v.type === "bp"  // tylko ciśnienie
 * });
 * 
 * @param {string} storeName - Nazwa Object Store
 * @param {string} indexName - Nazwa indeksu do użycia
 * @param {object} opts - Opcje wyszukiwania:
 *   - direction: "prev" (malejąco) lub "next" (rosnąco)
 *   - limit: maksymalna liczba wyników (0 = bez limitu)
 *   - filter: funkcja (rekord) => boolean, zwraca true żeby dodać do wyników
 *   - stopWhen: funkcja (rekord) => boolean, zwraca true żeby przerwać
 * @returns {Promise<object[]>} Tablica znalezionych rekordów
 */
export const queryIndex = async (
  storeName,
  indexName,
  { direction = "prev", limit = 0, filter = null, stopWhen = null } = {}
) => {
  // 1. Otwórz transakcję (tylko odczyt)
  const t = await tx(storeName, "readonly");
  
  // 2. Pobierz indeks ze store
  const idx = t.objectStore(storeName).index(indexName);
  
  // 3. Tablica na wyniki
  const results = [];

  // 4. Przeszukaj używając kursora
  await new Promise((res, rej) => {
    /**
     * openCursor(range, direction)
     * 
     * range = null oznacza "wszystkie rekordy"
     * direction:
     *   - "next" = rosnąco (od najmniejszego klucza indeksu)
     *   - "prev" = malejąco (od największego klucza indeksu)
     *   - "nextunique" / "prevunique" = pomijaj duplikaty
     * 
     * Dla indeksu "by_ts" (timestamp):
     * - "prev" = od najnowszych do najstarszych
     * - "next" = od najstarszych do najnowszych
     */
    const req = idx.openCursor(null, direction);
    
    req.onsuccess = () => {
      /**
       * req.result = kursor (lub null jeśli koniec)
       * 
       * Kursor ma:
       * - .value = aktualny rekord
       * - .key = klucz indeksu
       * - .primaryKey = klucz główny rekordu
       * - .continue() = przejdź do następnego
       */
      const cur = req.result;
      
      // Koniec danych - zakończ
      if (!cur) return res();

      const v = cur.value;
      
      /**
       * stopWhen - warunek wcześniejszego zakończenia
       * 
       * Przydatne gdy wiesz że dalsze rekordy nie będą pasować.
       * Np. szukasz rekordów z dzisiaj, a cursor doszedł do wczoraj
       * - nie ma sensu sprawdzać dalszych (są jeszcze starsze)
       */
      if (stopWhen && stopWhen(v)) return res();
      
      /**
       * filter - funkcja filtrująca
       * 
       * Jeśli filter nie podany (null) - dodaj wszystko
       * Jeśli filter(v) zwraca true - dodaj do wyników
       * Jeśli filter(v) zwraca false - pomiń
       */
      if (!filter || filter(v)) {
        results.push(v);
      }
      
      /**
       * limit - maksymalna liczba wyników
       * 
       * 0 = bez limitu (zbierz wszystkie pasujące)
       * > 0 = zakończ gdy mamy tyle wyników
       */
      if (limit > 0 && results.length >= limit) return res();
      
      // Przesuń kursor do następnego rekordu
      cur.continue();
    };
    
    req.onerror = () => rej(req.error);
  });

  return results;
};
