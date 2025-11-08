const routes = new Map();

export const registerRoute = (path, loader) => {
  routes.set(path, loader);
};

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

export const setActiveLink = () => {
  const current = location.hash || "#/";
  document.querySelectorAll("a[data-route]").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === current);
  });
};

registerRoute("/404", async () => {
  const el = document.createElement("div");

  el.className = "404box";
  el.innerHTML = `<h2>Nie znaleziono strony</h2>`;

  return el;
});
