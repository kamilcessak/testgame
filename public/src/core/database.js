let _database;

export const database = async () => {
  if (_database) return _database;

  _database = await new Promise((res, rej) => {
    const req = indexedDB.open("healthDB", 2);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("measurements")) {
        const s = d.createObjectStore("measurements", { keyPath: "id" });
        s.createIndex("by_ts", "ts", { unique: false });
        s.createIndex("by_type", "type", { unique: false });
      }
      if (!d.objectStoreNames.contains("meals")) {
        const s = d.createObjectStore("meals", { keyPath: "id" });
        s.createIndex("by_ts", "ts", { unique: false });
        s.createIndex("by_type", "type", { unique: false });
      }
      if (!d.objectStoreNames.contains("settings")) {
        d.createObjectStore("settings", { keyPath: "key" });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });

  return _database;
};

export const tx = (store, mode = "readonly") => {
  return database().then((d) => d.transaction(store, mode));
};

export const uuid = () =>
  crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;
