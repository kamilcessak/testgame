import { latestByType } from "../measurements/repo.js";
import { getTodayCalories } from "../meals/controller.js";

export const getTodaySummary = async () => {
  const latestWg = await latestByType("weight", 1);
  const latestBp = await latestByType("bp", 1);
  const eatenCalories = await getTodayCalories();

  console.log({ latestWg, latestBp, eatenCalories });

  return {
    date: new Date(),
    calories: { eaten: eatenCalories, target: 2000 },
    lastWeight:
      latestWg && latestWg.length > 0
        ? { kg: latestWg[0].value, ts: latestWg[0].ts }
        : null,
    lastBp:
      latestBp && latestBp.length > 0
        ? {
            sys: latestBp[0].value,
            dia: latestBp[0].value2,
            ts: latestBp[0].ts,
          }
        : null,
  };
};
