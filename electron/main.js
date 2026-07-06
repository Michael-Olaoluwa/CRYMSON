const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, clipboard } = require("electron");
const path = require("path");
const Store = require("electron-store");

const store = new Store({
  defaults: {
    permissions: {
      clipboard: false,
      globalHotkey: false,
      captureDialog: true,
    },
    windowBounds: { width: 1200, height: 800 },
  },
});

let mainWindow = null;
let tray = null;
let clipboardInterval = null;
let lastClipboardContent = "";

const isDev = !app.isPackaged;
const API_BASE = "http://localhost:5000";

function createWindow() {
  const { width, height } = store.get("windowBounds");

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, "..", "build", "icons", "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "build", "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", () => {
    const bounds = mainWindow.getBounds();
    store.set("windowBounds", bounds);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconSize = process.platform === "darwin" ? 16 : 32;
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("Crymson — Task Detector");

  const updateTrayMenu = () => {
    const permissions = store.get("permissions");
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Crymson",
        click: () => {
          if (mainWindow) mainWindow.show();
          else createWindow();
        },
      },
      { type: "separator" },
      {
        label: "Clipboard Monitor",
        type: "checkbox",
        checked: permissions.clipboard,
        click: (menuItem) => {
          store.set("permissions.clipboard", menuItem.checked);
          if (menuItem.checked) startClipboardMonitor();
          else stopClipboardMonitor();
          mainWindow?.webContents.send("permissions-changed", store.get("permissions"));
        },
      },
      {
        label: "Global Hotkey (Ctrl+Shift+D)",
        type: "checkbox",
        checked: permissions.globalHotkey,
        click: (menuItem) => {
          store.set("permissions.globalHotkey", menuItem.checked);
          if (menuItem.checked) registerHotkey();
          else unregisterHotkey();
          mainWindow?.webContents.send("permissions-changed", store.get("permissions"));
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateTrayMenu();
  tray.on("click", () => {
    if (mainWindow) mainWindow.show();
  });
}

function startClipboardMonitor() {
  if (clipboardInterval) return;

  lastClipboardContent = clipboard.readText();
  clipboardInterval = setInterval(async () => {
    if (!store.get("permissions.clipboard")) return;

    const currentText = clipboard.readText();
    if (!currentText || currentText === lastClipboardContent) return;
    lastClipboardContent = currentText;

    if (currentText.trim().length < 30) return;

    try {
      const res = await fetch(`${API_BASE}/api/detect/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentText, source: "clipboard" }),
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data.detections?.length > 0) {
        mainWindow?.webContents.send("text-detected", {
          text: currentText,
          detections: data.detections,
          detectionId: data.detectionId,
        });

        if (mainWindow?.isMinimized()) mainWindow.restore();
        if (!mainWindow?.isVisible()) mainWindow.show();
        mainWindow?.focus();
      }
    } catch (err) {
      console.error("Clipboard detection error:", err.message);
    }
  }, 1500);
}

function stopClipboardMonitor() {
  if (clipboardInterval) {
    clearInterval(clipboardInterval);
    clipboardInterval = null;
  }
}

function registerHotkey() {
  globalShortcut.register("CommandOrControl+Shift+D", () => {
    mainWindow?.webContents.send("show-capture-dialog");
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function unregisterHotkey() {
  globalShortcut.unregister("CommandOrControl+Shift+D");
}

ipcMain.handle("get-permissions", () => store.get("permissions"));

ipcMain.handle("set-permission", (event, key, value) => {
  store.set(`permissions.${key}`, value);

  if (key === "clipboard") {
    if (value) startClipboardMonitor();
    else stopClipboardMonitor();
  }
  if (key === "globalHotkey") {
    if (value) registerHotkey();
    else unregisterHotkey();
  }

  return store.get("permissions");
});

ipcMain.handle("send-for-detection", async (event, text, source) => {
  try {
    const res = await fetch(`${API_BASE}/api/detect/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source: source || "electron-capture" }),
    });
    if (!res.ok) return { error: "Detection failed" };
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle("get-is-electron", () => true);

app.whenReady().then(() => {
  createWindow();
  createTray();

  const permissions = store.get("permissions");
  if (permissions.clipboard) startClipboardMonitor();
  if (permissions.globalHotkey) registerHotkey();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
  else mainWindow.show();
});

app.on("will-quit", () => {
  stopClipboardMonitor();
  unregisterHotkey();
  globalShortcut.unregisterAll();
});
