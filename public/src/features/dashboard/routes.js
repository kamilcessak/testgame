/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PLIK: features/dashboard/routes.js                                          ║
 * ║  CO ROBI: Rejestruje trasy (URL-e) dla dashboardu                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * TEN PLIK JEST IMPORTOWANY W main.js
 * 
 * Gdy main.js robi:
 * import "./features/dashboard/routes.js";
 * 
 * Ten plik się WYKONUJE i rejestruje trasy.
 * Dzięki temu router "wie" że:
 * - "#/" → pokaż dashboard
 * - "#/dashboard" → pokaż dashboard (alternatywny URL)
 */

import { registerRoute } from "../../core/router.js";

/**
 * Trasa dla strony głównej "/"
 * 
 * URL: http://localhost:8001/#/
 * 
 * Loader jest ASYNC bo:
 * 1. Używa dynamic import() - ładuje moduł dopiero gdy potrzebny
 * 2. view.default() może być async (pobiera dane z bazy)
 * 
 * DYNAMIC IMPORT - CO TO?
 * 
 * Normalny import (na górze pliku):
 * import { DashboardView } from "./view.js";  // Ładuje OD RAZU
 * 
 * Dynamic import (w środku kodu):
 * const view = await import("./view.js");     // Ładuje GDY WYWOŁANE
 * 
 * DLACZEGO DYNAMIC?
 * - Code splitting - każda strona w osobnym "chunk"
 * - Szybszy początkowy load (nie ładujemy wszystkiego od razu)
 * - User odwiedza tylko dashboard? Nie ładujemy kodu pomiarów.
 */
registerRoute("/", async () => {
  // Dynamicznie importuj moduł view.js
  const view = await import("./view.js");
  
  // view.default to domyślny export z view.js (DashboardView)
  // Wywołujemy go żeby dostać element HTML
  return view.default();
});

/**
 * Alternatywna trasa "/dashboard"
 * 
 * URL: http://localhost:8001/#/dashboard
 * 
 * Robi TO SAMO co "/" - po prostu inny URL prowadzi do tego samego widoku.
 * Użytkownik może preferować jeden lub drugi.
 */
registerRoute("/dashboard", async () => {
  const view = await import("./view.js");
  return view.default();
});
