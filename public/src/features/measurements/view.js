import { getBp, addBp } from "./controller.js";

const MeasurementsView = async () => {
  const root = document.createElement("section");

  root.innerHTML = `
    <div>
        <h1>Dodaj pomiar ciśnienia</h1>
        <form id="bp-form">
            <label>Skurczowe
                <input name="sys" type="number" min="60" max="250" required />
            </label>
            <label>Rozkurczowe
                <input name="dia" type="number" min="30" max="150" required />
            </label>
            <label>Data pomiaru
                <input name="date" type="date" />
            </label>
            <label>Godzina pomiaru
                <input name="time" type="time" />
            </label>
            <label>Notatka
                <input name="note" type="text" placeholder="Opcjonalna..." />
            </label>
            <button class="btn" type="submit">Zapisz pomiar</button>
        </form>
        <p id="bp-msg" style="margin-top:16px"></p>
    </div>
    <div>
        <h2>Ostatnie pomiary:</h2>
        <ul id="bp-list"></ul>
    </div>
    `;

  const form = root.querySelector("#bp-form");
  const msg = root.querySelector("#bp-msg");
  const list = root.querySelector("#bp-list");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    const fd = new FormData(form);

    try {
      await addBp({
        sys: fd.get("sys"),
        dia: fd.get("dia"),
        date: fd.get("date"),
        time: fd.get("time"),
        note: fd.get("note"),
      });

      form.reset();
      msg.style.color = "#07a";
      msg.textContent = "Zapisano pomiar!";
      await refresh();
    } catch (error) {
      msg.style.color = "#caa";
      msg.textContent = `Błąd: ${error?.message || error}`;
    }
  });

  const refresh = async () => {
    const items = await getBp(20);

    if (!items.length) {
      list.innerHTML = `<li>Brak danych</li>`;
      return;
    }

    list.innerHTML = items
      .map(
        (e) =>
          `<li>${fmtDate(e.ts)} - <strong>${e.value}/${e.value2} mmHg</strong>
         ${e.note ? ` <em>${escapeHtml(e.note)}</em>` : ""}
         </li>`
      )
      .join("");
  };

  await refresh();
  return root;
};

const fmtDate = (ts) => {
  return new Date(ts).toLocaleString();
};

const escapeHtml = (s) => {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
};

export default MeasurementsView;
