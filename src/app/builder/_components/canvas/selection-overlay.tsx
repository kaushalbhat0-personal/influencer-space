"use client";

import { useEffect, useState } from "react";
import type { ElementId } from "@/lib/builder/types";
import type { BuilderSlot } from "@/lib/builder/types";

interface SelectionOverlayProps {
  selectedIds: ElementId[];
  slots: BuilderSlot[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  device: "mobile" | "tablet" | "desktop";
  zoom: number;
}

export function SelectionOverlay({ selectedIds, slots, containerRef, device, zoom }: SelectionOverlayProps) {
  const [rects, setRects] = useState<Array<{ id: ElementId; top: number; left: number; width: number; height: number }>>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const newRects: typeof rects = [];
    for (const id of selectedIds) {
      const el = containerRef.current.querySelector(`[data-element-id="${id}"]`) as HTMLElement | null;
      if (el) {
        const canvasEl = containerRef.current.querySelector(".rounded-lg") as HTMLElement | null;
        const canvasRect = canvasEl?.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        if (canvasRect) {
          newRects.push({
            id,
            top: (elRect.top - canvasRect.top) / zoom,
            left: (elRect.left - canvasRect.left) / zoom,
            width: elRect.width / zoom,
            height: elRect.height / zoom,
          });
        }
      }
    }
    setRects(newRects);
  }, [selectedIds, slots, containerRef, device, zoom]);

  if (rects.length === 0) return null;

  return (
    <>
      {rects.map((r) => (
        <div key={r.id} className="pointer-events-none absolute inset-0">
          <div
            className="absolute border-2 border-s8ul-cyan"
            style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
          >
            <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full border-2 border-s8ul-cyan bg-zinc-950" />
            <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-s8ul-cyan bg-zinc-950" />
            <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full border-2 border-s8ul-cyan bg-zinc-950" />
            <div className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full border-2 border-s8ul-cyan bg-zinc-950" />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-s8ul-cyan px-1.5 py-0.5 text-[10px] font-medium text-black">
              {r.id}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
