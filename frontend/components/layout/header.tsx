"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, KeyRound, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiKeyModal } from "@/components/modals/api-key-modal";
import { api } from "@/lib/api";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = "Command Center", subtitle }: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
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
    } catch {
      // Backend may be offline initially
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-md">
        {/* Left: Page Title & Context */}
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground font-sans">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] font-mono text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right Controls: Status, Key Modal, Theme Switch */}
        <div className="flex items-center space-x-2.5">
          {/* Backend Health Status */}
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-border/50 bg-background/50 text-[11px] font-mono text-muted-foreground"
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
            <span className="hidden sm:inline">
              {backendOnline === true ? "API ONLINE" : backendOnline === false ? "OFFLINE" : "CONNECTING"}
            </span>
          </div>

          {/* OpenRouter Key Trigger */}
          <button
            onClick={() => setIsKeyModalOpen(true)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-colors ${
              hasApiKey
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            }`}
            title="Configure OpenRouter API Key & Model"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{hasApiKey ? "AI KEY READY" : "SET AI KEY"}</span>
          </button>

          {/* Theme Toggle Button (Top-Right per PRD Section 7.3 & UI-02) */}
          {mounted && (
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark and Light theme"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card/60 backdrop-blur-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 scale-100" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-500 transition-transform rotate-0 scale-100" />
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