"use strict";

// Apply i18n text to all elements with data-i18n attribute
document.querySelectorAll("[data-i18n]").forEach((el) => {
  el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
});

const toggle = document.getElementById("toggle");
const autoOpen = document.getElementById("autoOpen");
const modeRadios = document.querySelectorAll('input[name="mode"]');
const shortcutKey = document.getElementById("shortcutKey");

const DEFAULT_SHORTCUT = { key: "o", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false };
const isMac = navigator.platform.includes("Mac");

function formatShortcut(s) {
  const parts = [];
  if (s.metaKey) parts.push(isMac ? "\u2318" : "Win");
  if (s.ctrlKey) parts.push(isMac ? "\u2303" : "Ctrl");
  if (s.altKey) parts.push(isMac ? "\u2325" : "Alt");
  if (s.shiftKey) parts.push(isMac ? "\u21E7" : "Shift");
  parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
  return parts.join(isMac ? "" : "+");
}

// Load saved state
chrome.storage.local.get(
  { enabled: true, mode: "newTabOnly", autoOpenBlocked: true, openTabShortcut: DEFAULT_SHORTCUT },
  (data) => {
    toggle.checked = data.enabled;
    autoOpen.checked = data.autoOpenBlocked;
    document.querySelector(`input[name="mode"][value="${data.mode}"]`).checked = true;
    shortcutKey.textContent = formatShortcut(data.openTabShortcut);
  }
);

toggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggle.checked });
});

autoOpen.addEventListener("change", () => {
  chrome.storage.local.set({ autoOpenBlocked: autoOpen.checked });
});

modeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    chrome.storage.local.set({ mode: radio.value });
  });
});

// Shortcut key recording
shortcutKey.addEventListener("focus", () => {
  shortcutKey.textContent = chrome.i18n.getMessage("shortcutRecording") || "Press keys...";
  shortcutKey.classList.add("recording");
});

shortcutKey.addEventListener("blur", () => {
  shortcutKey.classList.remove("recording");
  // Restore current value
  chrome.storage.local.get({ openTabShortcut: DEFAULT_SHORTCUT }, (data) => {
    shortcutKey.textContent = formatShortcut(data.openTabShortcut);
  });
});

shortcutKey.addEventListener("keydown", (e) => {
  e.preventDefault();
  e.stopPropagation();

  // Ignore lone modifier keys
  if (["Meta", "Control", "Alt", "Shift"].includes(e.key)) return;
  // Require at least one modifier
  if (!e.metaKey && !e.ctrlKey && !e.altKey) return;

  const shortcut = {
    key: e.key.length === 1 ? e.key.toLowerCase() : e.key,
    metaKey: e.metaKey,
    ctrlKey: e.ctrlKey,
    altKey: e.altKey,
    shiftKey: e.shiftKey,
  };

  chrome.storage.local.set({ openTabShortcut: shortcut });
  shortcutKey.textContent = formatShortcut(shortcut);
  shortcutKey.classList.remove("recording");
  shortcutKey.blur();
});
