"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  CalendarCheck,
  CheckSquare,
  FolderKanban,
  Target,
  Brain,
  Bot,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/brief", label: "Daily Brief", icon: CalendarCheck },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/chat", label: "AI Chat", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu trigger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-border/70 bg-card/85 backdrop-blur-xl transition-transform duration-200 ease-in-out md:translate-x-0 font-mono",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand identity */}
        <div className="flex h-16 items-center px-6 border-b border-border/60">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white p-0.5 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
              <Image
                src="/logo.png"
                alt="Lifed Logo"
                width={26}
                height={26}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="font-bold tracking-tight text-foreground text-lg">Lifed</span>
              <span className="ml-2 rounded border border-border/60 bg-secondary/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground uppercase">
                v3.0
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
            Command Center
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3.5 py-2.5 text-sm font-bold font-mono transition-all group select-none",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="truncate font-bold">{item.label}</span>
                {isActive && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-primary-foreground/90" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Monospace System Metadata Footer (Bold) */}
        <div className="p-4 border-t border-border/60 font-mono text-xs font-bold text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold">CORE LOOP</span>
            <span className="text-foreground font-bold">ACTIVE</span>
          </div>
          <p className="text-[11px] font-bold text-muted-foreground/80 truncate">
            Understand → Plan → Execute
          </p>
        </div>
      </aside>
    </>
  );
}