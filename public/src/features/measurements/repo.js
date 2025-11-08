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

export const latestBp = async (limit = 20) => {
  const t = await tx(STORE, "readonly");
  const idx = t.objectStore(STORE).index("by_ts");
  const results = [];
  const dir = "prev";

  await new Promise((res, rej) => {
    const req = idx.openCursor(null, dir);
    req.onsuccess = () => {
      const cur = req.result;

      if (!cur || results.length >= limit) return res();

      const v = cur.value;

      if (v.type === "bp") results.push(v);

      cur.continue();
    };
    req.onerror = () => rej(req.error);
  });

  return results;
};
