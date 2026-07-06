const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  getPermissions: () => ipcRenderer.invoke("get-permissions"),
  setPermission: (key, value) => ipcRenderer.invoke("set-permission", key, value),
  sendForDetection: (text, source) => ipcRenderer.invoke("send-for-detection", text, source),

  onTextDetected: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("text-detected", handler);
    return () => ipcRenderer.removeListener("text-detected", handler);
  },

  onShowCaptureDialog: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("show-capture-dialog", handler);
    return () => ipcRenderer.removeListener("show-capture-dialog", handler);
  },

  onPermissionsChanged: (callback) => {
    const handler = (event, permissions) => callback(permissions);
    ipcRenderer.on("permissions-changed", handler);
    return () => ipcRenderer.removeListener("permissions-changed", handler);
  },
});
