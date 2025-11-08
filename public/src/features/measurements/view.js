import { getBpList, getWeightList, addWeight, addBp } from "./controller.js";

const MeasurementsView = async () => {
  const root = document.createElement("section");

  root.innerHTML = `
  <div class="measurementsWrapper">
    <div class="measurementsFormWrapper">
      <div class="card">
          <h1>Dodaj pomiar ciśnienia:</h1>
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

      <div class="card">
        <h1>Dodaj pomiar wagi:</h1>
        <form id="weight-form">
          <label>Waga (kg)
            <input name="kg" type="number" step="0.1" min="1" max="500" required />
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
        <p id="weight-msg" style="margin-top:16px"></p>
      </div>
    </div>
    <div class="measurementsListWrapper">
      <div class="card">
          <h2>Ostatnie pomiary ciśnienia:</h2>
          <ul id="bp-list"></ul>
      </div>

      <div class="card">
          <h2>Ostatnie pomiary wagi:</h2>
          <ul id="weight-list"></ul>
      </div>
    </div>
  </div>
  `;

  const bpForm = root.querySelector("#bp-form");
  const bpMsg = root.querySelector("#bp-msg");
  const bpList = root.querySelector("#bp-list");

  const wgForm = root.querySelector("#weight-form");
  const wgMsg = root.querySelector("#weight-msg");
  const wgList = root.querySelector("#weight-list");

  bpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    bpMsg.textContent = "";
    const fd = new FormData(bpForm);

    try {
      await addBp({
        sys: fd.get("sys"),
        dia: fd.get("dia"),
        date: fd.get("date"),
        time: fd.get("time"),
        note: fd.get("note"),
      });

      bpForm.reset();
      bpMsg.style.color = "#0a7";
      bpMsg.textContent = "Zapisano pomiar!";
      await refreshBp();
    } catch (error) {
      bpMsg.style.color = "#c00";
      bpMsg.textContent = `Błąd: ${error?.message || error}`;
    }
  });

  wgForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    wgMsg.textContent = "";

    const fd = new FormData(wgForm);

    try {
      await addWeight({
        kg: fd.get("kg"),
        date: fd.get("date"),
        time: fd.get("time"),
        note: fd.get("note"),
      });

      wgForm.reset();
      wgMsg.style.color = "#0a7";
      wgMsg.textContent = "Zapisano pomiar!";

      await refreshWg();
    } catch (error) {
      wgMsg.style.color = "#c00";
      wgMsg.textContent = `Błąd: ${err?.message || err}`;
    }
  });

  const refreshBp = async () => {
    const items = await getBpList(20);

    if (!items.length) {
      bpList.innerHTML = `<li>Brak danych</li>`;
      return;
    }

    bpList.innerHTML = items
      .map(
        (e) =>
          `<li>${fmtDate(e.ts)} - <strong>${e.value}/${e.value2} mmHg</strong>
         ${e.note ? ` <em>${escapeHtml(e.note)}</em>` : ""}
         </li>`
      )
      .join("");
  };

  const refreshWg = async () => {
    const items = await getWeightList(20);
    wgList.innerHTML = items.length
      ? items
          .map(
            (e) => `
      <li>${fmtDate(e.ts)} - <strong>${e.value.toFixed(1)} kg</strong>${
              e.note ? ` <em>${escapeHtml(e.note)}</em>` : ""
            }</li>`
          )
          .join("")
      : `<li>Brak danych</li>`;
  };

  await Promise.all([refreshBp(), refreshWg()]);
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
