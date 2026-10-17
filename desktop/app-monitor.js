const { spawn } = require("child_process");
const path = require("path");
const EventEmitter = require("events");

class AppMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.pollInterval = options.pollInterval || 2000;
    this.psScriptPath = path.join(__dirname, "get_active_app.ps1");
    this.timer = null;
    this.isPolling = false;

    this.currentApp = null;
    this.appStartedAt = Date.now();
    this.runningApps = [];
    this.permittedDistractions = new Map(); // appName -> expiry timestamp
    this.alertCooldowns = new Map(); // alertType -> timestamp of last alert

    this.lastActiveAlert = null;
    this.focusGuardDurationSec = options.focusGuardDurationSec || 60; // warn after 60s of browsing if on task
    this.sessionNudgeDurationSec = options.sessionNudgeDurationSec || 2700; // 45 minutes
  }

  start() {
    if (this.timer) return;
    console.log("[AppMonitor] Starting native Windows background app monitor...");
    this.poll();
    this.timer = setInterval(() => this.poll(), this.pollInterval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  poll() {
    if (this.isPolling) return;
    this.isPolling = true;

    const proc = spawn("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      this.psScriptPath,
    ]);

    let output = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      this.isPolling = false;
      if (code === 0) {
        this.parseOutput(output);
      }
    });

    proc.on("error", (err) => {
      this.isPolling = false;
      console.error("[AppMonitor] Process error:", err);
    });
  }

  parseOutput(raw) {
    try {
      const startMarker = "RESULT_START";
      const endMarker = "RESULT_END";
      const sIdx = raw.indexOf(startMarker);
      const eIdx = raw.indexOf(endMarker);

      if (sIdx === -1 || eIdx === -1) return;

      const jsonStr = raw.substring(sIdx + startMarker.length, eIdx).trim();
      const data = JSON.parse(jsonStr);

      const active = data.active || { pid: 0, process: "desktop", title: "Desktop" };
      const running = Array.isArray(data.running) ? data.running : [];

      this.runningApps = running;

      const activeProcName = (active.process || "").toLowerCase();
      const prevProcName = this.currentApp ? (this.currentApp.process || "").toLowerCase() : null;

      if (activeProcName !== prevProcName) {
        this.currentApp = active;
        this.appStartedAt = Date.now();
        this.emit("app-changed", {
          active: this.currentApp,
          running: this.runningApps,
          durationSec: 0,
        });
      } else {
        const durationSec = Math.floor((Date.now() - this.appStartedAt) / 1000);
        this.emit("state-tick", {
          active: this.currentApp,
          running: this.runningApps,
          durationSec,
        });
        this.evaluateRules(activeProcName, durationSec);
      }
    } catch (e) {
      console.error("[AppMonitor] JSON parse error:", e);
    }
  }

  evaluateRules(appName, durationSec) {
    // If an alert is already active on screen, don't spam
    if (this.lastActiveAlert) return;

    const now = Date.now();
    const browsingApps = ["brave", "chrome", "msedge", "firefox", "opera"];

    // Rule 1: Focus Guard for Browsers / Distraction Apps
    if (browsingApps.includes(appName)) {
      const permissionExpiry = this.permittedDistractions.get(appName);
      const isPermitted = permissionExpiry && permissionExpiry > now;

      const lastCooldown = this.alertCooldowns.get("focus_guard_" + appName) || 0;
      const isCooldownOver = now - lastCooldown > 5 * 60 * 1000; // 5 min cooldown

      if (!isPermitted && durationSec >= this.focusGuardDurationSec && isCooldownOver) {
        this.triggerAlert({
          id: "alert_" + Date.now(),
          type: "focus_guard",
          appName: this.capitalize(appName),
          title: "Focus Guard Notice",
          message: `You've been in ${this.capitalize(appName)} for ${Math.floor(durationSec / 60) || 1}m. Do you have permission to continue or would you like to refocus on your Lifed tasks?`,
          actions: [
            { id: "allow_15", label: "Allow (15 min)", variant: "outline" },
            { id: "focus_task", label: "Open Lifed & Focus", variant: "primary" },
            { id: "dismiss", label: "Dismiss", variant: "ghost" },
          ],
        });
        this.alertCooldowns.set("focus_guard_" + appName, now);
        return;
      }
    }

    // Rule 2: Prolonged Session Nudge (>45 min)
    const sessionCooldown = this.alertCooldowns.get("session_nudge") || 0;
    if (durationSec >= this.sessionNudgeDurationSec && now - sessionCooldown > 15 * 60 * 1000) {
      this.triggerAlert({
        id: "alert_" + Date.now(),
        type: "session_duration",
        appName: this.capitalize(appName),
        title: "Session Duration Nudge",
        message: `Continuous focus in ${this.capitalize(appName)} has reached ${Math.floor(durationSec / 60)} minutes. Want to log your progress or take a 5-minute stretch?`,
        actions: [
          { id: "log_task", label: "Log Progress in Lifed", variant: "primary" },
          { id: "stretch", label: "5m Break", variant: "outline" },
          { id: "dismiss", label: "Keep Going", variant: "ghost" },
        ],
      });
      this.alertCooldowns.set("session_nudge", now);
    }
  }

  triggerAlert(alert) {
    this.lastActiveAlert = alert;
    this.emit("attention-requested", alert);
  }

  handleAction(alertId, actionId) {
    console.log(`[AppMonitor] Handling alert action: ${alertId} -> ${actionId}`);
    const activeProc = this.currentApp ? (this.currentApp.process || "").toLowerCase() : "brave";

    if (actionId === "allow_15") {
      // Grant 15 minute permission
      this.permittedDistractions.set(activeProc, Date.now() + 15 * 60 * 1000);
      this.lastActiveAlert = null;
      this.emit("alert-resolved", { alertId, actionId, permittedUntil: Date.now() + 15 * 60 * 1000 });
      return;
    }

    if (actionId === "focus_task" || actionId === "log_task") {
      this.lastActiveAlert = null;
      this.emit("alert-resolved", { alertId, actionId });
      this.emit("request-show-main");
      return;
    }

    // Dismiss or stretch
    this.lastActiveAlert = null;
    this.emit("alert-resolved", { alertId, actionId });
  }

  activateApp(appName, appId) {
    console.log(`[AppMonitor] Activating or launching app: ${appName} (PID: ${appId})`);
    const activateScript = path.join(__dirname, "activate_app.ps1");
    const args = [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      activateScript,
      "-appName",
      appName || "",
    ];
    if (appId) {
      args.push("-appPid", String(appId));
    }
    try {
      const proc = spawn("powershell", args, { detached: true, stdio: "ignore" });
      proc.unref();
    } catch (e) {
      console.error("[AppMonitor] Failed to activate app:", e);
    }
  }

  // Helper for manual demo/testing of alerts from the UI
  triggerSimulationAlert(type = "focus_guard") {
    const activeProc = this.currentApp ? (this.currentApp.process || "brave") : "brave";
    if (type === "focus_guard") {
      this.triggerAlert({
        id: "sim_" + Date.now(),
        type: "focus_guard",
        appName: this.capitalize(activeProc),
        title: "Focus Guard Notice",
        message: `You are currently using ${this.capitalize(activeProc)}. Scheduled task "Deep Work Sprint" is active. Grant browsing permission?`,
        actions: [
          { id: "allow_15", label: "Allow (15 min)", variant: "outline" },
          { id: "focus_task", label: "Open Lifed & Focus", variant: "primary" },
          { id: "dismiss", label: "Dismiss", variant: "ghost" },
        ],
      });
    } else if (type === "session_duration") {
      this.triggerAlert({
        id: "sim_" + Date.now(),
        type: "session_duration",
        appName: this.capitalize(activeProc),
        title: "Session Duration Nudge",
        message: `You've been in ${this.capitalize(activeProc)} for 45 minutes straight. Take a 5-minute stretch or record a task note?`,
        actions: [
          { id: "log_task", label: "Log Progress in Lifed", variant: "primary" },
          { id: "stretch", label: "5m Break", variant: "outline" },
          { id: "dismiss", label: "Keep Going", variant: "ghost" },
        ],
      });
    } else {
      this.triggerAlert({
        id: "sim_" + Date.now(),
        type: "reminder",
        appName: "Lifed Core",
        title: "AI Task Reminder",
        message: "Background analysis finished: 3 high-priority tasks pending review for today's daily plan.",
        actions: [
          { id: "focus_task", label: "Review Tasks", variant: "primary" },
          { id: "dismiss", label: "Dismiss", variant: "ghost" },
        ],
      });
    }
  }

  capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = { AppMonitor };
