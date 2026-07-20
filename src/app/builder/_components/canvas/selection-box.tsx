"use client";

import { useState, useCallback, useEffect } from "react";

export function SelectionBox({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);

  const onMouseDown = useCallback((e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-element-id]")) return;
    if ((e.target as HTMLElement).closest("[data-canvas-bg]") || (e.target as HTMLElement) === containerRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setBox(null);
      }
    }
  }, [containerRef]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!start) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(start.x, e.clientX - rect.left);
    const y = Math.min(start.y, e.clientY - rect.top);
    const w = Math.abs(e.clientX - rect.left - start.x);
    const h = Math.abs(e.clientY - rect.top - start.y);
    if (w > 5 || h > 5) setBox({ x, y, w, h });
  }, [start, containerRef]);

  const onMouseUp = useCallback(() => {
    setStart(null);
    setBox(null);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { el.removeEventListener("mousedown", onMouseDown); window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [containerRef, onMouseDown, onMouseMove, onMouseUp]);

  if (!box) return null;

  return (
    <div
      className="pointer-events-none absolute z-50 border border-s8ul-cyan/50 bg-s8ul-cyan/5"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    />
  );
}
