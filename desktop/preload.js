const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  platform: process.platform,
  hideQuickCapture: () => ipcRenderer.send("quick-capture-hide"),
  showMainWindow: () => ipcRenderer.send("main-window-show"),
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),

  // Dynamic Island Notch IPC APIs
  onNotchStateUpdate: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("notch-state-update", handler);
    return () => ipcRenderer.removeListener("notch-state-update", handler);
  },
  onNotchAlert: (callback) => {
    const handler = (event, alert) => callback(alert);
    ipcRenderer.on("notch-alert", handler);
    return () => ipcRenderer.removeListener("notch-alert", handler);
  },
  onAlertResolved: (callback) => {
    const handler = (event, res) => callback(res);
    ipcRenderer.on("notch-alert-resolved", handler);
    return () => ipcRenderer.removeListener("notch-alert-resolved", handler);
  },
  respondNotchAlert: (alertId, actionId) => {
    ipcRenderer.send("notch-action-response", { alertId, actionId });
  },
  triggerTestAlert: (type) => {
    ipcRenderer.send("notch-trigger-test", type);
  },
  setNotchSize: (width, height) => {
    ipcRenderer.send("notch-set-size", { width, height });
  },
  toggleQuickCapture: () => {
    ipcRenderer.send("quick-capture-toggle");
  },
  focusOrLaunchApp: (appName, appId) => {
    ipcRenderer.send("app-focus-or-launch", { appName, appId });
  },
});
