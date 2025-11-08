import { tx } from "../../core/database.js";

const STORE = "measurements";

export const add = async (entry) => {
  const t = await tx(STORE, "readwrite");

  await new Promise((res, rej) => {
    const req = t.objectStore(STORE).add(entry);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });

  await new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });

  return entry;
};

export const latestByType = async (type, limit = 20) => {
  const t = await tx(STORE, "readonly");
  const idx = t.objectStore(STORE).index("by_ts");
  const results = [];

  await new Promise((res, rej) => {
    const req = idx.openCursor(null, "prev");
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur) return res();
      const v = cur.value;
      if (v.type === type) results.push(v);
      if (results.length >= limit) return res();
      cur.continue();
    };
    req.onerror = () => rej(req.error);
  });

  return results;
};
