"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Cloud,
  Network,
  Check,
  RefreshCw,
} from "lucide-react";
import { api, SettingsData } from "@/lib/api";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

type TabType = "hybrid" | "ollama" | "gemini" | "openrouter";

export function ApiKeyModal({ isOpen, onClose, onKeySaved }: ApiKeyModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("hybrid");

  // Settings State
  const [orchestrationMode, setOrchestrationMode] = useState("hybrid");
  
  // Ollama
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434/v1");
  const [plannerModel, setPlannerModel] = useState("llama3:latest");
  const [contextModel, setContextModel] = useState("gemma4:e4b");
  const [ollamaStatus, setOllamaStatus] = useState<"unknown" | "connected" | "disconnected">("unknown");

  // Gemini
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");

  // OpenRouter
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [openrouterModel, setOpenrouterModel] = useState("anthropic/claude-3.5-sonnet");

  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Load current settings from backend
      api.getSettings()
        .then((data: SettingsData) => {
          if (data.orchestration_mode) setOrchestrationMode(data.orchestration_mode);
          if (data.ollama_base_url) setOllamaUrl(data.ollama_base_url);
          if (data.ollama_planner_model) setPlannerModel(data.ollama_planner_model);
          if (data.ollama_context_model) setContextModel(data.ollama_context_model);
          if (data.gemini_model) setGeminiModel(data.gemini_model);
          if (data.current_model) setOpenrouterModel(data.current_model);

          const localORKey = localStorage.getItem("lifed_api_key") || "";
          setOpenrouterKey(localORKey);
        })
        .catch(() => {});

      checkOllamaConnection();
    }
  }, [isOpen]);

  const checkOllamaConnection = async () => {
    try {
      const res = await fetch(`${ollamaUrl}/models`, { method: "GET" }).catch(() => null);
      if (res && res.ok) {
        setOllamaStatus("connected");
      } else {
        setOllamaStatus("disconnected");
      }
    } catch {
      setOllamaStatus("disconnected");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      if (openrouterKey.trim()) {
        localStorage.setItem("lifed_api_key", openrouterKey.trim());
      } else {
        localStorage.removeItem("lifed_api_key");
      }
      localStorage.setItem("lifed_model", openrouterModel.trim());

      await api.updateSettings({
        orchestration_mode: orchestrationMode,
        ollama_base_url: ollamaUrl.trim() || undefined,
        ollama_planner_model: plannerModel.trim() || undefined,
        ollama_context_model: contextModel.trim() || undefined,
        gemini_api_key: geminiKey.trim() || undefined,
        gemini_model: geminiModel.trim() || undefined,
        openrouter_api_key: openrouterKey.trim() || undefined,
        model: openrouterModel.trim() || undefined,
      });

      setStatus("success");
      setMessage("AI Mesh configuration updated!");
      if (onKeySaved) onKeySaved();
      setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 1000);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to update configuration");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Engine & Multi-Agent Mesh"
      description="Configure local models, cloud keys, and collaborative multi-agent orchestration."
    >
      {/* Navigation Tabs */}
      <div className="flex border-b border-border/40 mb-4 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("hybrid")}
          className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-colors ${
            activeTab === "hybrid"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Network size={14} /> Hybrid Mesh
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ollama")}
          className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-colors ${
            activeTab === "ollama"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cpu size={14} /> Local (Ollama)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gemini")}
          className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-colors ${
            activeTab === "gemini"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles size={14} /> Google Gemini
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("openrouter")}
          className={`flex items-center gap-1.5 pb-2 px-3 border-b-2 transition-colors ${
            activeTab === "openrouter"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cloud size={14} /> OpenRouter
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* TAB 1: Hybrid Mesh */}
        {activeTab === "hybrid" && (
          <div className="space-y-3">
            <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Orchestration Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "hybrid", title: "Hybrid Mesh", desc: "Local Privacy + Cloud Strategy", badge: "Recommended" },
                { id: "local_only", title: "100% Local", desc: "Zero Cloud / Fully Offline", badge: "$0 Free" },
                { id: "cloud_only", title: "Cloud Only", desc: "Gemini / OpenRouter Direct", badge: "Cloud" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setOrchestrationMode(m.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    orchestrationMode === m.id
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/50 hover:bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">{m.title}</span>
                    {orchestrationMode === m.id && <Check size={14} className="text-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-tight mb-2">{m.desc}</span>
                  <span className="self-start text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-foreground/80">
                    {m.badge}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">Local Context Agent:</span>
                <span className="font-semibold text-foreground">{contextModel} (local)</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">Local Operations Agent:</span>
                <span className="font-semibold text-foreground">{plannerModel} (local)</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">Executive Synthesizer:</span>
                <span className="font-semibold text-foreground">
                  {geminiKey ? "Google Gemini 2.0" : openrouterKey ? "OpenRouter" : "Llama3 (Local Fallback)"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Ollama Local Models */}
        {activeTab === "ollama" && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Ollama Base URL
                </label>
                <button
                  type="button"
                  onClick={checkOllamaConnection}
                  className="text-[10px] flex items-center gap-1 text-primary hover:underline"
                >
                  <RefreshCw size={10} /> Test Connection
                </button>
              </div>
              <Input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Status:{" "}
                <span className={ollamaStatus === "connected" ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                  {ollamaStatus === "connected" ? "● Connected (Ollama daemon active)" : "○ Not detected on port 11434"}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                  Planner & Tool Model
                </label>
                <Input
                  type="text"
                  value={plannerModel}
                  onChange={(e) => setPlannerModel(e.target.value)}
                  placeholder="llama3:latest"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                  Context & Memory Model
                </label>
                <Input
                  type="text"
                  value={contextModel}
                  onChange={(e) => setContextModel(e.target.value)}
                  placeholder="gemma4:e4b"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Google Gemini */}
        {activeTab === "gemini" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Google Gemini API Key
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="pl-9 font-mono text-xs"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                Get a free key from Google AI Studio (aistudio.google.com). Supports 15 RPM for $0.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Gemini Model
              </label>
              <Input
                type="text"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                placeholder="gemini-2.0-flash"
                className="font-mono text-xs"
              />
              <div className="flex gap-1.5 mt-2">
                {["gemini-2.0-flash", "gemini-2.0-pro-exp-02-05", "gemini-1.5-pro"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setGeminiModel(m)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                      geminiModel === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OpenRouter */}
        {activeTab === "openrouter" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                OpenRouter API Key
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  className="pl-9 font-mono text-xs"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                Multi-model gateway from openrouter.ai.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                Model Identifier
              </label>
              <Input
                type="text"
                value={openrouterModel}
                onChange={(e) => setOpenrouterModel(e.target.value)}
                placeholder="google/gemini-2.5-flash"
                className="font-mono text-xs"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  "google/gemini-2.5-flash",
                  "openai/gpt-4o-mini",
                  "anthropic/claude-3-haiku",
                  "google/gemma-4-26b-a4b-it:free",
                ].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setOpenrouterModel(m)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                      openrouterModel === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Feedback message */}
        {message && (
          <div
            className={`flex items-center space-x-2 text-xs font-mono p-2.5 rounded-lg border ${
              status === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                : status === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-border/40 bg-muted/40 text-muted-foreground"
            }`}
          >
            {status === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : status === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : null}
            <span>{message}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border/40">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={status === "saving"}>
            {status === "saving" ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}