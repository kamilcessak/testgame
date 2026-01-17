import { startRouter, setActiveLink } from "./core/router.js";

// Rejestracja tras aplikacji
import "./features/dashboard/routes.js";
import "./features/measurements/routes.js";
import "./features/meals/routes.js";

// Konfiguracja bannera offline
const setupOfflineBanner = () => {
  const banner = document.querySelector("#offline-banner");
  if (!banner) return;
  
  const update = () => {
    const isOnline = navigator.onLine;
    if (isOnline) {
      banner.hidden = true;
      banner.style.display = "none";
    } else {
      banner.hidden = false;
      banner.style.display = "flex";
    }
  };

  window.addEventListener("online", update);
  window.addEventListener("offline", update);

  // Czeka na załadowanie DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", update);
  } else {
    update();
  }
};

// Rejestracja Service Workera dla obsługi offline
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/serviceWorker.js").catch(console.error);
}

// Obsługa promptu instalacji PWA
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("PWA może być zainstalowana");
});

setupOfflineBanner();
startRouter();
setActiveLink();
