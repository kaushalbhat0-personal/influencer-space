"use client";

import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function BuilderStatusBar({
  selectedCount,
  zoom,
  isDirty,
}: {
  selectedCount: number;
  zoom: number;
  isDirty: boolean;
}) {
  return (
    <div className="flex h-7 items-center justify-between border-t border-white/5 bg-zinc-950 px-3 text-[10px] text-zinc-600">
      <div className="flex items-center gap-3">
        <span>{selectedCount > 0 ? `${selectedCount} selected` : "No selection"}</span>
        <span className="text-zinc-800">|</span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <Circle className={cn("h-1.5 w-1.5", isDirty ? "fill-amber-500 text-amber-500" : "fill-emerald-500 text-emerald-500")} />
          {isDirty ? "Unsaved changes" : "Saved"}
        </span>
        <span className="text-zinc-800">|</span>
        <span>Builder v1.0</span>
      </div>
    </div>
  );
}
