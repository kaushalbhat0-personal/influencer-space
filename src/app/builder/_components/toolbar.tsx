"use client";

import { Smartphone, Tablet, Monitor, Undo, Redo, Eye, ZoomIn, ZoomOut, Save, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderCanvas } from "@/lib/builder/types";
import { builderCommands } from "@/lib/builder/commands";
import { builderQuery } from "@/lib/builder/query";

export function BuilderToolbar({
  device,
  zoom,
  showGrid,
  onDeviceChange,
  onZoomChange,
  onToggleGrid,
}: {
  device: BuilderCanvas["device"];
  zoom: number;
  showGrid: boolean;
  onDeviceChange: (d: BuilderCanvas["device"]) => void;
  onZoomChange: (z: number) => void;
  onToggleGrid: () => void;
}) {
  const devices: { id: BuilderCanvas["device"]; label: string; icon: typeof Monitor }[] = [
    { id: "mobile", label: "Mobile", icon: Smartphone },
    { id: "tablet", label: "Tablet", icon: Tablet },
    { id: "desktop", label: "Desktop", icon: Monitor },
  ];

  const history = builderQuery.getHistoryState();

  return (
    <div className="flex h-10 items-center justify-between border-b border-white/5 bg-zinc-950 px-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-zinc-300">Builder</span>
        <span className="text-[10px] text-zinc-600">—</span>
        <span className="text-[10px] text-zinc-500">workspace</span>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => builderCommands.undo()} disabled={!history.canUndo} className={cn("rounded p-1.5 transition-colors", history.canUndo ? "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200" : "text-zinc-700")} title="Undo"><Undo className="h-3.5 w-3.5" /></button>
        <button onClick={() => builderCommands.redo()} disabled={!history.canRedo} className={cn("rounded p-1.5 transition-colors", history.canRedo ? "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200" : "text-zinc-700")} title="Redo"><Redo className="h-3.5 w-3.5" /></button>
        <div className="mx-2 h-4 w-px bg-white/10" />
        {devices.map((d) => (
          <button key={d.id} onClick={() => onDeviceChange(d.id)} className={cn("rounded p-1.5 transition-colors", device === d.id ? "bg-s8ul-cyan/10 text-s8ul-cyan" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300")} title={d.label}>
            <d.icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <div className="mx-2 h-4 w-px bg-white/10" />
        <button onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300" title="Zoom Out"><ZoomOut className="h-3.5 w-3.5" /></button>
        <span className="min-w-[3rem] text-center text-[10px] text-zinc-500">{Math.round(zoom * 100)}%</span>
        <button onClick={() => onZoomChange(Math.min(2, zoom + 0.25))} className="rounded p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300" title="Zoom In"><ZoomIn className="h-3.5 w-3.5" /></button>
        <div className="mx-2 h-4 w-px bg-white/10" />
        <button onClick={onToggleGrid} className={cn("rounded p-1.5 transition-colors", showGrid ? "bg-s8ul-cyan/10 text-s8ul-cyan" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300")} title="Toggle Grid"><Grid3X3 className="h-3.5 w-3.5" /></button>
        <div className="mx-2 h-4 w-px bg-white/10" />
        <button className="rounded p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300" title="Preview"><Eye className="h-3.5 w-3.5" /></button>
        <button className="rounded p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300" title="Save"><Save className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
