(() => {
  if (window.__vscContentLoaded) return;
  window.__vscContentLoaded = true;

  let settings = null;
  const loopStates = new WeakMap(); // video -> { start, end, active, handler }
  const overlays = new WeakMap(); // video -> { overlay, speedDisplay, resizeObserver }

  VSCStorage.getSettings().then((s) => {
    settings = s;
    scanForVideos();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.settings) {
      settings = { ...settings, ...changes.settings.newValue };
    }
  });

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function clampSpeed(speed) {
    if (!settings) return speed;
    return VSCStorage.clamp(round1(speed), settings.minSpeed, settings.maxSpeed);
  }

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = el.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      el.isContentEditable
    );
  }

  function getTargetVideo() {
    const videos = Array.from(document.querySelectorAll("video"));
    if (videos.length === 0) return null;
    const playing = videos.find((v) => !v.paused && !v.ended && v.readyState > 2);
    if (playing) return playing;
    let best = videos[0];
    let bestArea = 0;
    for (const v of videos) {
      const rect = v.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > bestArea) {
        bestArea = area;
        best = v;
      }
    }
    return best;
  }

  function showToast(video, message) {
    const entry = overlays.get(video);
    const parent = entry ? entry.parent : video.parentElement;
    if (!parent) return;
    let toast = entry && entry.toast;
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "vsc-toast";
      parent.appendChild(toast);
      if (entry) entry.toast = toast;
    }
    toast.textContent = message;
    positionToast(video, toast, parent);
    toast.classList.add("vsc-toast-visible");
    clearTimeout(toast._vscTimer);
    toast._vscTimer = setTimeout(() => {
      toast.classList.remove("vsc-toast-visible");
    }, 900);
  }

  function positionToast(video, toast, parent) {
    const vRect = video.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();
    toast.style.top = vRect.top - pRect.top + 8 + "px";
    toast.style.left = vRect.left - pRect.left + vRect.width / 2 + "px";
  }

  function applySpeed(video, speed, opts = {}) {
    const { persist = true, showFeedback = true } = opts;
    if (!settings) return;
    const clamped = clampSpeed(speed);
    video.playbackRate = clamped;
    const entry = overlays.get(video);
    if (entry) entry.speedDisplay.textContent = clamped.toFixed(1) + "x";
    if (persist && settings.perSitePersistence) {
      VSCStorage.setSiteSpeed(location.hostname, clamped);
    }
    if (showFeedback) showToast(video, clamped.toFixed(1) + "x");
  }

  function adjustSpeed(video, delta) {
    const current = video.playbackRate || 1.0;
    applySpeed(video, current + delta);
  }

  function resetSpeed(video) {
    applySpeed(video, 1.0);
  }

  function skip(video, seconds) {
    if (!Number.isFinite(video.duration)) {
      video.currentTime = Math.max(0, video.currentTime + seconds);
      return;
    }
    video.currentTime = VSCStorage.clamp(video.currentTime + seconds, 0, video.duration);
    showToast(video, (seconds > 0 ? "+" : "") + seconds + "s");
  }

  function handleLoopKey(video) {
    let state = loopStates.get(video);
    if (!state || (state.start != null && state.end != null)) {
      state = { start: video.currentTime, end: null, handler: null };
      loopStates.set(video, state);
      showToast(video, "Loop: inicio marcado");
      return;
    }
    if (state.end == null) {
      let start = state.start;
      let end = video.currentTime;
      if (end < start) [start, end] = [end, start];
      state.start = start;
      state.end = end;
      state.handler = () => {
        if (video.currentTime >= state.end) {
          video.currentTime = state.start;
        }
      };
      video.addEventListener("timeupdate", state.handler);
      loopStates.set(video, state);
      showToast(video, "Loop activo");
      return;
    }
  }

  function clearLoop(video) {
    const state = loopStates.get(video);
    if (state && state.handler) {
      video.removeEventListener("timeupdate", state.handler);
    }
    loopStates.delete(video);
    showToast(video, "Loop desactivado");
  }

  document.addEventListener(
    "keydown",
    (e) => {
      if (!settings || isTypingTarget(document.activeElement)) return;
      const key = e.key.toLowerCase();
      const kb = settings.keybindings;
      const video = getTargetVideo();
      if (!video) return;

      switch (key) {
        case kb.slower:
          adjustSpeed(video, -settings.speedStep);
          break;
        case kb.faster:
          adjustSpeed(video, settings.speedStep);
          break;
        case kb.reset:
          resetSpeed(video);
          break;
        case kb.skipBack:
          skip(video, -settings.skipSeconds);
          break;
        case kb.skipForward:
          skip(video, settings.skipSeconds);
          break;
        case kb.loop:
          if (e.shiftKey) {
            clearLoop(video);
          } else {
            handleLoopKey(video);
          }
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  function positionOverlay(video, overlay, parent) {
    const vRect = video.getBoundingClientRect();
    const pRect = parent.getBoundingClientRect();
    overlay.style.top = vRect.top - pRect.top + 8 + "px";
    overlay.style.left = vRect.left - pRect.left + 8 + "px";
  }

  function bindVideo(video) {
    if (video.dataset.vscBound) return;
    video.dataset.vscBound = "1";

    let parent = video.parentElement;
    if (!parent) return;
    const computed = getComputedStyle(parent);
    if (computed.position === "static") {
      parent.style.position = "relative";
    }

    const overlay = document.createElement("div");
    overlay.className = "vsc-overlay";

    const btnMinus = document.createElement("button");
    btnMinus.textContent = "−0.1";
    btnMinus.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      adjustSpeed(video, -(settings ? settings.speedStep : 0.1));
    });

    const speedDisplay = document.createElement("span");
    speedDisplay.className = "vsc-speed-display";
    speedDisplay.textContent = (video.playbackRate || 1).toFixed(1) + "x";

    const btnPlus = document.createElement("button");
    btnPlus.textContent = "+0.1";
    btnPlus.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      adjustSpeed(video, settings ? settings.speedStep : 0.1);
    });

    const btnReset = document.createElement("button");
    btnReset.textContent = "R";
    btnReset.title = "Reset a 1x";
    btnReset.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      resetSpeed(video);
    });

    overlay.appendChild(btnMinus);
    overlay.appendChild(speedDisplay);
    overlay.appendChild(btnPlus);
    overlay.appendChild(btnReset);
    parent.appendChild(overlay);

    const entry = { overlay, speedDisplay, parent, toast: null };
    overlays.set(video, entry);

    const reposition = () => positionOverlay(video, overlay, parent);
    reposition();

    const resizeObserver = new ResizeObserver(reposition);
    resizeObserver.observe(video);
    entry.resizeObserver = resizeObserver;

    window.addEventListener("resize", reposition, true);
    window.addEventListener("scroll", reposition, true);

    const applySavedSpeed = async () => {
      if (!settings) return;
      if (!settings.perSitePersistence) return;
      const saved = await VSCStorage.getSiteSpeed(location.hostname);
      if (saved != null) {
        applySpeed(video, saved, { persist: false, showFeedback: false });
      }
    };

    if (video.readyState >= 1) {
      applySavedSpeed();
    } else {
      video.addEventListener("loadedmetadata", applySavedSpeed, { once: true });
    }
  }

  function scanForVideos() {
    document.querySelectorAll("video").forEach(bindVideo);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.tagName === "VIDEO") bindVideo(node);
        node.querySelectorAll && node.querySelectorAll("video").forEach(bindVideo);
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setInterval(scanForVideos, 3000);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "vsc-set-speed") {
      const video = getTargetVideo();
      if (video) applySpeed(video, message.speed);
      sendResponse({ ok: !!video });
      return true;
    }
    if (message.type === "vsc-get-state") {
      const video = getTargetVideo();
      sendResponse({
        hasVideo: !!video,
        speed: video ? video.playbackRate : null,
        hostname: location.hostname
      });
      return true;
    }
    if (message.type === "vsc-forget-site") {
      VSCStorage.clearSiteSpeed(location.hostname);
      sendResponse({ ok: true });
      return true;
    }
  });
})();
