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
              <label>Lokalizacja
                  <div style="display: flex; gap: 8px; align-items: center;">
                      <input name="location" type="text" placeholder="Opcjonalna..." style="flex: 1;" />
                      <button type="button" id="get-location-btn">📍 Pobierz</button>
                  </div>
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
  const locationInput = root.querySelector('input[name="location"]');
  const getLocationBtn = root.querySelector("#get-location-btn");

  const wgForm = root.querySelector("#weight-form");
  const wgMsg = root.querySelector("#weight-msg");
  const wgList = root.querySelector("#weight-list");

  // Funkcja do pobierania lokalizacji
  const getLocation = () => {
    if (!navigator.geolocation) {
      bpMsg.style.color = "#c00";
      bpMsg.textContent =
        "Geolokacja nie jest obsługiwana przez twoją przeglądarkę";
      return;
    }

    getLocationBtn.disabled = true;
    getLocationBtn.textContent = "⏳ Pobieranie...";
    bpMsg.textContent = "";

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );

          if (response.ok) {
            const data = await response.json();
            const address = data.address;
            let locationStr = "";

            if (address) {
              const parts = [];
              if (address.road) parts.push(address.road);
              if (address.house_number) parts.push(address.house_number);
              if (address.city || address.town || address.village) {
                parts.push(address.city || address.town || address.village);
              }
              locationStr =
                parts.join(", ") ||
                data.display_name ||
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            } else {
              locationStr = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            }

            locationInput.value = locationStr;
            getLocationBtn.disabled = false;
            getLocationBtn.textContent = "📍 Pobierz";
          } else {
            // Fallback do współrzędnych
            locationInput.value = `${latitude.toFixed(6)}, ${longitude.toFixed(
              6
            )}`;
            getLocationBtn.disabled = false;
            getLocationBtn.textContent = "📍 Pobierz";
          }
        } catch (error) {
          // Fallback do współrzędnych jeśli reverse geocoding nie działa
          const { latitude, longitude } = position.coords;
          locationInput.value = `${latitude.toFixed(6)}, ${longitude.toFixed(
            6
          )}`;
          getLocationBtn.disabled = false;
          getLocationBtn.textContent = "📍 Pobierz";
        }
      },
      (error) => {
        bpMsg.style.color = "#c00";
        bpMsg.textContent = `Błąd pobierania lokalizacji: ${error.message}`;
        getLocationBtn.disabled = false;
        getLocationBtn.textContent = "📍 Pobierz";
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  getLocationBtn.addEventListener("click", getLocation);

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
        location: fd.get("location"),
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
         ${
           e.location ? ` <br/><small>📍 ${escapeHtml(e.location)}</small>` : ""
         }
         ${e.note ? ` <br/><em>${escapeHtml(e.note)}</em>` : ""}
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
