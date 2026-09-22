"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center p-6 text-center select-none overflow-hidden">
      {/* Top Floating Controls */}
      <header className="w-full max-w-6xl flex items-center justify-between pointer-events-auto py-2">
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full border border-border/60 bg-card/70 backdrop-blur-md font-mono text-xs font-bold text-muted-foreground shadow-sm">
          <div className="h-5 w-5 rounded bg-white flex items-center justify-center p-0.5 overflow-hidden">
            <Image src="/logo.png" alt="Lifed Logo" width={18} height={18} className="object-contain" />
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="uppercase tracking-widest text-foreground font-bold">LIFED v3.0</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsKeyModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg border border-border/70 bg-card/70 backdrop-blur-md text-xs font-mono font-bold hover:bg-accent transition-colors shadow-sm"
          >
            <KeyRound className="w-4 h-4" />
            <span className="font-bold">{hasApiKey ? "AI KEY READY" : "SET AI KEY"}</span>
          </button>

          {mounted && (
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark and Light theme"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-card/70 backdrop-blur-md hover:bg-accent transition-colors shadow-sm"
              title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5 text-amber-400" />
              ) : (
                <Moon className="h-5 w-5 text-indigo-500" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Center Display: lifed in the Center of the Viewport */}
      <main className="my-auto flex flex-col items-center justify-center max-w-4xl mx-auto space-y-8 py-12">
        <div className="space-y-4 flex flex-col items-center">
          <div className="relative mb-2 flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-3xl bg-white border border-border/70 p-2.5 shadow-2xl backdrop-blur-xl group hover:scale-105 transition-transform overflow-hidden">
            <Image
              src="/logo.png"
              alt="Lifed Brand Mark"
              width={96}
              height={96}
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-7xl sm:text-8xl md:text-9xl font-extrabold tracking-widest font-mono text-foreground uppercase drop-shadow-md">
            lifed<span className="animate-pulse text-primary font-bold">_</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl font-bold font-mono tracking-widest text-muted-foreground uppercase">
            Personal AI Command Center
          </p>

          <p className="max-w-xl mx-auto text-xs sm:text-sm font-mono font-bold text-muted-foreground/80 leading-relaxed pt-2">
            Understand → Remember → Plan → Decide → Execute → Learn
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="font-mono font-bold text-sm tracking-wider px-8 py-4 h-auto rounded-xl shadow-2xl hover:scale-105 transition-transform bg-primary text-primary-foreground border border-border/60"
            >
              <span className="font-bold">ENTER COMMAND CENTER</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Quick Launch Direct Shortcuts */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4 font-mono text-xs font-bold">
          <Link href="/tasks">
            <button className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-border/70 bg-card/60 backdrop-blur-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground font-bold shadow-xs">
              <CheckSquare className="w-4 h-4" />
              <span>Tasks</span>
            </button>
          </Link>
          <Link href="/brief">
            <button className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-border/70 bg-card/60 backdrop-blur-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground font-bold shadow-xs">
              <CalendarCheck className="w-4 h-4" />
              <span>Daily Brief</span>
            </button>
          </Link>
          <Link href="/chat">
            <button className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-border/70 bg-card/60 backdrop-blur-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground font-bold shadow-xs">
              <Bot className="w-4 h-4" />
              <span>AI Chat</span>
            </button>
          </Link>
          <Link href="/memory">
            <button className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-border/70 bg-card/60 backdrop-blur-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground font-bold shadow-xs">
              <Brain className="w-4 h-4" />
              <span>Memory</span>
            </button>
          </Link>
          <Link href="/settings">
            <button className="flex items-center space-x-2 px-3.5 py-2 rounded-lg border border-border/70 bg-card/60 backdrop-blur-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground font-bold shadow-xs">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </Link>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full py-2 font-mono text-xs font-bold text-muted-foreground/60 text-center">
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