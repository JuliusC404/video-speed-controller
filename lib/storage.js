// Shared storage helpers. Loaded as a plain script (not a module) so it
// works identically in the service worker (`self`) and content/popup/options
// pages (`window` === `self`).

const VSC_DEFAULT_KEYBINDINGS = {
  slower: "s",
  faster: "d",
  reset: "r",
  skipBack: "z",
  skipForward: "x",
  loop: "l"
};

const VSC_DEFAULT_SETTINGS = {
  keybindings: VSC_DEFAULT_KEYBINDINGS,
  skipSeconds: 5,
  defaultSpeed: 1.0,
  speedStep: 0.1,
  minSpeed: 0.1,
  maxSpeed: 4.0,
  perSitePersistence: true
};

const VSCStorage = {
  async getSettings() {
    const stored = await chrome.storage.sync.get("settings");
    return { ...VSC_DEFAULT_SETTINGS, ...(stored.settings || {}) };
  },

  async saveSettings(partial) {
    const current = await VSCStorage.getSettings();
    const next = { ...current, ...partial };
    await chrome.storage.sync.set({ settings: next });
    return next;
  },

  async getSiteSpeed(hostname) {
    const stored = await chrome.storage.local.get("siteSpeeds");
    const siteSpeeds = stored.siteSpeeds || {};
    return siteSpeeds[hostname];
  },

  async setSiteSpeed(hostname, speed) {
    const stored = await chrome.storage.local.get("siteSpeeds");
    const siteSpeeds = stored.siteSpeeds || {};
    siteSpeeds[hostname] = speed;
    await chrome.storage.local.set({ siteSpeeds });
  },

  async clearSiteSpeed(hostname) {
    const stored = await chrome.storage.local.get("siteSpeeds");
    const siteSpeeds = stored.siteSpeeds || {};
    delete siteSpeeds[hostname];
    await chrome.storage.local.set({ siteSpeeds });
  },

  async listSiteSpeeds() {
    const stored = await chrome.storage.local.get("siteSpeeds");
    return stored.siteSpeeds || {};
  },

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
};

// Expose on the global object for both window (pages) and self (service worker).
self.VSCStorage = VSCStorage;
self.VSC_DEFAULT_SETTINGS = VSC_DEFAULT_SETTINGS;
