/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/measurements/routes.js                                       ║
 * ║  CO ROBI: Rejestruje trasę dla strony pomiarów                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { registerRoute } from "../../core/router.js";

/**
 * Trasa dla strony pomiarów
 * 
 * URL: http://localhost:8001/#/measurements
 * 
 * Na tej stronie użytkownik może:
 * - Dodać pomiar ciśnienia krwi
 * - Dodać pomiar wagi
 * - Przeglądać historię pomiarów
 */
registerRoute("/measurements", async () => {
  // Dynamicznie importuj widok (code splitting)
  const view = await import("./view.js");
  
  // Zwróć wyrenderowany widok
  return view.default();
});
