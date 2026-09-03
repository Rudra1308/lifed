"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Activity, Play, Pause, Zap } from "lucide-react";

export type KineticMode = "ambient" | "focus" | "conversational" | "reduced-motion" | "compact";

interface KineticMatrixProps {
  title?: string;
  className?: string;
  mode?: KineticMode;
  showControls?: boolean;
}

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Pulse {
  sourceIndex: number;
  targetIndex: number;
  progress: number;
  speed: number;
}

export function KineticMatrix({
  title = "KINETIC MATRIX",
  className = "",
  mode = "ambient",
  showControls = false,
}: KineticMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [pulseCount, setPulseCount] = useState<number>(0);
  const animationFrameId = useRef<number | null>(null);

  const nodesRef = useRef<Node[]>([]);
  const pulsesRef = useRef<Pulse[]>([]);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
  });

  const isDark = resolvedTheme !== "light";

  // Check if system prefers reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const activeMode: KineticMode = prefersReducedMotion ? "reduced-motion" : mode;

  // Initialize node grid based on canvas dimensions and mode
  const initNodes = useCallback(
    (width: number, height: number) => {
      const nodes: Node[] = [];
      let spacing = 65;
      if (activeMode === "focus") spacing = 95;
      if (activeMode === "compact") spacing = 110;
      if (activeMode === "conversational") spacing = 80;

      const cols = Math.floor(width / spacing);
      const rows = Math.floor(height / spacing);
      const offsetX = (width - cols * spacing) / 2;
      const offsetY = (height - rows * spacing) / 2;

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const jitterX = (Math.random() - 0.5) * 16;
          const jitterY = (Math.random() - 0.5) * 16;
          const x = offsetX + c * spacing + jitterX;
          const y = offsetY + r * spacing + jitterY;
          const speedMultiplier = activeMode === "focus" ? 0.2 : 0.6;

          nodes.push({
            x,
            y,
            baseX: x,
            baseY: y,
            vx: (Math.random() - 0.5) * speedMultiplier,
            vy: (Math.random() - 0.5) * speedMultiplier,
            radius: Math.random() * 1.5 + 1.2,
          });
        }
      }
      nodesRef.current = nodes;
      pulsesRef.current = [];
    },
    [activeMode]
  );

  // Trigger manual or synaptic pulse
  const triggerPulse = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return;
    setPulseCount((c) => c + 1);

    const newPulses: Pulse[] = [];
    const burstCount = activeMode === "focus" ? 3 : 8;
    for (let i = 0; i < burstCount; i++) {
      const src = Math.floor(Math.random() * nodes.length);
      const tgt = Math.floor(Math.random() * nodes.length);
      if (src !== tgt) {
        newPulses.push({
          sourceIndex: src,
          targetIndex: tgt,
          progress: 0,
          speed: 0.015 + Math.random() * 0.02,
        });
      }
    }
    pulsesRef.current = [...pulsesRef.current.slice(-20), ...newPulses];
  }, [activeMode]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    initNodes(width, height);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          canvas.width = w;
          canvas.height = h;
          width = w;
          height = h;
          initNodes(w, h);
        }
      }
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const maxDistance = activeMode === "focus" ? 85 : 95;
    const enableShockwave =
      isRunning &&
      activeMode !== "focus" &&
      activeMode !== "reduced-motion";

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Theme Colors
      const bgColor = isDark ? "rgba(10, 10, 14, 0.96)" : "rgba(250, 250, 252, 0.96)";
      const lineColor = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
      const nodeColor = isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.3)";
      const pulseColor = isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.8)";
      const shockwaveColor = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.12)";

      // Canvas background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const pointer = pointerRef.current;

      // Update and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (isRunning && activeMode !== "reduced-motion") {
          // Brownian drift
          node.x += node.vx;
          node.y += node.vy;

          // Elastic bound bounce
          if (node.x < node.baseX - 18 || node.x > node.baseX + 18) node.vx *= -1;
          if (node.y < node.baseY - 18 || node.y > node.baseY + 18) node.vy *= -1;

          // Pointer inertia & shockwave repulsion
          if (enableShockwave && pointer.active) {
            const dx = node.x - pointer.x;
            const dy = node.y - pointer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxRadius = 140;

            if (dist < maxRadius && dist > 0) {
              const force = (1 - dist / maxRadius) * 4.5;
              node.x += (dx / dist) * force;
              node.y += (dy / dist) * force;
            }
          }
        }

        // Draw node point
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();
      }

      // Draw tension strands / connections
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = lineColor;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw synaptic traveling pulses
      if (isRunning && activeMode !== "reduced-motion") {
        const pulses = pulsesRef.current;
        for (let p = pulses.length - 1; p >= 0; p--) {
          const pulse = pulses[p];
          pulse.progress += pulse.speed;

          if (pulse.progress >= 1) {
            pulses.splice(p, 1);
            continue;
          }

          const n1 = nodes[pulse.sourceIndex];
          const n2 = nodes[pulse.targetIndex];
          if (n1 && n2) {
            const px = n1.x + (n2.x - n1.x) * pulse.progress;
            const py = n1.y + (n2.y - n1.y) * pulse.progress;

            ctx.beginPath();
            ctx.arc(px, py, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = pulseColor;
            ctx.shadowBlur = 8;
            ctx.shadowColor = shockwaveColor;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Occasional random synaptic pulse in ambient mode
      if (isRunning && activeMode === "ambient" && Math.random() < 0.04) {
        const src = Math.floor(Math.random() * nodes.length);
        const tgt = Math.floor(Math.random() * nodes.length);
        if (src !== tgt) {
          pulsesRef.current.push({
            sourceIndex: src,
            targetIndex: tgt,
            progress: 0,
            speed: 0.01 + Math.random() * 0.02,
          });
        }
      }

      if (isRunning && activeMode !== "reduced-motion") {
        animationFrameId.current = requestAnimationFrame(render);
      }
    };

    render();

    // Pointer events on canvas container
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handlePointerLeave = () => {
      pointerRef.current.active = false;
    };

    const parentEl = canvas.parentElement || canvas;
    parentEl.addEventListener("pointermove", handlePointerMove as any);
    parentEl.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      resizeObserver.disconnect();
      parentEl.removeEventListener("pointermove", handlePointerMove as any);
      parentEl.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [initNodes, isDark, isRunning, activeMode]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none ${
        activeMode === "conversational" ? "opacity-35 pointer-events-none" : ""
      } ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Optional Overlay Controls Header */}
      {showControls && (
        <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full border border-border/40 bg-background/60 backdrop-blur-md font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{title}</span>
            <span className="text-border">|</span>
            <span className="text-foreground/80">{activeMode.toUpperCase()}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={triggerPulse}
              title="Trigger Synaptic Pulse"
              className="flex items-center space-x-1 px-2 py-1 rounded-md border border-border/40 bg-background/70 backdrop-blur-md hover:bg-accent text-xs font-mono transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>PULSE</span>
            </button>
            <button
              onClick={() => setIsRunning(!isRunning)}
              title={isRunning ? "Freeze Matrix" : "Run Matrix"}
              className="flex items-center space-x-1 px-2 py-1 rounded-md border border-border/40 bg-background/70 backdrop-blur-md hover:bg-accent text-xs font-mono transition-colors"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? "FREEZE" : "RUN"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}