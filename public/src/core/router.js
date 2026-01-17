// Mapa przechowująca zarejestrowane trasy aplikacji
const routes = new Map();

// Rejestruje trasy w routerze
export const registerRoute = (path, loader) => {
  routes.set(path, loader);
};

// Start routera opartego na hash w URL
export const startRouter = () => {
  const render = async () => {
    const hash = location.hash.replace("#", "") || "/";
    const loader = routes.get(hash) || routes.get("/404");
    const root = document.querySelector("#app");

    try {
      const view = await loader();
      root.replaceChildren(view);
      setActiveLink();
    } catch (error) {
      console.error(error);
      root.innerHTML = `<div class="errorBox"><strong>Wystąpił błąd podczas ładowania strony.</strong><br />${
        error?.message || error
      }</div>`;
    }
  };

  addEventListener("hashchange", render);

  if (document.readyState === "loading") {
    addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
};

// Oznacza aktywny link w nawigacji na podstawie aktualnego hash
export const setActiveLink = () => {
  const current = location.hash || "#/";
  document.querySelectorAll("a[data-route]").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === current);
  });
};

// Trasa 404 dla nieistniejących stron
registerRoute("/404", async () => {
  const el = document.createElement("div");

  el.className = "404box";
  el.innerHTML = `<h2>Nie znaleziono strony</h2>`;

  return el;
});
