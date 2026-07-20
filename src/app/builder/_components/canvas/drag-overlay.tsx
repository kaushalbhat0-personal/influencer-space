"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dragController } from "@/lib/builder/drag";
import type { DragContext } from "@/lib/builder/drag";
import { snapEngine } from "@/lib/builder/drag";
import { builderEvents } from "@/lib/builder/events";
import { builderQuery } from "@/lib/builder/query";

export function DragOverlay({ zoom, showSnapGuides }: { containerRef: React.RefObject<HTMLDivElement | null>; zoom: number; showSnapGuides?: boolean }) {
  const [ctx, setCtx] = useState<DragContext | null>(null);
  const animFrame = useRef<number>(0);
  const dropAnimRef = useRef<HTMLDivElement>(null);

  const updateFrame = useCallback(() => {
    if (dragController.active) { setCtx(dragController.getContext()); animFrame.current = requestAnimationFrame(updateFrame); }
  }, []);

  const triggerDropAnim = (action: string) => {
    if (dropAnimRef.current) { dropAnimRef.current.className = `animate-drop-${action}`; dropAnimRef.current.style.animation = "none"; void dropAnimRef.current.offsetHeight; dropAnimRef.current.style.animation = ""; }
  };

  useEffect(() => {
    const unsubs = [
      builderEvents.subscribe("drag:started", () => { setCtx(dragController.getContext()); animFrame.current = requestAnimationFrame(updateFrame); }),
      builderEvents.subscribe("drag:cancelled", () => { cancelAnimationFrame(animFrame.current); triggerDropAnim("cancel"); setTimeout(() => setCtx(null), 150); }),
      builderEvents.subscribe("drag:completed", () => { cancelAnimationFrame(animFrame.current); triggerDropAnim("move"); setTimeout(() => setCtx(null), 300); }),
    ];
    return () => { unsubs.forEach((u) => u()); cancelAnimationFrame(animFrame.current); };
  }, [updateFrame]);

  if (!ctx || !ctx.session.position || !ctx.session.source) return null;

  const src = ctx.session.source!;
  const pos = ctx.session.position!;
  const isMulti = ctx.selection.count > 1;
  const mods = ctx.modifiers;
  const strategy = ctx.strategy;

  let snapX = pos.pageX - pos.offsetX;
  let snapY = pos.pageY - pos.offsetY;

  if (showSnapGuides !== false) {
    const candidates = builderQuery.getVisibleNodes()
      .filter((s) => s.id !== src.elementId)
      .map((s) => { const el = document.querySelector(`[data-element-id="${s.id}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })
      .filter(Boolean) as Array<{ x: number; y: number; width: number; height: number }>;
    const result = snapEngine.snap({ x: snapX, y: snapY, width: src.elementWidth * zoom, height: src.elementHeight * zoom }, candidates);
    snapX = result.x; snapY = result.y;
  }

  const targetValid = ctx.target.valid;

  return (
    <>
      <div ref={dropAnimRef} style={{ position: "fixed", left: snapX, top: snapY, width: src.elementWidth * zoom, height: src.elementHeight * zoom, opacity: 0.6, pointerEvents: "none", zIndex: 100, transform: "scale(0.95)", border: `2px dashed ${isMulti ? "rgba(168,85,247,0.6)" : "rgba(0,245,255,0.5)"}`, borderRadius: "4px", background: isMulti ? "rgba(168,85,247,0.1)" : "rgba(0,245,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <div className="flex h-full flex-col items-center justify-center gap-1">
          <span className="text-xs text-s8ul-cyan/70">{strategy.getPreviewLabel(src)}</span>
          {isMulti && <span className="text-[9px] text-purple-400/70">{ctx.selection.count} modules</span>}
          {!isMulti && <span className="text-[9px] text-white/30">{mods.alt ? "\u2325 Copy" : mods.shift ? "\u21E7 Insert" : mods.ctrl ? "\u2318 Link" : ""}</span>}
        </div>
      </div>

      {ctx.target.sectionId && (
        <div className="pointer-events-none fixed z-90" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
          <div className={`rounded border-2 px-3 py-1.5 text-sm font-medium transition-all duration-150 ${targetValid ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 scale-105" : "border-red-500/50 bg-red-500/10 text-red-400 animate-pulse"}`}>
            {targetValid ? "Drop" : "Cannot drop here"}
          </div>
        </div>
      )}
    </>
  );
}
