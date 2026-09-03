"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, ArrowRight, Bot, CheckSquare, Brain, CalendarCheck, Settings, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiKeyModal } from "@/components/modals/api-key-modal";
import { api } from "@/lib/api";

export default function HomePage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    setMounted(true);
    const localKey = localStorage.getItem("lifed_api_key");
    if (localKey) setHasApiKey(true);
    else {
      api.getSettings()
        .then((s) => setHasApiKey(s.has_api_key))
        .catch(() => {});
    }
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
      {/* Top Floating Controls */}
      <header className="fixed top-5 left-6 right-6 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full border border-border/50 bg-card/60 backdrop-blur-md font-mono text-xs font-bold text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="uppercase tracking-widest text-foreground font-bold">LIFED OS v2.0</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsKeyModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card/60 backdrop-blur-md text-xs font-mono font-bold hover:bg-accent transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{hasApiKey ? "AI KEY READY" : "SET AI KEY"}</span>
          </button>

          {mounted && (
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark and Light theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card/60 backdrop-blur-md hover:bg-accent transition-colors"
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

      {/* Main Center Display: lifed in the Center */}
      <main className="relative z-20 flex flex-col items-center justify-center max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-500">
        {/* Centered Brand Title */}
        <div className="space-y-3">
          <h1 className="text-6xl sm:text-8xl md:text-9xl font-extrabold tracking-widest font-mono text-foreground uppercase drop-shadow-md">
            lifed<span className="animate-pulse text-primary font-bold">_</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg font-bold font-mono tracking-widest text-muted-foreground uppercase">
            Personal AI Command Center
          </p>

          <p className="max-w-lg mx-auto text-xs sm:text-sm font-mono font-bold text-muted-foreground/80 leading-relaxed pt-2">
            Understand → Remember → Plan → Decide → Execute → Learn
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="pt-4">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="font-mono font-bold text-sm tracking-wider px-8 py-4 h-auto rounded-xl shadow-xl hover:scale-105 transition-transform"
            >
              <span>ENTER COMMAND CENTER</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Quick Launch Direct Shortcuts */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-6 font-mono text-xs font-bold">
          <Link href="/tasks">
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks</span>
            </button>
          </Link>
          <Link href="/brief">
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Daily Brief</span>
            </button>
          </Link>
          <Link href="/chat">
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <Bot className="w-3.5 h-3.5" />
              <span>AI Chat</span>
            </button>
          </Link>
          <Link href="/memory">
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <Brain className="w-3.5 h-3.5" />
              <span>Memory</span>
            </button>
          </Link>
          <Link href="/settings">
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </Link>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="fixed bottom-4 left-0 right-0 z-20 font-mono text-xs font-bold text-muted-foreground/60 text-center pointer-events-none">
        Local-First Data Ownership · ONNX Vector Retrieval · Multi-Model Tool Orchestration
      </footer>

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeySaved={() => setHasApiKey(true)}
      />
    </div>
  );
}