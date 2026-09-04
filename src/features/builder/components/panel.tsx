"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const COLLAPSED_STRIP = 20;

/**
 * RCCF-68.3.3 — desktop resizable side panel.
 *
 * Resizing uses Pointer Events (mouse + touch via a single code path) with
 * pointer capture on the handle, so a drag keeps tracking even when the pointer
 * leaves the handle. `touch-action: none` on the handle prevents the browser
 * from hijacking a touch drag into a page scroll.
 *
 * On `lg+` this panel is a fixed side rail (left/right of the canvas). Below
 * `lg` the workspace hides the rails and renders their content inside the
 * mobile overlay panels instead — this component is desktop-only by usage.
 */
export function ResizablePanel({
  children,
  side,
  defaultWidth = 280,
  collapsed = false,
  onToggle,
  className,
}: {
  children: ReactNode;
  side: "left" | "right";
  defaultWidth?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  const [width, setWidth] = useState(defaultWidth);
  const handleRef = useRef<HTMLDivElement>(null);

  // Pointer Events resize — one code path for mouse + touch.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only the primary pointer (mouse left button / first touch) resizes.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const handle = handleRef.current;
    if (!handle) return;

    const startX = e.clientX;
    const startWidth = width;
    let rafId: number | null = null;

    const applyWidth = (clientX: number) => {
      const next = side === "left" ? clientX : window.innerWidth - clientX;
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, next)));
    };

    const onPointerMove = (ev: PointerEvent) => {
      // Throttle to animation frames to avoid layout thrash on high-frequency
      // pointer move events.
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        applyWidth(ev.clientX);
      });
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      // Snap to the last position in case the final move was throttled.
      applyWidth(ev.clientX);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.releasePointerCapture?.(ev.pointerId);
      setDragging(false);
    };

    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // capture is best-effort; listeners still work without it
    }
    setDragging(true);
    // StartWidth unused when clientX already reflects the current pointer, but
    // kept for clarity of the delta-free absolute sizing above.
    void startX;
    void startWidth;
  }, [side, width]);

  const [dragging, setDragging] = useState(false);

  // Cleanup pointermove/pointerup listeners if unmounted mid-drag.
  useEffect(() => {
    const handle = handleRef.current;
    return () => {
      if (!handle) return;
      handle.onpointermove = null;
      handle.onpointerup = null;
    };
  }, []);

  const label = collapsed
    ? side === "left" ? "Expand sections panel" : "Expand properties panel"
    : side === "left" ? "Collapse sections panel" : "Collapse properties panel";

  return (
    <div
      className={cn("relative z-30 flex-shrink-0", className)}
      style={{ width: collapsed ? COLLAPSED_STRIP : width }}
    >
      {/* Panel body — collapses to 0 width, hidden when collapsed. */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 overflow-hidden border-r border-white/5 bg-zinc-950/80 transition-all duration-200",
          side === "right" && "border-r-0 border-l border-white/5",
          collapsed && "w-0 border-0",
        )}
        style={{ width: collapsed ? 0 : width }}
      >
        <div className="h-full overflow-y-auto p-3">{children}</div>
        {/* Resize handle — pointer events + no touch scrolling during a drag. */}
        <div
          ref={handleRef}
          onPointerDown={onPointerDown}
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${side === "left" ? "sections" : "properties"} panel`}
          className={cn(
            "absolute top-0 h-full w-1 cursor-col-resize touch-none select-none",
            dragging ? "bg-[var(--brand-primary)]/60" : "hover:bg-[var(--primary-hover)]/50",
            side === "left" ? "right-0" : "left-0",
          )}
        />
      </div>

      {/* The toggle button lives in the never-collapsed strip, so it is ALWAYS
          visible and clickable (IMPLEMENTATION-21 BUG 5/6): collapse → expand →
          refresh all keep the panel recoverable, with no dead-end UI. */}
      <button
        onClick={onToggle}
        aria-label={label}
        aria-expanded={!collapsed}
        data-testid={`panel-toggle-${side}`}
        className={cn(
          "absolute top-4 z-20 rounded-full bg-zinc-800 p-1 text-zinc-400 shadow-lg shadow-black/40 transition-colors hover:text-zinc-200",
          side === "left" ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2",
        )}
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {side === "left" ? (
            collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            )
          ) : (
            collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            )
          )}
        </svg>
      </button>
    </div>
  );
}
