"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const COLLAPSED_STRIP = 20;

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
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => { dragging.current = true; }, []);
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      const newWidth = side === "left" ? e.clientX : window.innerWidth - e.clientX;
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
    },
    [side]
  );
  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const label = collapsed
    ? side === "left" ? "Expand sidebar" : "Expand panel"
    : side === "left" ? "Collapse sidebar" : "Collapse panel";

  return (
    <div
      className={cn("relative z-30 flex-shrink-0", className)}
      style={{ width: collapsed ? COLLAPSED_STRIP : width }}
    >
      {/* Panel body — collapses to 0 width, hidden when collapsed. */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 overflow-hidden border-r border-white/5 bg-zinc-950/80 transition-all duration-200",
          collapsed && "w-0 border-0",
        )}
        style={{ width: collapsed ? 0 : width }}
      >
        <div className="h-full overflow-y-auto p-3">{children}</div>
        <div
          onMouseDown={onMouseDown}
          className={cn(
            "absolute top-0 h-full w-1 cursor-col-resize hover:bg-s8ul-cyan/50",
            side === "left" ? "right-0" : "left-0"
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
