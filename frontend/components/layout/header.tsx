"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, KeyRound } from "lucide-react";
import { ApiKeyModal } from "@/components/modals/api-key-modal";
import { api } from "@/lib/api";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = "Command Center", subtitle }: HeaderProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    checkHealthAndSettings();
  }, []);

  const checkHealthAndSettings = async () => {
    try {
      await api.getHealth();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }

    try {
      const localKey = localStorage.getItem("lifed_api_key");
      if (localKey) {
        setHasApiKey(true);
      } else {
        const settings = await api.getSettings();
        setHasApiKey(settings.has_api_key);
      }
    } catch {}
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/70 bg-background/80 px-6 backdrop-blur-md font-mono">
        {/* Left: Page Title & Context */}
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-foreground font-mono">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs font-mono font-bold text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right Controls: Status, Key Modal, Theme Switch */}
        <div className="flex items-center space-x-3">
          {/* Backend Health Status */}
          <div
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-background/60 text-xs font-mono font-bold text-muted-foreground"
            title={backendOnline === true ? "FastAPI Backend Online" : "Backend Disconnected"}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline === true
                  ? "bg-emerald-500 animate-pulse"
                  : backendOnline === false
                  ? "bg-rose-500"
                  : "bg-amber-500"
              }`}
            />
            <span className="hidden sm:inline font-bold">
              {backendOnline === true ? "API ONLINE" : backendOnline === false ? "OFFLINE" : "CONNECTING"}
            </span>
          </div>

          {/* OpenRouter Key Trigger */}
          <button
            onClick={() => setIsKeyModalOpen(true)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors ${
              hasApiKey
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                : "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
            }`}
            title="Configure OpenRouter API Key & Model"
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden sm:inline font-bold">{hasApiKey ? "AI KEY READY" : "SET AI KEY"}</span>
          </button>

          {/* Theme Toggle Button */}
          {mounted && (
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark and Light theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card/60 backdrop-blur-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-500" />
              )}
            </button>
          )}
        </div>
      </header>

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeySaved={checkHealthAndSettings}
      />
    </>
  );
}