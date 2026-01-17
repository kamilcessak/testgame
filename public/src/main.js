import { startRouter, setActiveLink } from "./core/router.js";

import "./features/dashboard/routes.js";
import "./features/measurements/routes.js";
import "./features/meals/routes.js";

const setupOfflineBanner = () => {
  const banner = document.querySelector("#offline-banner");
  const update = () => (banner.hidden = navigator.onLine);

  window.addEventListener("online", update);
  window.addEventListener("offline", update);

  update();
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("serviceWorker.js");
}

setupOfflineBanner();
startRouter();
setActiveLink();
