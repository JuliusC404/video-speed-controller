const KEYBIND_LABELS = {
  slower: "Bajar velocidad",
  faster: "Subir velocidad",
  reset: "Reset a 1x",
  skipBack: "Skip atrás",
  skipForward: "Skip adelante",
  loop: "Marcar loop (Shift = borrar)"
};

const keybindGrid = document.getElementById("keybindGrid");
const skipSecondsEl = document.getElementById("skipSeconds");
const speedStepEl = document.getElementById("speedStep");
const minSpeedEl = document.getElementById("minSpeed");
const maxSpeedEl = document.getElementById("maxSpeed");
const perSitePersistenceEl = document.getElementById("perSitePersistence");
const siteTableBody = document.getElementById("siteTableBody");
const siteEmptyMsg = document.getElementById("siteEmptyMsg");
const saveMsg = document.getElementById("saveMsg");

let currentKeybindings = {};

function renderKeybindGrid() {
  keybindGrid.innerHTML = "";
  for (const [action, label] of Object.entries(KEYBIND_LABELS)) {
    const labelEl = document.createElement("label");
    labelEl.textContent = label;

    const input = document.createElement("input");
    input.type = "text";
    input.readOnly = true;
    input.value = (currentKeybindings[action] || "").toUpperCase();
    input.dataset.action = action;
    input.addEventListener("keydown", (e) => {
      e.preventDefault();
      if (e.key === "Escape") {
        input.blur();
        return;
      }
      currentKeybindings[action] = e.key.toLowerCase();
      input.value = e.key.toUpperCase();
    });

    keybindGrid.appendChild(labelEl);
    keybindGrid.appendChild(input);
  }
}

async function renderSiteTable() {
  const siteSpeeds = await VSCStorage.listSiteSpeeds();
  const entries = Object.entries(siteSpeeds);
  siteTableBody.innerHTML = "";
  siteEmptyMsg.style.display = entries.length === 0 ? "block" : "none";
  for (const [hostname, speed] of entries) {
    const tr = document.createElement("tr");

    const tdHost = document.createElement("td");
    tdHost.textContent = hostname;

    const tdSpeed = document.createElement("td");
    tdSpeed.textContent = Number(speed).toFixed(1) + "x";

    const tdAction = document.createElement("td");
    const btn = document.createElement("button");
    btn.textContent = "Borrar";
    btn.addEventListener("click", async () => {
      await VSCStorage.clearSiteSpeed(hostname);
      renderSiteTable();
    });
    tdAction.appendChild(btn);

    tr.appendChild(tdHost);
    tr.appendChild(tdSpeed);
    tr.appendChild(tdAction);
    siteTableBody.appendChild(tr);
  }
}

async function loadSettings() {
  const settings = await VSCStorage.getSettings();
  currentKeybindings = { ...settings.keybindings };
  skipSecondsEl.value = settings.skipSeconds;
  speedStepEl.value = settings.speedStep;
  minSpeedEl.value = settings.minSpeed;
  maxSpeedEl.value = settings.maxSpeed;
  perSitePersistenceEl.checked = settings.perSitePersistence;
  renderKeybindGrid();
}

document.getElementById("btnSave").addEventListener("click", async () => {
  await VSCStorage.saveSettings({
    keybindings: currentKeybindings,
    skipSeconds: parseInt(skipSecondsEl.value, 10) || 5,
    speedStep: parseFloat(speedStepEl.value) || 0.1,
    minSpeed: parseFloat(minSpeedEl.value) || 0.1,
    maxSpeed: parseFloat(maxSpeedEl.value) || 4.0,
    perSitePersistence: perSitePersistenceEl.checked
  });
  saveMsg.textContent = "Guardado.";
  setTimeout(() => (saveMsg.textContent = ""), 1500);
});

loadSettings();
renderSiteTable();
