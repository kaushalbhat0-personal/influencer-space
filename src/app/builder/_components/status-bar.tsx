"use client";

import { Circle, Loader2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export function BuilderStatusBar({
  selectedCount,
  zoom,
  isDirty,
  saving,
  statusMsg,
  onPublish,
  publishing,
  liveVersion,
}: {
  selectedCount: number;
  zoom: number;
  isDirty: boolean;
  saving?: boolean;
  statusMsg?: string;
  onPublish?: () => void;
  publishing?: boolean;
  liveVersion?: number | null;
}) {
  return (
    <div className="flex h-7 items-center justify-between border-t border-white/5 bg-zinc-950 px-3 text-[10px] text-zinc-600">
      <div className="flex items-center gap-3">
        <span>{selectedCount > 0 ? `${selectedCount} selected` : "No selection"}</span>
        <span className="text-zinc-800">|</span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
      <div className="flex items-center gap-3">
        {liveVersion !== undefined && liveVersion !== null && (
          <span className="text-zinc-600">v{liveVersion}</span>
        )}
        {saving && (
          <span className="flex items-center gap-1 text-amber-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            {statusMsg || "Saving..."}
          </span>
        )}
        {!saving && statusMsg && (
          <span className={cn("flex items-center gap-1", statusMsg === "Saved" ? "text-emerald-400" : "text-red-400")}>
            {statusMsg}
          </span>
        )}
        {!saving && !statusMsg && (
          <span className="flex items-center gap-1">
            <Circle className={cn("h-1.5 w-1.5", isDirty ? "fill-amber-500 text-amber-500" : "fill-emerald-500 text-emerald-500")} />
            {isDirty ? "Unsaved changes" : "Saved"}
          </span>
        )}
        <span className="text-zinc-800">|</span>
        <button
          onClick={onPublish}
          disabled={publishing}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
        >
          {publishing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Rocket className="h-3 w-3" />
          )}
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </div>
    </div>
  );
}
