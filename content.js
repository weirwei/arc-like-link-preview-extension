"use strict";

(() => {
  /* ───────── config ───────── */
  const IFRAME_LOAD_TIMEOUT = 5000; // ms before fallback

  /* ───────── state ───────── */
  let overlay = null;
  let enabled = true;
  let mode = "newTabOnly"; // "newTabOnly" | "all"
  let autoOpenBlocked = true;
  let openTabShortcut = { key: "o", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false };

  // Load saved state
  try {
    chrome.storage.local.get(
      { enabled: true, mode: "newTabOnly", autoOpenBlocked: true, openTabShortcut },
      (data) => {
        enabled = data.enabled;
        mode = data.mode;
        autoOpenBlocked = data.autoOpenBlocked;
        openTabShortcut = data.openTabShortcut;
      }
    );

    // Listen for changes from popup
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) enabled = changes.enabled.newValue;
      if (changes.mode) mode = changes.mode.newValue;
      if (changes.autoOpenBlocked) autoOpenBlocked = changes.autoOpenBlocked.newValue;
      if (changes.openTabShortcut) openTabShortcut = changes.openTabShortcut.newValue;
    });
  } catch {
    // Extension context invalidated — use defaults
  }

  /* ───────── SVG icons ───────── */

  const ICON_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`;

  const ICON_CLOSE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`;

  /* ───────── DOM builders ───────── */

  function createOverlay(url) {
    const el = document.createElement("div");
    el.className = "lp-overlay";
    el.innerHTML = `
      <div class="lp-card">
        <div class="lp-topbar">
          <span class="lp-url">${escapeHtml(url)}</span>
          <button class="lp-btn lp-btn-open" title="Open in new tab">${ICON_OPEN}</button>
          <button class="lp-btn lp-btn-close" title="Close">${ICON_CLOSE}</button>
        </div>
        <div class="lp-spinner"></div>
        <iframe class="lp-frame" referrerpolicy="no-referrer"></iframe>
      </div>
    `;
    return el;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  /* ───────── core: show preview ───────── */

  // The URL currently being previewed in iframe (for frameBlocked matching)
  let currentPreviewUrl = null;

  const ICON_BLOCK = `<svg class="lp-fallback-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
  </svg>`;

  // Check if extension context is still valid
  function isContextValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  // Listen for background telling us the iframe got blocked
  if (isContextValid()) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "frameBlocked" && overlay && msg.url === currentPreviewUrl) {
        if (autoOpenBlocked) {
          closePreview();
          window.open(msg.url, "_blank");
        } else {
          showFallback(msg.url);
        }
      }
    });
  }

  function showFallback(url) {
    if (!overlay) return;
    // Remove spinner and iframe, show fallback message
    const card = overlay.querySelector(".lp-card");
    const spinner = card.querySelector(".lp-spinner");
    const iframe = card.querySelector(".lp-frame");
    if (spinner) spinner.remove();
    if (iframe) iframe.remove();

    const fallback = document.createElement("div");
    fallback.className = "lp-fallback";
    fallback.innerHTML = `
      ${ICON_BLOCK}
      <div class="lp-fallback-text">${escapeHtml(new URL(url).hostname)}<br>does not allow embedding</div>
      <button class="lp-fallback-btn">Open in new tab</button>
    `;
    fallback.querySelector(".lp-fallback-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      window.open(url, "_blank");
      closePreview();
    });
    card.appendChild(fallback);
  }

  function showPreview(url) {
    if (overlay) closePreview();

    currentPreviewUrl = url;
    overlay = createOverlay(url);
    document.body.appendChild(overlay);

    const iframe = overlay.querySelector(".lp-frame");
    const spinner = overlay.querySelector(".lp-spinner");

    function onLoaded() {
      try {
        if (iframe.contentDocument && iframe.contentDocument.body) {
          const body = iframe.contentDocument.body;
          if (body.innerHTML.trim() === "" && body.children.length === 0) {
            showFallback(url);
            return;
          }
        }
      } catch {
        // Cross-origin — rely on webRequest detection
      }
      if (spinner.parentNode) spinner.remove();
    }

    iframe.addEventListener("load", onLoaded);

    setTimeout(() => {
      if (spinner.parentNode) spinner.remove();
    }, IFRAME_LOAD_TIMEOUT);

    iframe.src = url;

    // ── Close button
    overlay.querySelector(".lp-btn-close").addEventListener("click", (e) => {
      e.stopPropagation();
      closePreview();
    });

    // ── Open-in-tab button
    overlay.querySelector(".lp-btn-open").addEventListener("click", (e) => {
      e.stopPropagation();
      window.open(url, "_blank");
      closePreview();
    });

    // ── Click backdrop to close
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePreview();
    });

    // ── Esc to close
    document.addEventListener("keydown", onKeyDown);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add("lp-visible"));
  }

  /* ───────── core: close preview ───────── */

  function closePreview() {
    if (!overlay) return;
    document.removeEventListener("keydown", onKeyDown);
    overlay.classList.remove("lp-visible");
    const el = overlay;
    overlay = null;
    // Wait for fade-out transition
    setTimeout(() => el.remove(), 200);
  }

  function matchesShortcut(e, s) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    return key === s.key &&
      e.metaKey === s.metaKey &&
      e.ctrlKey === s.ctrlKey &&
      e.altKey === s.altKey &&
      e.shiftKey === s.shiftKey;
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closePreview();
    } else if (currentPreviewUrl && matchesShortcut(e, openTabShortcut)) {
      e.preventDefault();
      window.open(currentPreviewUrl, "_blank");
      closePreview();
    }
  }

  /* ───────── intercept link clicks ───────── */

  /** Basic validation common to both modes */
  function isValidLink(anchor) {
    if (!anchor.href) return false;
    if (!/^https?:\/\//i.test(anchor.href)) return false;
    if (anchor.href.split("#")[0] === location.href.split("#")[0]) return false;
    if (anchor.hasAttribute("download")) return false;
    return true;
  }

  /** Check if a link would open a new tab */
  function wouldOpenNewTab(anchor, e) {
    const target = anchor.target.toLowerCase();
    if (target === "_blank") return true;
    if (target && target !== "_self" && target !== "_top" && target !== "_parent") return true;
    if (e.metaKey || e.ctrlKey) return true;
    if (e.shiftKey) return true;
    if (e.button === 1) return true;
    return false;
  }

  function shouldIntercept(anchor, e) {
    if (!isValidLink(anchor)) return false;
    if (mode === "all") {
      // In "all" mode, skip modifier-key clicks (let user bypass with Ctrl/Cmd)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
      if (e.button !== 0) return false;
      return true;
    }
    // "newTabOnly" mode
    return wouldOpenNewTab(anchor, e);
  }

  document.addEventListener(
    "click",
    (e) => {
      if (!enabled) return;
      const anchor = e.target.closest("a");
      if (!anchor || !shouldIntercept(anchor, e)) return;

      e.preventDefault();
      e.stopPropagation();
      showPreview(anchor.href);
    },
    true
  );

  // Middle-click (auxclick) — only in newTabOnly mode
  document.addEventListener(
    "auxclick",
    (e) => {
      if (!enabled) return;
      if (e.button !== 1) return;
      if (mode !== "newTabOnly") return;

      const anchor = e.target.closest("a");
      if (!anchor || !isValidLink(anchor)) return;

      e.preventDefault();
      e.stopPropagation();
      showPreview(anchor.href);
    },
    true
  );
})();
