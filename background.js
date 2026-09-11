const PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "vsc-root",
    title: "Velocidad de video",
    contexts: ["video"]
  });
  for (const speed of PRESETS) {
    chrome.contextMenus.create({
      id: "vsc-speed-" + speed,
      parentId: "vsc-root",
      title: speed + "x",
      contexts: ["video"]
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.menuItemId.toString().startsWith("vsc-speed-")) return;
  const speed = parseFloat(info.menuItemId.toString().replace("vsc-speed-", ""));
  if (!tab || !tab.id) return;
  chrome.tabs.sendMessage(
    tab.id,
    { type: "vsc-set-speed", speed },
    info.frameId != null ? { frameId: info.frameId } : undefined
  );
});
