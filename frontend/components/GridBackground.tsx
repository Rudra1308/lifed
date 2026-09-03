"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

// ==========================================
// TUNABLE CONSTANTS
// ==========================================
const GRID_SPACING = 40; // Distance between grid lines (px)
const NODE_BASE_RADIUS = 1.6; // Base dot radius at intersections (px)
const BULGE_RADIUS = 210; // Radius of mouse gravity influence (px)
const BULGE_STRENGTH = 46; // Maximum outward 3D dome displacement (px)
const EASING_SPEED = 0.09; // Lerp smoothing factor
const NUM_STARS = 75; // Background random faint dust/stars

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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mouse = {
      targetX: width / 2,
      targetY: height / 2,
      currX: width / 2,
      currY: height / 2,
      isIdle: true,
      lastMoveTime: performance.now(),
    };

    let stars: Star[] = [];

    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      stars = [];
      for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.2 + 0.6,
          baseAlpha: Math.random() * 0.3 + 0.1,
          twinkleSpeed: Math.random() * 0.02 + 0.008,
          phase: Math.random() * Math.PI * 2,
        });
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

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) * 0.001;

      // Idle drift check
      if (now - mouse.lastMoveTime > 2000) {
        mouse.isIdle = true;
      }

      if (mouse.isIdle) {
        mouse.targetX = width * 0.5 + Math.sin(elapsed * 0.6) * (width * 0.22);
        mouse.targetY = height * 0.5 + Math.cos(elapsed * 0.45) * (height * 0.18);
      }

      // Lerp easing
      mouse.currX += (mouse.targetX - mouse.currX) * EASING_SPEED;
      mouse.currY += (mouse.targetY - mouse.currY) * EASING_SPEED;

      // Theme Colors
      const isDark = resolvedTheme !== "light";
      const bgFill = isDark ? "#070709" : "#f6f6f8";
      const gridLineColor = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.12)";
      const starColor = isDark ? "255, 255, 255" : "30, 30, 30";
      const netLineColor = isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.45)";
      const tagColor = isDark ? "rgba(255, 255, 255, 0.75)" : "rgba(0, 0, 0, 0.7)";

      // Reset transform and scale for DPR
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Clear Canvas Background
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, width, height);

      // 1. Draw background dust / stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const alpha = s.baseAlpha + Math.sin(now * s.twinkleSpeed + s.phase) * 0.08;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${starColor}, ${Math.max(0.04, alpha)})`;
        ctx.fill();
      }

      // 2. Compute grid intersections with outward Gaussian displacement
      const cols = Math.ceil(width / GRID_SPACING) + 2;
      const rows = Math.ceil(height / GRID_SPACING) + 2;
      const startX = (width - (cols - 1) * GRID_SPACING) / 2;
      const startY = (height - (rows - 1) * GRID_SPACING) / 2;

      const points: { x: number; y: number; r: number; a: number }[][] = [];
      const bulgeNodes: { x: number; y: number }[] = [];

      for (let r = 0; r < rows; r++) {
        points[r] = [];
        const baseY = startY + r * GRID_SPACING;

        for (let c = 0; c < cols; c++) {
          const baseX = startX + c * GRID_SPACING;

          const dx = baseX - mouse.currX;
          const dy = baseY - mouse.currY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let px = baseX;
          let py = baseY;
          let rRadius = NODE_BASE_RADIUS;
          let rAlpha = 0.4;

          if (dist < BULGE_RADIUS) {
            const normDist = dist / BULGE_RADIUS;
            const factor = Math.exp(-normDist * normDist * 3.2);

            if (dist > 0.001) {
              px = baseX + (dx / dist) * factor * BULGE_STRENGTH;
              py = baseY + (dy / dist) * factor * BULGE_STRENGTH;
            }

            rRadius = NODE_BASE_RADIUS + factor * 3.2;
            rAlpha = 0.45 + factor * 0.55;

            if (dist < BULGE_RADIUS * 0.65) {
              bulgeNodes.push({ x: px, y: py });
            }
          }

          points[r][c] = { x: px, y: py, r: rRadius, a: rAlpha };
        }
      }

      // 3. Draw grid lines (Horizontal & Vertical)
      ctx.lineWidth = 0.85;
      ctx.strokeStyle = gridLineColor;

      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
          const pt = points[r][c];
          if (c === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const pt = points[r][c];
          if (r === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // 4. Draw network overlay lines inside bulge
      if (bulgeNodes.length >= 2) {
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = netLineColor;
        ctx.beginPath();
        const maxDist = GRID_SPACING * 1.7;
        for (let i = 0; i < Math.min(bulgeNodes.length, 14); i++) {
          for (let j = i + 1; j < Math.min(bulgeNodes.length, 14); j++) {
            const b1 = bulgeNodes[i];
            const b2 = bulgeNodes[j];
            const d = Math.hypot(b1.x - b2.x, b1.y - b2.y);
            if (d < maxDist) {
              ctx.moveTo(b1.x, b1.y);
              ctx.lineTo(b2.x, b2.y);
            }
          }
        }
        ctx.stroke();

        // 5. Monospace hex labels
        ctx.font = "bold 10px 'Courier New', Courier, monospace";
        ctx.fillStyle = tagColor;
        for (let i = 0; i < Math.min(bulgeNodes.length, 2); i++) {
          const bn = bulgeNodes[i];
          const hexTag = `0x${((i + 1) * 43 + Math.floor(elapsed * 2)) % 255}`.toUpperCase();
          ctx.fillText(hexTag, bn.x + 6, bn.y - 6);
        }
      }

      // 6. Draw grid node intersection dots
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
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}