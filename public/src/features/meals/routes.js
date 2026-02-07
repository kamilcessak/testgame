/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/meals/routes.js                                              ║
 * ║  CO ROBI: Rejestruje trasy dla strony posiłków                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { registerRoute } from "../../core/router.js";

/**
 * Trasa dla strony posiłków
 * 
 * URL: http://localhost:8001/#/meals
 */
registerRoute("/meals", async () => {
  const view = await import("./view.js");
  return view.default();
});

/**
 * Alternatywna trasa (link w nawigacji używa tej nazwy)
 * 
 * URL: http://localhost:8001/#/nutrition
 * 
 * Ta sama strona co /meals - tylko inna nazwa w URL
 */
registerRoute("/nutrition", async () => {
  const view = await import("./view.js");
  return view.default();
});
