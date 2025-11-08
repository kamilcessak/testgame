export const validateBloodPreassure = (e) => {
  if (e.type !== "bp") throw new Error("Nieprawidłowy typ pomiaru");
  if (!Number.isFinite(e.value) || !Number.isFinite(e.value2))
    throw new Error("Podaj prawidłowe liczby ciśnienia");
  if (e.value < 60 || e.value > 250)
    throw new Error("Wartość skurczowa poza zakresem (60-250)");
  if (e.value2 < 30 || e.value2 > 150)
    throw new Error("Wartość rozkurczowa poza zakresem (30-150)");
  if (!Number.isFinite(e.ts)) throw new Error("Nieprawidłowa data");

  return e;
};

export const validateWeight = (e) => {
  if (e.type !== "weight") throw new Error("Nieprawidłowy typ pomiaru");
  if (!Number.isFinite(e.value)) throw new Error("Podaj poprawną wartość wagi");
  if (e.value <= 0 || e.value > 500)
    throw new Error("Waga poza zakresem (1 - 500)kg");
  if (!Number.isFinite(e.ts)) throw new Error("Nieprawidłowa Data");

  return e;
};

export const newBloodPressure = ({ sys, dia, ts = Date.now(), note = "" }) => {
  const result = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    type: "bp",
    value: +sys,
    value2: +dia,
    ts: +ts,
    note: `${note}`,
  };

  return validateBloodPreassure(result);
};

export const newWeight = ({ kg, ts = Date.now(), note = "" }) => {
  const result = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    type: "weight",
    value: +kg,
    ts: +ts,
    note: `${note}`,
  };

  return validateWeight(result);
};
