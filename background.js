"use strict";

// Listen to sub_frame response headers to detect X-Frame-Options / CSP blocks
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type !== "sub_frame") return;

    if (isFrameBlocked(details.responseHeaders)) {
      chrome.tabs.sendMessage(details.tabId, {
        type: "frameBlocked",
        url: details.url,
      }).catch(() => {});
    }
  },
  { urls: ["<all_urls>"], types: ["sub_frame"] },
  ["responseHeaders", "extraHeaders"]
);

function isFrameBlocked(headers) {
  if (!headers) return false;
  for (const h of headers) {
    const name = h.name.toLowerCase();
    const val = (h.value || "").toLowerCase();

    if (name === "x-frame-options") {
      if (val === "deny" || val === "sameorigin") return true;
    }

    if (name === "content-security-policy") {
      const match = val.match(/frame-ancestors\s+([^;]+)/);
      if (match) {
        const ancestors = match[1].trim();
        if (ancestors === "'none'" || ancestors === "'self'") return true;
      }
    }
  }
  return false;
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "openTab") {
    chrome.tabs.create({ url: msg.url });
  }
});
