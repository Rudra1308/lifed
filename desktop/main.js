const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const { spawn, execSync } = require("child_process");
const http = require("http");

let mainWindow = null;
let quickCaptureWindow = null;
let backendProcess = null;
let frontendProcess = null;
let isQuitting = false;

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 3000;

// Helper to check if a local port is responding
function checkPort(port, path = "/") {
  return new Promise((resolve) => {
    const req = http.get({ hostname: "127.0.0.1", port, path, timeout: 1000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Wait for a port to become ready
async function waitForPort(port, path = "/", maxRetries = 30, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    const isReady = await checkPort(port, path);
    if (isReady) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

// Start Python FastAPI Backend
async function startBackend() {
  const isAlreadyRunning = await checkPort(BACKEND_PORT, "/api/health");
  if (isAlreadyRunning) {
    console.log("[Desktop] Backend is already running on port", BACKEND_PORT);
    return;
  }

  console.log("[Desktop] Spawning Python FastAPI backend...");
  backendProcess = spawn("python", ["-m", "uvicorn", "backend.app.main:app", "--port", String(BACKEND_PORT)], {
    cwd: PROJECT_ROOT,
    shell: true,
    stdio: "inherit",
  });

  backendProcess.on("error", (err) => {
    console.error("[Desktop] Failed to spawn backend:", err);
  });
}

// Start Next.js Frontend (if not already running)
async function startFrontend() {
  const isAlreadyRunning = await checkPort(FRONTEND_PORT);
  if (isAlreadyRunning) {
    console.log("[Desktop] Frontend is already running on port", FRONTEND_PORT);
    return;
  }

  console.log("[Desktop] Spawning Next.js server...");
  frontendProcess = spawn("npm", ["run", "start"], {
    cwd: path.join(PROJECT_ROOT, "frontend"),
    shell: true,
    stdio: "inherit",
  });

  frontendProcess.on("error", () => {
    // Fallback to dev if start fails
    frontendProcess = spawn("npm", ["run", "dev"], {
      cwd: path.join(PROJECT_ROOT, "frontend"),
      shell: true,
      stdio: "inherit",
    });
  });
}
function createMainWindow() {
  const iconPath = path.join(__dirname, "assets", "icon.ico");
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: "Lifed — Personal AI Command Center",
    backgroundColor: "#090a0f",
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${FRONTEND_PORT}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      // In desktop app, closing main window quits the app
      isQuitting = true;
      cleanupProcesses();
    }
  });
}

function createQuickCaptureWindow() {
  quickCaptureWindow = new BrowserWindow({
    width: 720,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  quickCaptureWindow.loadURL(`http://localhost:${FRONTEND_PORT}/quick-capture`);

  quickCaptureWindow.on("blur", () => {
    // Auto-hide when user clicks away
    if (quickCaptureWindow && quickCaptureWindow.isVisible()) {
      quickCaptureWindow.hide();
    }
  });
}

function toggleQuickCapture() {
  if (!quickCaptureWindow) return;
  if (quickCaptureWindow.isVisible()) {
    quickCaptureWindow.hide();
  } else {
    quickCaptureWindow.center();
    quickCaptureWindow.show();
    quickCaptureWindow.focus();
  }
}

function cleanupProcesses() {
  console.log("[Desktop] Cleaning up background processes...");
  if (backendProcess) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /pid ${backendProcess.pid} /T /F`);
      } else {
        backendProcess.kill();
      }
    } catch (e) {
      // ignore
    }
    backendProcess = null;
  }

  if (frontendProcess) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /pid ${frontendProcess.pid} /T /F`);
      } else {
        frontendProcess.kill();
      }
    } catch (e) {
      // ignore
    }
    frontendProcess = null;
  }
}

// App Lifecycle
app.whenReady().then(async () => {
  await startBackend();
  await startFrontend();

  // Auto-grant media and microphone permissions for seamless voice dictation
  const { session } = require("electron");
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media" || permission === "microphone" || permission === "audioCapture") {
      return callback(true);
    }
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });

  // Wait for frontend and backend to respond
  await waitForPort(BACKEND_PORT, "/api/health", 20, 1000);
  await waitForPort(FRONTEND_PORT, "/", 20, 1000);

  createMainWindow();
  createQuickCaptureWindow();

  // Register Global Shortcuts (User preferred: Ctrl+Space)
  const registeredCtrlSpace = globalShortcut.register("CommandOrControl+Space", toggleQuickCapture);
  if (registeredCtrlSpace) {
    console.log("[Desktop] Successfully registered primary global hotkey: Ctrl+Space");
  } else {
    console.warn("[Desktop] Ctrl+Space registration failed; trying Alt+Space");
    globalShortcut.register("Alt+Space", toggleQuickCapture);
  }



  // IPC Handlers
  ipcMain.on("quick-capture-hide", () => {
    if (quickCaptureWindow) quickCaptureWindow.hide();
  });

  ipcMain.on("main-window-show", () => {
    if (quickCaptureWindow) quickCaptureWindow.hide();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.on("window-minimize", () => mainWindow?.minimize());
  ipcMain.on("window-maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on("window-close", () => {
    isQuitting = true;
    app.quit();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  cleanupProcesses();
});

app.on("window-all-closed", () => {
  isQuitting = true;
  cleanupProcesses();
  app.quit();
});
