"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
      <div
        className={cn(
          "relative w-full max-w-lg rounded-xl border border-border bg-card/95 p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95",
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description && (
            <p className="text-xs font-mono text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}