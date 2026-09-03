"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export function ApiKeyModal({ isOpen, onClose, onKeySaved }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("anthropic/claude-3.5-sonnet");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem("lifed_api_key") || "";
      const storedModel = localStorage.getItem("lifed_model") || "anthropic/claude-3.5-sonnet";
      setApiKey(storedKey);
      setModel(storedModel);

      // Also fetch from backend settings
      api.getSettings()
        .then((data) => {
          if (!storedKey && data.has_api_key && data.api_key_source === "env") {
            setMessage("Using API key from .env file");
          }
          if (data.current_model) {
            setModel(data.current_model);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      if (apiKey.trim()) {
        localStorage.setItem("lifed_api_key", apiKey.trim());
      } else {
        localStorage.removeItem("lifed_api_key");
      }
      localStorage.setItem("lifed_model", model.trim());

      await api.updateSettings({
        openrouter_api_key: apiKey.trim() || undefined,
        model: model.trim() || undefined,
      });

      setStatus("success");
      setMessage("Settings saved successfully!");
      if (onKeySaved) onKeySaved();
      setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 1000);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to update settings");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="OpenRouter AI Configuration"
      description="Configure your OpenRouter API key and preferred model directly from the UI."
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
            OpenRouter API Key
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pl-9 font-mono text-xs"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">
            Get your API key at openrouter.ai. Stored locally in your browser and local SQLite.
          </p>
        </div>

        <div>
          <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
            Target Model
          </label>
          <div className="relative">
            <Sparkles className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="anthropic/claude-3.5-sonnet"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="pl-9 font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              "anthropic/claude-3.5-sonnet",
              "google/gemini-2.0-flash-001",
              "openai/gpt-4o-mini",
              "meta-llama/llama-3.3-70b-instruct",
            ].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModel(m)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                  model === m
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 hover:bg-accent text-muted-foreground"
                }`}
              >
                {m.split("/")[1]}
              </button>
            ))}
          </div>
        </div>

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