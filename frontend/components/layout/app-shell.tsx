"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  matrixMode?: string;
  showMatrixControls?: boolean;
}

export function AppShell({
  children,
  title = "Command Center",
  subtitle,
}: AppShellProps) {
  return (
    <div className="relative min-h-screen w-full bg-transparent overflow-x-hidden text-foreground">
      {/* Global Navigation Rail / Sidebar */}
      <Sidebar />

      {/* Main Content Area (offset by sidebar width on desktop) */}
      <div className="relative z-10 flex min-h-screen flex-col md:pl-64 transition-all">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in-20 duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}