"use client";

import type { BuilderCanvas } from "@/lib/builder/types";

export function BuilderCanvas({
  device,
  zoom,
}: {
  device: BuilderCanvas["device"];
  zoom: number;
}) {
  const deviceWidth = { mobile: 375, tablet: 768, desktop: 1200 }[device];

  return (
    <div className="flex-1 overflow-auto bg-zinc-900/50">
      <div className="flex min-h-full items-start justify-center p-8">
        <div
          className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50 transition-all"
          style={{ width: deviceWidth, transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
            <div className="flex gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="ml-2 text-[10px] text-zinc-600">{deviceWidth}px</span>
          </div>
          <div className="min-h-[600px] p-4">
            <div className="flex flex-col items-center gap-4 pt-12 text-center">
              <div className="h-16 w-16 rounded-full bg-zinc-800" />
              <h2 className="text-sm font-semibold text-zinc-300">Your Website Preview</h2>
              <p className="max-w-xs text-xs text-zinc-600">Add modules from the left sidebar to start building your creator website. Drag and drop modules to rearrange them.</p>
            </div>
          </div>
        </div>
      </div>

      {device !== "desktop" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-zinc-800 px-3 py-1 text-[10px] text-zinc-500">
          {deviceWidth}px · {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}
