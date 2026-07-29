"use client";

import { useEffect, memo } from "react";
import { builderQuery } from "@/lib/builder/query";
import { builderEvents } from "@/lib/builder/events";
import { ComponentRenderer } from "@/lib/renderer";
import { ComponentErrorBoundary } from "@/components/ui/ComponentErrorBoundary";
import { builderStore } from "@/lib/builder/store";

const DEVICE_WIDTHS: Record<string, number> = { mobile: 375, tablet: 768, desktop: 1200 };

export const InteractiveCanvas = memo(function InteractiveCanvas({
  device,
  zoom,
}: {
  device: string;
  zoom: number;
}) {
  const hierarchy = builderQuery.getCanvasHierarchy();
  const slotElements = hierarchy.slots.filter((s) => s.visible);

  // Force re-render on store changes
  useEffect(() => {
    const handler = () => {};
    const unsubs = [
      builderEvents.subscribe("node:inserted", handler),
      builderEvents.subscribe("node:deleted", handler),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  return (
    <div className="relative flex-1 overflow-auto bg-zinc-900/50">
      <div className="flex min-h-full items-start justify-center p-8">
        <div
          className="relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50 transition-all"
          style={{ width: DEVICE_WIDTHS[device] ?? 1200, transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
            <div className="flex gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="ml-2 text-[10px] text-zinc-600">{DEVICE_WIDTHS[device] ?? 1200}px</span>
          </div>

          <div className="relative min-h-[600px] p-4">
            {slotElements.length === 0 && (
              <div className="flex flex-col items-center gap-4 pt-12 text-center">
                <div className="h-16 w-16 rounded-full bg-zinc-800" />
                <h2 className="text-sm font-semibold text-zinc-300">Your Website Preview</h2>
                <p className="max-w-xs text-xs text-zinc-600">Add sections from the left sidebar to get started.</p>
              </div>
            )}

            {slotElements.map((slot) => (
              <div
                key={slot.id}
                data-element-id={slot.id}
                data-module={slot.moduleId}
                className="relative mb-2"
              >
                <ComponentErrorBoundary componentId={slot.moduleId}>
                  <ComponentRenderer
                    componentId={slot.moduleId}
                    props={slot.config}
                    elementId={slot.id}
                    viewport={builderStore.canvas.device}
                  />
                </ComponentErrorBoundary>
              </div>
            ))}
          </div>
        </div>
      </div>

      {device !== "desktop" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-zinc-800 px-3 py-1 text-[10px] text-zinc-500">
          {DEVICE_WIDTHS[device]}px &middot; {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
});
