const PRESETS = [0.5, 1, 1.25, 1.5, 2, 3];

let activeTabId = null;
let currentHostname = null;

const statusEl = document.getElementById("status");
const speedValueEl = document.getElementById("speedValue");
const presetsEl = document.getElementById("presets");
const customSpeedEl = document.getElementById("customSpeed");

function renderPresets() {
  presetsEl.innerHTML = "";
  for (const speed of PRESETS) {
    const btn = document.createElement("button");
    btn.textContent = speed + "x";
    btn.addEventListener("click", () => setSpeed(speed));
    presetsEl.appendChild(btn);
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function refreshState() {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    statusEl.textContent = "Sin pestaña activa.";
    return;
  }
  activeTabId = tab.id;
  chrome.tabs.sendMessage(tab.id, { type: "vsc-get-state" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      statusEl.textContent = "No se detectó video en esta pestaña.";
      return;
    }
    currentHostname = response.hostname;
    if (!response.hasVideo) {
      statusEl.textContent = "No hay video reproduciéndose en " + (response.hostname || "esta página");
      speedValueEl.textContent = "—";
      return;
    }
    statusEl.textContent = response.hostname;
    speedValueEl.textContent = response.speed.toFixed(1) + "x";
  });
}

function setSpeed(speed) {
  if (!activeTabId) return;
  chrome.tabs.sendMessage(activeTabId, { type: "vsc-set-speed", speed }, () => {
    refreshState();
  });
}

document.getElementById("btnMinus").addEventListener("click", async () => {
  const settings = await VSCStorage.getSettings();
  const current = parseFloat(speedValueEl.textContent) || 1.0;
  setSpeed(Math.max(settings.minSpeed, current - settings.speedStep));
});

document.getElementById("btnPlus").addEventListener("click", async () => {
  const settings = await VSCStorage.getSettings();
  const current = parseFloat(speedValueEl.textContent) || 1.0;
  setSpeed(Math.min(settings.maxSpeed, current + settings.speedStep));
});

document.getElementById("btnReset").addEventListener("click", () => setSpeed(1.0));

document.getElementById("btnApplyCustom").addEventListener("click", () => {
  const value = parseFloat(customSpeedEl.value);
  if (!Number.isNaN(value)) setSpeed(value);
});

document.getElementById("btnForgetSite").addEventListener("click", async () => {
  if (!currentHostname) return;
  await VSCStorage.clearSiteSpeed(currentHostname);
  if (activeTabId) {
    chrome.tabs.sendMessage(activeTabId, { type: "vsc-forget-site" });
  }
  statusEl.textContent = "Velocidad olvidada para " + currentHostname;
});

document.getElementById("linkOptions").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

renderPresets();
refreshState();
