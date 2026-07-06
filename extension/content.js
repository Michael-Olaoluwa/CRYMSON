(function () {
  "use strict";

  const CRYMSON_ATTR = "data-crymson-detected";
  const ICON_CLASS = "crymson-add-icon";
  const DIALOG_CLASS = "crymson-dialog";

  const TASK_PATTERNS = [
    /\b(assignment|homework|h\.w)\b.*?(due|submit|deadline)/i,
    /\b(due|deadline)\b.*?\b(tomorrow|today|next|this|fri|mon|tue|wed|thu|sun|sat|\d{1,2}\/\d{1,2}|\d{4})/i,
    /\b(exam|test|quiz|midterm|final)\b.*?\b(on|at|by|due|date)/i,
    /\bsubmit\b.*?\b(by|before|on|due|tomorrow|fri|mon|tue|wed|thu|sun|sat|\d{1,2}\/\d{1,2})/i,
    /\b(project|presentation|paper|essay)\b.*?\b(due|submit|deadline|presentation|on|by)/i,
    /\b(worth|weight|counts?|makes? up)\b.*?\d+%/i,
    /\b\d+%\b.*?\b(grade|mark|score|final|total|assessment)/i,
    /\blab(\s*report|\s*work)?\b.*?\b(due|submit|deadline)/i,
    /\b(read(ing)?|chapter)\b.*?\b(by|before|for|due|on)/i,
    /\b(no\s*class|reschedule|cancelled|postponed)\b/i,
  ];

  const MARKER_CLASSES = [
    "crymson-marker", "crymson-icon-container"
  ];

  function getTaskText(el) {
    let text = "";
    if (el.tagName === "LI" || el.tagName === "P" || el.tagName === "TD" ||
        el.tagName === "TH" || el.tagName === "DIV" || el.tagName === "SPAN" ||
        el.tagName === "SECTION" || el.tagName === "BLOCKQUOTE") {
      text = el.textContent.trim();
    }
    if (text.length < 20) {
      const parent = el.closest("li, p, td, th, div.card, div.item, div.post, .message, .announcement, .description, .content");
      if (parent && parent !== el) text = parent.textContent.trim();
    }
    return text.replace(/\s+/g, " ").slice(0, 1000);
  }

  function matchesTaskPattern(text) {
    return TASK_PATTERNS.some((re) => re.test(text));
  }

  function iconWasAdded(el) {
    return el.hasAttribute(CRYMSON_ATTR) || el.querySelector(`.${ICON_CLASS}`);
  }

  function getCandidates() {
    const selectors = "p, li, td, th, div:not([class*='crymson']):not([id='crymson-root'])";
    const elements = document.querySelectorAll(selectors);
    const candidates = [];
    for (const el of elements) {
      if (iconWasAdded(el)) continue;
      if (el.closest("#crymson-root, .crymson-dialog, .crymson-icon-container")) continue;
      const text = getTaskText(el);
      if (text.length < 15) continue;
      if (matchesTaskPattern(text)) {
        candidates.push({ el, text });
      }
    }
    return candidates;
  }

  function addIcon(el, text) {
    el.setAttribute(CRYMSON_ATTR, "true");

    const icon = document.createElement("span");
    icon.className = ICON_CLASS;
    icon.setAttribute("role", "button");
    icon.setAttribute("tabindex", "0");
    icon.setAttribute("aria-label", "Add to Crymson tasks");
    icon.title = "Add to Crymson tasks";
    icon.innerHTML =
      '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="9"/><line x1="10" y1="6" x2="10" y2="14"/><line x1="6" y1="10" x2="14" y2="10"/></svg>';

    const label = document.createElement("span");
    label.className = "crymson-label";
    label.textContent = "Add task";
    label.style.cssText =
      "display:none;font-size:11px;margin-left:4px;white-space:nowrap;color:#800020;font-weight:500;";

    icon.style.cssText =
      "display:inline-flex;align-items:center;cursor:pointer;margin-left:4px;vertical-align:middle;color:#800020;opacity:0.5;transition:opacity 0.15s;pointer-events:auto;padding:1px;border-radius:3px;background:rgba(128,0,32,0.08);user-select:none;";

    icon.appendChild(label);

    icon.addEventListener("mouseenter", () => {
      icon.style.opacity = "1";
      label.style.display = "inline";
    });
    icon.addEventListener("mouseleave", () => {
      icon.style.opacity = "0.5";
      label.style.display = "none";
    });

    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      showQuickDialog(text, icon);
    });

    if (el.tagName === "LI" || el.tagName === "P" || el.tagName === "TD" ||
        el.tagName === "TH" || el.tagName === "BLOCKQUOTE") {
      el.appendChild(icon);
    } else {
      icon.style.marginLeft = "8px";
      el.parentNode?.insertBefore(icon, el.nextSibling);
    }
  }

  function showQuickDialog(text, anchorEl) {
    const existing = document.querySelector(`.${DIALOG_CLASS}`);
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = DIALOG_CLASS;
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);";

    const dialog = document.createElement("div");
    dialog.style.cssText =
      "background:#1a1a2e;border:1px solid #2d2d44;border-radius:12px;padding:20px;width:420px;max-width:90vw;box-shadow:0 16px 48px rgba(0,0,0,0.5);color:#e0e0e0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5;animation:crymsonFadeIn 0.15s ease-out;";
    dialog.innerHTML =
      `<style>
        @keyframes crymsonFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .crymson-dialog-title { font-weight:600; font-size:15px; margin-bottom:4px; color:#e0e0e0; }
        .crymson-dialog-sub { font-size:12px; color:#999; margin-bottom:12px; }
        .crymson-dialog-text { background:#0f0f1a; border:1px solid #2d2d44; border-radius:8px; padding:10px; font-size:13px; color:#ccc; margin-bottom:16px; max-height:120px; overflow-y:auto; word-break:break-word; }
        .crymson-dialog-actions { display:flex; gap:8px; }
        .crymson-btn-primary { flex:1; padding:10px; border:none; border-radius:8px; background:#800020; color:#fff; font-size:13px; font-weight:600; cursor:pointer; }
        .crymson-btn-primary:hover { opacity:0.9; }
        .crymson-btn-secondary { padding:10px 16px; border:1px solid #2d2d44; border-radius:8px; background:transparent; color:#999; font-size:13px; cursor:pointer; }
        .crymson-btn-secondary:hover { color:#e0e0e0; }
        .crymson-dialog-status { font-size:12px; margin-top:8px; text-align:center; padding:6px; border-radius:6px; }
        .crymson-dialog-status.success { background:rgba(22,163,74,0.15); color:#16a34a; }
        .crymson-dialog-status.error { background:rgba(220,38,38,0.15); color:#dc2626; }
      </style>
      <div class="crymson-dialog-title">Add to Crymson tasks?</div>
      <div class="crymson-dialog-sub">This task will be added to your Crymson task manager</div>
      <div class="crymson-dialog-text">${escapeHtml(text)}</div>
      <div class="crymson-dialog-actions">
        <button class="crymson-btn-primary" id="crymson-confirm">Add to tasks</button>
        <button class="crymson-btn-secondary" id="crymson-cancel">Ignore</button>
      </div>
      <div id="crymson-status"></div>`;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    dialog.querySelector("#crymson-cancel").addEventListener("click", () => {
      overlay.remove();
    });

    dialog.querySelector("#crymson-confirm").addEventListener("click", async () => {
      const btn = dialog.querySelector("#crymson-confirm");
      btn.disabled = true;
      btn.textContent = "Analyzing...";
      btn.style.opacity = "0.6";

      try {
        chrome.runtime.sendMessage(
          { type: "ADD_TASK", text, url: window.location.href, title: document.title },
          (response) => {
            const statusEl = dialog.querySelector("#crymson-status");
            if (response?.ok) {
              statusEl.className = "crymson-dialog-status success";
              statusEl.textContent = response.taskCount
                ? response.taskCount > 1
                  ? `${response.taskCount} tasks added successfully`
                  : "Task added successfully"
                : "Task added successfully";
              btn.textContent = "Done";
              btn.disabled = true;
              setTimeout(() => overlay.remove(), 2000);
            } else {
              statusEl.className = "crymson-dialog-status error";
              statusEl.textContent = response?.error || "Failed to add task. Sign in to Crymson first.";
              btn.disabled = false;
              btn.textContent = "Add to tasks";
              btn.style.opacity = "1";
            }
          }
        );
      } catch (err) {
        const statusEl = dialog.querySelector("#crymson-status");
        statusEl.className = "crymson-dialog-status error";
        statusEl.textContent = "Error: " + err.message;
        btn.disabled = false;
        btn.textContent = "Add to tasks";
        btn.style.opacity = "1";
      }
    });
  }

  function escapeHtml(str) {
    const el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  function scanPage() {
    if (!document.body) return;
    try {
      const candidates = getCandidates();
      for (const { el, text } of candidates) {
        addIcon(el, text);
      }
    } catch (e) {
      // ignore errors for cross-origin or dynamic pages
    }
  }

  function debouncedScan() {
    clearTimeout(window._crymsonScanTimer);
    window._crymsonScanTimer = setTimeout(scanPage, 1500);
  }

  function initMarker() {
    const root = document.createElement("div");
    root.id = "crymson-root";
    root.style.cssText = "display:none;";
    document.documentElement.appendChild(root);
    window.postMessage({ type: "CRYMSON_EXTENSION_READY" }, "*");
  }

  initMarker();

  window.addEventListener("message", (event) => {
    if (event.data?.type === "CRYMSON_AUTH_TOKEN" && event.data.token) {
      chrome.runtime.sendMessage({ type: "SET_AUTH_TOKEN", token: event.data.token });
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanPage);
  } else {
    scanPage();
  }

  const observer = new MutationObserver(debouncedScan);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SCAN_NOW") {
      clearTimeout(window._crymsonScanTimer);
      scanPage();
    }
  });
})();
