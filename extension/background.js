const API_BASE = "http://localhost:5000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ADD_TASK") {
    handleAddTask(message.text, message.url, message.title, sender.tab?.id)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === "GET_AUTH_STATUS") {
    chrome.storage.local.get("authToken", ({ authToken }) => {
      sendResponse({ authenticated: Boolean(authToken) });
    });
    return true;
  }

  if (message.type === "SET_AUTH_TOKEN") {
    chrome.storage.local.set({ authToken: message.token }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "CLEAR_AUTH") {
    chrome.storage.local.remove("authToken", () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});

async function handleAddTask(text, url, pageTitle, tabId) {
  const { authToken } = await chrome.storage.local.get("authToken");
  if (!authToken) {
    return { ok: false, error: "Not signed in. Open Crymson to sign in first." };
  }

  const detectRes = await fetch(`${API_BASE}/api/detect/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source: "extension-inline" }),
  });
  if (!detectRes.ok) {
    return { ok: false, error: "Detection failed" };
  }

  const detectData = await detectRes.json();
  if (!detectData.detections?.length) {
    return { ok: true, taskCount: 0 };
  }

  const acceptRes = await fetch(`${API_BASE}/api/detect/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      detectionId: detectData.detectionId,
      detections: detectData.detections,
    }),
  });

  if (!acceptRes.ok) {
    return { ok: false, error: "Failed to save tasks" };
  }

  const acceptData = await acceptRes.json();

  if (tabId) {
    chrome.action.setBadgeText({ text: String(acceptData.tasks?.length || "1"), tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#16a34a", tabId });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "", tabId });
    }, 8000);
  }

  return { ok: true, taskCount: acceptData.tasks?.length || 1 };
}
