"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Terminal, CheckCircle, ArrowRight, X, Layers, Target, CheckSquare, Brain } from "lucide-react";
import { VoiceDictation } from "@/components/ui/voice-dictation";
import { api } from "@/lib/api";

type ActionType = "task" | "goal" | "memory" | "ask";

export default function QuickCapturePage() {
  const [query, setQuery] = useState("");
  const [actionType, setActionType] = useState<ActionType>("task");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    // Listen for Escape key to dismiss overlay
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeOverlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const closeOverlay = () => {
    // If in Electron, call IPC to hide overlay
    if ((window as any).electronAPI?.hideQuickCapture) {
      (window as any).electronAPI.hideQuickCapture();
    } else {
      window.close();
    }
  };

  const openMainWindow = () => {
    if ((window as any).electronAPI?.showMainWindow) {
      (window as any).electronAPI.showMainWindow();
    } else {
      window.location.href = "/";
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setStatusMessage("Dispatching to agent team...");

    try {
      if (actionType === "task") {
        await api.createTask({
          title: query.trim(),
          priority: "high",
          status: "todo",
          estimated_duration: 30,
        });
        setStatusMessage("Task created in local command center!");
      } else if (actionType === "goal") {
        await api.createGoal({
          title: query.trim(),
          status: "active",
        });
        setStatusMessage("Strategic goal created!");
      } else if (actionType === "memory") {
        await api.createMemory({
          content: query.trim(),
          type: "preference",
        });
        setStatusMessage("Preference stored in local vector memory!");
      } else {
        // Multi-Agent Chat
        setStatusMessage("Hybrid agents orchestrating response...");
        const res = await apiRequestAny("/api/chat", {
          method: "POST",
          body: JSON.stringify({ message: query.trim() }),
        });
        setStatusMessage(res.reply ? res.reply.slice(0, 100) + "..." : "Response received!");
      }

      setSuccess(true);
      setTimeout(() => {
        setQuery("");
        setSuccess(false);
        setStatusMessage(null);
        setLoading(false);
        closeOverlay();
      }, 1400);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Error: ${err.message || "Failed to process"}`);
      setLoading(false);
    }
  };

  // Helper for chat request without strict schema mismatch
  const apiRequestAny = async (endpoint: string, options: RequestInit) => {
    const res = await fetch(`http://127.0.0.1:8000${endpoint}`, {
      ...options,
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Request failed");
    return res.json();
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-transparent p-4 select-none">
      <div className="w-full max-w-2xl bg-background/95 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-2xl overflow-hidden p-5 text-foreground transition-all duration-300">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono uppercase tracking-wider font-semibold text-foreground">Lifed Command Capture</span>
            <span className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px] font-mono">Hybrid Mesh</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openMainWindow}
              className="hover:text-foreground flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-muted/50"
            >
              Open Dashboard <ArrowRight size={12} />
            </button>
            <button
              onClick={closeOverlay}
              className="hover:text-foreground p-1 rounded hover:bg-muted/50 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Action Type Selector Chips */}
        <div className="flex items-center gap-1.5 pt-3 pb-2">
          <button
            type="button"
            onClick={() => setActionType("task")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              actionType === "task"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 hover:bg-muted/60 text-muted-foreground"
            }`}
          >
            <CheckSquare size={13} /> Quick Task
          </button>

          <button
            type="button"
            onClick={() => setActionType("goal")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              actionType === "goal"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 hover:bg-muted/60 text-muted-foreground"
            }`}
          >
            <Target size={13} /> New Goal
          </button>

          <button
            type="button"
            onClick={() => setActionType("memory")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              actionType === "memory"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 hover:bg-muted/60 text-muted-foreground"
            }`}
          >
            <Brain size={13} /> Remember Fact
          </button>

          <button
            type="button"
            onClick={() => setActionType("ask")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              actionType === "ask"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/30 hover:bg-muted/60 text-muted-foreground"
            }`}
          >
            <Sparkles size={13} /> Ask AI Mesh
          </button>
        </div>

        {/* Input Form with Voice Dictation */}
        <form onSubmit={handleSubmit} className="relative mt-2">
          <div className="relative flex items-center bg-muted/20 border border-border/80 focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/40 rounded-xl px-3 py-2 transition-all">
            <Terminal size={18} className="text-muted-foreground mr-2 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                actionType === "task"
                  ? "What needs to get done? (e.g. Finish quarterly project proposal)"
                  : actionType === "goal"
                  ? "Define a strategic life/career goal..."
                  : actionType === "memory"
                  ? "Record a preference or working habit (e.g. Deep work before 11am)..."
                  : "Ask your local & cloud multi-agent mesh..."
              }
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60 pr-24"
              disabled={loading || success}
            />

            <div className="absolute right-2.5 flex items-center gap-1.5">
              <VoiceDictation
                buttonSize="sm"
                onTranscript={(text) => {
                  setQuery((prev) => (prev ? `${prev} ${text}` : text));
                }}
              />
              <button
                type="submit"
                disabled={!query.trim() || loading || success}
                className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {loading ? "..." : "Enter ↵"}
              </button>
            </div>
          </div>
        </form>

        {/* Status / Feedback Area */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground min-h-[22px]">
          {statusMessage ? (
            <div className={`flex items-center gap-1.5 ${success ? "text-emerald-400 font-medium" : "text-primary"}`}>
              {success && <CheckCircle size={13} />}
              <span>{statusMessage}</span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground/70">
              Press <kbd className="px-1 py-0.5 rounded bg-muted/60 border border-border/40 font-mono text-[10px]">Esc</kbd> to dismiss • <kbd className="px-1 py-0.5 rounded bg-muted/60 border border-border/40 font-mono text-[10px]">Ctrl+Space</kbd> from anywhere
            </span>
          )}

          <span className="text-[11px] font-mono text-muted-foreground/60">
            Ollama + Gemini Active
          </span>
        </div>

      </div>
    </div>
  );
}
