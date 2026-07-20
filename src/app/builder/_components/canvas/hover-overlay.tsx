"use client";

import type { ElementId, BuilderSlot } from "@/lib/builder/types";

interface HoverOverlayProps {
  hoveredId: ElementId | null;
  slots: BuilderSlot[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  device: "mobile" | "tablet" | "desktop";
  zoom: number;
}

export function HoverOverlay({ hoveredId, slots }: HoverOverlayProps) {
  if (!hoveredId) return null;
  const slot = slots.find((s) => s.id === hoveredId);
  if (!slot) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        key={hoveredId}
        data-hover-overlay
        className="absolute inset-0"
      >
        <div
          className="absolute border border-dashed border-amber-400/50"
          style={{
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
            {slot.moduleId.split(".").pop()} · {slot.id}
          </div>
        </div>
      </div>
    </div>
  );
}
