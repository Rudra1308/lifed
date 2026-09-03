"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Sparkles, Database, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { api, SettingsData } from "@/lib/api";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("anthropic/claude-3.5-sonnet");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      const storedKey = localStorage.getItem("lifed_api_key");
      const storedModel = localStorage.getItem("lifed_model");
      if (storedKey) setApiKey(storedKey);
      if (storedModel) setModel(storedModel);
      else if (data.current_model) setModel(data.current_model);
    } catch {
      // Backend may be starting
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

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

      const res = await api.updateSettings({
        openrouter_api_key: apiKey.trim() || undefined,
        model: model.trim() || undefined,
      });

      setSettings(res);
      setStatus("success");
      setMessage("Configuration updated successfully!");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to save configuration");
    }
  };

  return (
    <AppShell
      title="System Settings"
      subtitle="AI Configuration & Local Storage Parameters"
      matrixMode="focus"
    >
      <div className="max-w-3xl space-y-6">
        {/* OpenRouter AI Model Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-primary" />
                <CardTitle>OpenRouter AI Gateway</CardTitle>
              </div>
              <Badge variant={settings?.has_api_key ? "success" : "warning"}>
                {settings?.has_api_key
                  ? `Active (${settings.api_key_source.toUpperCase()})`
                  : "Key Required"}
              </Badge>
            </div>
            <CardDescription>
              Configure model access for autonomous tools, planning, and contextual chat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  OpenRouter API Key
                </label>
                <Input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] font-mono text-muted-foreground mt-1.5">
                  Stored securely in your local environment and browser session. Never committed or sent externally.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Active Model
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2.5">
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
                      className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors ${
                        model === m
                          ? "border-primary bg-primary text-primary-foreground font-semibold"
                          : "border-border/60 hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {message && (
                <div
                  className={`flex items-center space-x-2 text-xs font-mono p-3 rounded-lg border ${
                    status === "error"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  {status === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  <span>{message}</span>
                </div>
              )}

              <Button type="submit" disabled={status === "saving"}>
                {status === "saving" ? "Saving..." : "Save Configuration"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Local Storage & Security Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <CardTitle>Local Storage & Privacy</CardTitle>
            </div>
            <CardDescription>
              Local-first architecture ensuring personal data remains on your machine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Database Engine:</span>
              <span className="text-foreground">SQLite 3 (Local-First)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Database Target:</span>
              <span className="text-foreground">{settings?.database_url || "sqlite:///./lifed.db"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Semantic Embeddings:</span>
              <span className="text-foreground">Local ONNX Python Engine</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Git Privacy Status:</span>
              <span className="text-emerald-500 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Protected by .gitignore</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}