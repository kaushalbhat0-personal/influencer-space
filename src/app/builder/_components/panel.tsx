"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;

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

  useState(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  });

  return (
    <div
      className={cn(
        "relative flex-shrink-0 border-r border-white/5 bg-zinc-950/80 transition-all duration-200",
        collapsed && "w-0 overflow-hidden border-0",
        !collapsed && `w-[${width}px]`,
        className
      )}
      style={{ width: collapsed ? 0 : width }}
    >
      <button
        onClick={onToggle}
        className={cn(
          "absolute top-4 z-10 rounded-full bg-zinc-800 p-1 text-zinc-500 hover:text-zinc-300",
          side === "left" ? "-right-3" : "-left-3"
        )}
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {side === "left" ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          )}
        </svg>
      </button>
      <div className="h-full overflow-y-auto p-3">{children}</div>
      <div
        onMouseDown={onMouseDown}
        className={cn(
          "absolute top-0 h-full w-1 cursor-col-resize hover:bg-s8ul-cyan/50",
          side === "left" ? "-right-0.5" : "-left-0.5"
        )}
      />
    </div>
  );
}
