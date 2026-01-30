import { uuid } from "../../utils/uuid.js";
import {
  MEAL_TYPE,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTE_LENGTH,
} from "../../constants.js";

// Waliduje dane posiłku
export const validateMeal = (e) => {
  if (e.type !== MEAL_TYPE) throw new Error("Nieprawidłowy typ posiłku");
  if (!Number.isFinite(e.calories) || e.calories <= 0)
    throw new Error("Podaj prawidłową liczbę kalorii");
  if (!Number.isFinite(e.protein) || e.protein < 0)
    throw new Error("Podaj prawidłową wartość białka");
  if (!Number.isFinite(e.carbs) || e.carbs < 0)
    throw new Error("Podaj prawidłową wartość węglowodanów");
  if (!Number.isFinite(e.fats) || e.fats < 0)
    throw new Error("Podaj prawidłową wartość tłuszczów");
  if (!Number.isFinite(e.ts)) throw new Error("Nieprawidłowa data");
  if (e.description.length > MAX_DESCRIPTION_LENGTH)
    throw new Error(`Opis może mieć co najwyżej ${MAX_DESCRIPTION_LENGTH} znaków.`);
  if (e.note.length > MAX_NOTE_LENGTH)
    throw new Error(`Notatka może mieć co najwyżej ${MAX_NOTE_LENGTH} znaków.`);
  
  if (e.image != null) {
    if (e.image instanceof Blob) {
      if (!e.image.type.startsWith("image/"))
        throw new Error("Nieprawidłowy typ zdjęcia (oczekiwano obrazu).");
    } else if (typeof e.image !== "string" || !e.image.startsWith("data:image/")) {
      throw new Error("Nieprawidłowy format zdjęcia.");
    }
  }

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
    id: uuid(),
    type: MEAL_TYPE,
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

