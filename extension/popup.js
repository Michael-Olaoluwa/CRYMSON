async function updateStatus() {
  const statusDot = document.getElementById("statusDot");
  const statusLabel = document.getElementById("statusLabel");
  const statusHint = document.getElementById("statusHint");
  const statusCard = document.getElementById("statusCard");
  const signOutBtn = document.getElementById("signOut");

  chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (response) => {
    if (response?.authenticated) {
      statusDot.className = "status-dot green";
      statusLabel.textContent = "Connected to Crymson";
      statusHint.textContent = "Tasks will be saved to your account";
      statusCard.className = "status-card connected";
      signOutBtn.style.display = "block";
    } else {
      statusDot.className = "status-dot gray";
      statusLabel.textContent = "Not signed in";
      statusHint.textContent = "Open Crymson and sign in to save tasks";
      statusCard.className = "status-card disconnected";
      signOutBtn.style.display = "none";
    }
  });
}

document.getElementById("scanNow").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: "SCAN_NOW" });
  const statusHint = document.getElementById("statusHint");
  statusHint.textContent = "Scanning...";
  setTimeout(() => updateStatus(), 2000);
});

document.getElementById("signOut").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_AUTH" }, () => {
    updateStatus();
  });
});

updateStatus();
