"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

// ==========================================
// TUNABLE CONSTANTS
// ==========================================
const GRID_SPACING = 38; // Distance between grid lines (px)
const NODE_BASE_RADIUS = 1.2; // Base dot radius at intersections (px)
const BULGE_RADIUS = 180; // Radius of mouse influence (px)
const BULGE_STRENGTH = 32; // Maximum outward displacement (px)
const EASING_SPEED = 0.08; // Lerp smoothing factor (0.01 - 0.2)
const NUM_STARS = 65; // Background random faint dust / stars

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
}

export function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse tracking state
    const mouse = {
      targetX: -1000,
      targetY: -1000,
      currX: -1000,
      currY: -1000,
      isIdle: true,
      lastMoveTime: 0,
    };

    // Stars background
    let stars: Star[] = [];

    // Resize handler with devicePixelRatio support
    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Generate background noise stars
      stars = [];
      for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.1 + 0.5,
          baseAlpha: Math.random() * 0.25 + 0.08,
          twinkleSpeed: Math.random() * 0.02 + 0.008,
          phase: Math.random() * Math.PI * 2,
        });
      }

      if (mouse.targetX < 0) {
        mouse.targetX = width / 2;
        mouse.targetY = height / 2;
        mouse.currX = width / 2;
        mouse.currY = height / 2;
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isIdle = false;
      mouse.lastMoveTime = performance.now();
    };

    const handleMouseLeave = () => {
      mouse.isIdle = true;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    let startTime = performance.now();

    // Render loop
    const render = (now: number) => {
      const elapsed = (now - startTime) * 0.001;

      // Handle idle drift if mouse has been still for > 2.5s
      if (now - mouse.lastMoveTime > 2500) {
        mouse.isIdle = true;
      }

      if (mouse.isIdle) {
        // Slow Lissajous drift across the center
        const idleTargetX = width * 0.5 + Math.sin(elapsed * 0.5) * (width * 0.25);
        const idleTargetY = height * 0.5 + Math.cos(elapsed * 0.35) * (height * 0.2);
        mouse.targetX = idleTargetX;
        mouse.targetY = idleTargetY;
      }

      // Smooth lerp easing for gravity bulge
      mouse.currX += (mouse.targetX - mouse.currX) * EASING_SPEED;
      mouse.currY += (mouse.targetY - mouse.currY) * EASING_SPEED;

      // Theme colors
      const isDark = resolvedTheme !== "light";
      const bgFill = isDark ? "#060608" : "#f5f5f7";
      const gridLineColor = isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.07)";
      const nodeColorBase = isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.25)";
      const starColor = isDark ? "255, 255, 255" : "30, 30, 30";
      const netLineColor = isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.35)";
      const tagColor = isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)";

      // Clear & draw background
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, width, height);

      // 1. Draw distant background stars / noise
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const alpha = s.baseAlpha + Math.sin(now * s.twinkleSpeed + s.phase) * 0.06;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${starColor}, ${Math.max(0.02, alpha)})`;
        ctx.fill();
      }

      // 2. Compute grid intersection points with gravity bulge displacement
      const cols = Math.ceil(width / GRID_SPACING) + 1;
      const rows = Math.ceil(height / GRID_SPACING) + 1;
      const startX = (width - (cols - 1) * GRID_SPACING) / 2;
      const startY = (height - (rows - 1) * GRID_SPACING) / 2;

      // 2D grid matrix storing [x, y, radius, alpha, dist]
      const points: { x: number; y: number; r: number; a: number; d: number }[][] = [];
      const bulgeNodes: { x: number; y: number; d: number }[] = [];

      for (let r = 0; r < rows; r++) {
        points[r] = [];
        const baseY = startY + r * GRID_SPACING;

        for (let c = 0; c < cols; c++) {
          const baseX = startX + c * GRID_SPACING;

          // Distance to gravity well center
          const dx = baseX - mouse.currX;
          const dy = baseY - mouse.currY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let px = baseX;
          let py = baseY;
          let rRadius = NODE_BASE_RADIUS;
          let rAlpha = 0.3;

          if (dist < BULGE_RADIUS) {
            // Smooth Gaussian falloff for outward dome push
            const normDist = dist / BULGE_RADIUS;
            const factor = Math.exp(-normDist * normDist * 3.5);

            if (dist > 0.001) {
              // Outward displacement from cursor
              px = baseX + (dx / dist) * factor * BULGE_STRENGTH;
              py = baseY + (dy / dist) * factor * BULGE_STRENGTH;
            }

            // Node scaling and brightening when closer to camera in the bulge
            rRadius = NODE_BASE_RADIUS + factor * 2.6;
            rAlpha = 0.35 + factor * 0.6;

            if (dist < BULGE_RADIUS * 0.7) {
              bulgeNodes.push({ x: px, y: py, d: dist });
            }
          }

          points[r][c] = { x: px, y: py, r: rRadius, a: rAlpha, d: dist };
        }
      }

      // 3. Draw grid lines (horizontal & vertical)
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = gridLineColor;

      // Horizontal lines
      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
          const pt = points[r][c];
          if (c === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // Vertical lines
      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const pt = points[r][c];
          if (r === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // 4. Draw network overlay lines inside the bulge
      if (bulgeNodes.length >= 2) {
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = netLineColor;
        ctx.beginPath();
        const maxNetDist = GRID_SPACING * 1.6;
        for (let i = 0; i < Math.min(bulgeNodes.length, 12); i++) {
          for (let j = i + 1; j < Math.min(bulgeNodes.length, 12); j++) {
            const b1 = bulgeNodes[i];
            const b2 = bulgeNodes[j];
            const distBetween = Math.hypot(b1.x - b2.x, b1.y - b2.y);
            if (distBetween < maxNetDist) {
              ctx.moveTo(b1.x, b1.y);
              ctx.lineTo(b2.x, b2.y);
            }
          }
        }
        ctx.stroke();

        // 5. Draw typewriter hex tags on 2 nodes near the cursor
        ctx.font = "9px 'Courier New', Courier, monospace";
        ctx.fillStyle = tagColor;
        for (let i = 0; i < Math.min(bulgeNodes.length, 2); i++) {
          const bn = bulgeNodes[i];
          const hexTag = `0x${((i + 1) * 37 + Math.floor(elapsed * 2)) % 255}`.toUpperCase();
          ctx.fillText(hexTag, bn.x + 5, bn.y - 5);
        }
      }

      // 6. Draw nodes at intersections
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pt = points[r][c];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
          ctx.fillStyle = isDark
            ? `rgba(255, 255, 255, ${pt.a})`
            : `rgba(0, 0, 0, ${pt.a})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [resolvedTheme]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}