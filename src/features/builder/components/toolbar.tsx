"use client";

import Link from "next/link";
import { Smartphone, Tablet, Monitor, Undo, Redo, Eye, ZoomIn, ZoomOut, LayoutDashboard, ExternalLink, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderCanvas } from "@/lib/builder/types";
import { builderCommands } from "@/lib/builder/commands";
import { builderQuery } from "@/lib/builder/query";
import { PublishStatusBadge } from "@/components/publish/PublishStatusBadge";

export function BuilderToolbar({
  device,
  zoom,
  storefrontUrl = "/",
  publishStatus = "draft",
  onDeviceChange,
  onZoomChange,
  onSave,
  saving,
}: {
  device: BuilderCanvas["device"];
  zoom: number;
  storefrontUrl?: string;
  publishStatus?: "draft" | "preview" | "publishing" | "published" | "outdated" | "unavailable";
  onDeviceChange: (d: BuilderCanvas["device"]) => void;
  onZoomChange: (z: number) => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  const devices: { id: BuilderCanvas["device"]; label: string; icon: typeof Monitor }[] = [
    { id: "mobile", label: "Mobile", icon: Smartphone },
    { id: "tablet", label: "Tablet", icon: Tablet },
    { id: "desktop", label: "Desktop", icon: Monitor },
  ];

  const history = builderQuery.getHistoryState();

  return (
    <div className="flex h-11 items-center justify-between border-b border-white/10 bg-zinc-950 px-4">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 text-sm font-bold bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-transparent font-display hover:opacity-80 transition-opacity"
        >
          CreatorStore
        </Link>
        <span className="h-4 w-px bg-white/10" />
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <Link
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View site
        </Link>
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
        <button className="rounded p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300" title="Preview"><Eye className="h-3.5 w-3.5" /></button>
        <PublishStatusBadge status={publishStatus} size="sm" />
        <div className="mx-2 h-4 w-px bg-white/10" />
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-[11px] font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? "Saving..." : "Save Layout"}
        </button>
      </div>
    </div>
  );
}
