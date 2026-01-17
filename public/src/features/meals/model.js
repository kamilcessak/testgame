// Waliduje dane posiłku
export const validateMeal = (e) => {
  if (e.type !== "meal") throw new Error("Nieprawidłowy typ posiłku");
  if (!Number.isFinite(e.calories) || e.calories <= 0)
    throw new Error("Podaj prawidłową liczbę kalorii");
  if (!Number.isFinite(e.protein)) throw new Error("Podaj prawidłową wartość białka");
  if (!Number.isFinite(e.carbs)) throw new Error("Podaj prawidłową wartość węglowodanów");
  if (!Number.isFinite(e.fats)) throw new Error("Podaj prawidłową wartość tłuszczów");
  if (!Number.isFinite(e.ts)) throw new Error("Nieprawidłowa data");

  return e;
};

// Tworzy nowy obiekt posiłku
export const newMeal = ({
  calories,
  description = "",
  protein = 0,
  carbs = 0,
  fats = 0,
  image = null,
  ts = Date.now(),
  note = "",
}) => {
  const result = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    type: "meal",
    calories: +calories,
    description: `${description}`,
    protein: +protein,
    carbs: +carbs,
    fats: +fats,
    image: image,
    ts: +ts,
    note: `${note}`,
  };

  return validateMeal(result);
};

