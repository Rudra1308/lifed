"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Clock,
  Sparkles,
  CheckCircle,
  X,
  Target,
  Command,
  ChevronDown,
  Layers,
  Flame,
  Coffee,
  BellRing,
} from "lucide-react";
import { getAppMetadata } from "@/lib/app-icons";

interface AppInfo {
  id: number;
  name: string;
  title: string;
}

interface ActiveAppInfo {
  pid: number;
  process: string;
  title: string;
}

interface AlertAction {
  id: string;
  label: string;
  variant?: "primary" | "outline" | "ghost";
}

interface NotchAlert {
  id: string;
  type: "focus_guard" | "session_duration" | "reminder";
  appName: string;
  title: string;
  message: string;
  actions: AlertAction[];
}

export default function NotchPage() {
  const [activeApp, setActiveApp] = useState<ActiveAppInfo>({
    pid: 540,
    process: "brave",
    title: "Brave Browser",
  });
  const [runningApps, setRunningApps] = useState<AppInfo[]>([
    { id: 540, name: "brave", title: "Brave Browser" },
    { id: 28628, name: "windowsterminal", title: "Windows Terminal" },
    { id: 2744, name: "notion", title: "Notion" },
    { id: 13224, name: "ollama app", title: "Ollama Local AI" },
  ]);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [activeAlert, setActiveAlert] = useState<NotchAlert | null>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [showDemoMenu, setShowDemoMenu] = useState<boolean>(false);

  // Set transparent background on html and body for Electron overlay
  useEffect(() => {
    document.body.classList.add("bg-transparent");
    document.documentElement.classList.add("bg-transparent");
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    return () => {
      document.body.classList.remove("bg-transparent");
      document.documentElement.classList.remove("bg-transparent");
      document.body.style.background = "";
      document.documentElement.style.background = "";
    };
  }, []);

  // Sync window size with Electron whenever state changes
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.setNotchSize) return;

    if (activeAlert) {
      // Alert drop-down expanded state
      electronAPI.setNotchSize(480, 180);
    } else if (isHovered || showDemoMenu) {
      // Hover expanded dock state
      electronAPI.setNotchSize(440, showDemoMenu ? 140 : 58);
    } else {
      // Collapsed Dynamic Island Pill state
      electronAPI.setNotchSize(330, 44);
    }
  }, [activeAlert, isHovered, showDemoMenu]);

  // Listen to IPC events from Electron
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    const unbindState = electronAPI.onNotchStateUpdate?.((data: any) => {
      if (data.active) setActiveApp(data.active);
      if (data.running) setRunningApps(data.running);
      if (typeof data.durationSec === "number") setDurationSec(data.durationSec);
    });

    const unbindAlert = electronAPI.onNotchAlert?.((alert: NotchAlert) => {
      setActiveAlert(alert);
    });

    const unbindResolved = electronAPI.onAlertResolved?.(() => {
      setActiveAlert(null);
    });

    return () => {
      unbindState?.();
      unbindAlert?.();
      unbindResolved?.();
    };
  }, []);

  const meta = getAppMetadata(activeApp.process, activeApp.title);
  const IconComponent = meta.icon;

  const handleActionClick = (actionId: string) => {
    if (!activeAlert) return;
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.respondNotchAlert) {
      electronAPI.respondNotchAlert(activeAlert.id, actionId);
    }
    setActiveAlert(null);
  };

  const handleAppClick = (appName: string, appId?: number) => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.focusOrLaunchApp) {
      electronAPI.focusOrLaunchApp(appName, appId);
    }
  };

  const triggerTest = (type: "focus_guard" | "session_duration" | "reminder") => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.triggerTestAlert) {
      electronAPI.triggerTestAlert(type);
    } else {
      // Fallback in-browser preview simulation
      if (type === "focus_guard") {
        setActiveAlert({
          id: "sim_" + Date.now(),
          type: "focus_guard",
          appName: meta.displayName,
          title: "Focus Guard Notice",
          message: `You are browsing in ${meta.displayName}. "Deep Work Sprint" task is active. Grant 15 min browsing permission?`,
          actions: [
            { id: "allow_15", label: "Allow (15 min)", variant: "outline" },
            { id: "focus_task", label: "Open Lifed & Focus", variant: "primary" },
            { id: "dismiss", label: "Dismiss", variant: "ghost" },
          ],
        });
      } else if (type === "session_duration") {
        setActiveAlert({
          id: "sim_" + Date.now(),
          type: "session_duration",
          appName: meta.displayName,
          title: "Session Duration Nudge",
          message: `Continuous session in ${meta.displayName} reached 45 minutes. Take a 5-minute stretch or record a note?`,
          actions: [
            { id: "log_task", label: "Log in Lifed", variant: "primary" },
            { id: "stretch", label: "5m Break", variant: "outline" },
            { id: "dismiss", label: "Continue", variant: "ghost" },
          ],
        });
      } else {
        setActiveAlert({
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
    setShowDemoMenu(false);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m`;
  };

  return (
    <div className="w-full flex justify-center items-start pt-1 font-sans select-none overflow-hidden">
      {/* Dynamic Island Container */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowDemoMenu(false);
        }}
        className={`transition-all duration-300 ease-out rounded-2xl bg-[#090a0f]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/90 ring-1 ring-white/10 overflow-hidden ${
          activeAlert
            ? "w-[470px] min-h-[160px] p-4 border-orange-500/40 ring-orange-500/20"
            : isHovered
            ? "w-[430px] p-2.5"
            : "w-[320px] h-[36px] px-3 py-1 flex items-center justify-between"
        }`}
      >
        {/* =========================================
            STATE 1: ALERT / PERMISSION POP-DOWN MODAL
           ========================================= */}
        {activeAlert ? (
          <div className="w-full flex flex-col space-y-3 animate-in fade-in zoom-in-95 duration-200">
            {/* Alert Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border ${meta.bgColor} ${meta.color}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold tracking-wide text-white">
                      {activeAlert.title}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Attention
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">{activeAlert.appName}</div>
                </div>
              </div>
              <button
                onClick={() => handleActionClick("dismiss")}
                className="text-zinc-500 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alert Message */}
            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
              {activeAlert.message}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-1">
              {activeAlert.actions.map((act) => {
                const isPrimary = act.variant === "primary";
                const isOutline = act.variant === "outline";
                return (
                  <button
                    key={act.id}
                    onClick={() => handleActionClick(act.id)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-150 flex items-center justify-center space-x-1.5 ${
                      isPrimary
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-950"
                        : isOutline
                        ? "bg-white/10 hover:bg-white/15 text-zinc-200 border border-white/15"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {isPrimary && <Target className="w-3.5 h-3.5 mr-1" />}
                    {isOutline && <Clock className="w-3.5 h-3.5 mr-1 text-orange-400" />}
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : isHovered ? (
          /* =========================================
              STATE 2: HOVER DOCK (RUNNING APPS & QUICK ACTIONS)
             ========================================= */
          <div className="w-full flex flex-col space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-1">
              {/* Active App Badge */}
              <button
                type="button"
                onClick={() => handleAppClick(activeApp.process, activeApp.pid)}
                title={`Click to focus ${meta.displayName}`}
                className="flex items-center space-x-2 text-left hover:opacity-90 active:scale-95 transition-all cursor-pointer group"
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border ${meta.bgColor} ${meta.color} group-hover:scale-105 transition-transform`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-white leading-tight">
                    {meta.displayName}
                  </span>
                  <span className="text-[9px] text-zinc-400 truncate max-w-[130px]">
                    {activeApp.title || "Active foreground"}
                  </span>
                </div>
              </button>

              {/* Running Apps Strip */}
              <div className="flex items-center space-x-1.5 bg-white/5 px-2 py-1 rounded-xl border border-white/5">
                <span className="text-[9px] text-zinc-500 uppercase font-mono mr-0.5">
                  Apps:
                </span>
                {runningApps.slice(0, 6).map((app, idx) => {
                  const m = getAppMetadata(app.name, app.title);
                  const Icon = m.icon;
                  const isActive = (app.name || "").toLowerCase() === (activeApp.process || "").toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAppClick(app.name, app.id)}
                      title={`Open / Switch to ${m.displayName}: ${app.title}`}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-115 active:scale-90 cursor-pointer ${
                        isActive
                          ? "bg-white/20 text-white ring-1 ring-cyan-400/60 shadow-sm"
                          : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/15"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => (window as any).electronAPI?.toggleQuickCapture?.()}
                  title="Summon Quick Capture (Ctrl+Space)"
                  className="p-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-colors"
                >
                  <Command className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowDemoMenu(!showDemoMenu)}
                  title="Test Triggers"
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDemoMenu ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>

            {/* Test Trigger Tray (Expanded on demand) */}
            {showDemoMenu && (
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                <span className="text-zinc-400 font-medium">Simulate:</span>
                <div className="flex space-x-1.5">
                  <button
                    onClick={() => triggerTest("focus_guard")}
                    className="px-2 py-1 rounded-md bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 transition-colors flex items-center space-x-1"
                  >
                    <Flame className="w-3 h-3 mr-0.5" />
                    <span>Focus Guard</span>
                  </button>
                  <button
                    onClick={() => triggerTest("session_duration")}
                    className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors flex items-center space-x-1"
                  >
                    <Coffee className="w-3 h-3 mr-0.5" />
                    <span>Session Nudge</span>
                  </button>
                  <button
                    onClick={() => triggerTest("reminder")}
                    className="px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 transition-colors flex items-center space-x-1"
                  >
                    <BellRing className="w-3 h-3 mr-0.5" />
                    <span>AI Task</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* =========================================
              STATE 3: COLLAPSED DYNAMIC ISLAND PILL
             ========================================= */
          <>
            {/* Left: Active App & Status Indicator */}
            <button
              type="button"
              onClick={() => handleAppClick(activeApp.process, activeApp.pid)}
              title={`Click to focus ${meta.displayName}`}
              className="flex items-center space-x-2 truncate pr-2 text-left hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>

              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${meta.bgColor} ${meta.color}`}
              >
                <IconComponent className="w-3 h-3" />
              </div>

              <span className="text-[11px] font-semibold text-white tracking-wide shrink-0">
                {meta.displayName}
              </span>

              <span className="text-[10px] text-zinc-400 truncate max-w-[130px]">
                {activeApp.title ? `— ${activeApp.title}` : ""}
              </span>
            </button>

            {/* Right: Duration Tracker & Running Count */}
            <div className="flex items-center space-x-1.5 pl-1 shrink-0">
              {durationSec > 0 && (
                <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded-full border border-white/5">
                  {formatDuration(durationSec)}
                </span>
              )}
              <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-mono text-zinc-300">
                {runningApps.length}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
