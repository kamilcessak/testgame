import { latestByType } from "../measurements/repo.js";

export const getTodaySummary = async () => {
  const latestWg = await latestByType("weight", 1);
  const latestBp = await latestByType("bp", 1);

  console.log({ latestWg, latestBp });

  return {
    date: new Date(),
    calories: { eaten: 1000, target: 2000 },
    lastWeight: latestWg ? { kg: latestWg[0].value, ts: latestWg[0].ts } : null,
    lastBp: latestBp
      ? { sys: latestBp[0].value, dia: latestBp[0].value2, ts: latestBp[0].ts }
      : null,
  };
};
