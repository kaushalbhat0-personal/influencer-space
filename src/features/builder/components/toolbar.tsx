"use client";

import Link from "next/link";
import { Monitor, Tablet, Smartphone, ExternalLink, Upload, Undo, Redo } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderCanvas } from "@/lib/builder/types";
import { builderCommands } from "@/lib/builder/commands";
import { builderQuery } from "@/lib/builder/query";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { CompletionBadge } from "./completion-badge";

interface Props {
  device: BuilderCanvas["device"];
  themeName: string | null;
  blueprintName: string | null;
  creatorName: string;
  completionPct: number;
  publishStatus: PublishStatusValue;
  storefrontUrl: string;
  onDeviceChange: (d: BuilderCanvas["device"]) => void;
  onSave: () => void;
  saving: boolean;
}

export function BuilderToolbar({
  device, themeName, blueprintName, creatorName, completionPct,
  publishStatus, storefrontUrl, onDeviceChange, onSave, saving,
}: Props) {
  const history = builderQuery.getHistoryState();

  const devices = [
    { id: "desktop" as const, icon: Monitor, label: "Desktop" },
    { id: "tablet" as const, icon: Tablet, label: "Tablet" },
    { id: "mobile" as const, icon: Smartphone, label: "Mobile" },
  ];

  return (
    <div className="flex flex-col flex-shrink-0 border-b border-white/10 bg-zinc-950 z-20">
      <div className="flex h-9 items-center justify-between px-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/admin/dashboard"
            className="shrink-0 text-sm font-bold bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-transparent font-display hover:opacity-80 transition-opacity"
          >
            CreatorStore
          </Link>
          <span className="h-3 w-px bg-white/10 shrink-0" />
          <span className="truncate text-xs text-zinc-300 font-medium">{creatorName}</span>
          <span className="h-3 w-px bg-white/10 shrink-0" />
          <span className="truncate text-[11px] text-zinc-600">{themeName ?? "No theme"}</span>
          <span className="text-zinc-800 text-[10px]">·</span>
          <span className="truncate text-[11px] text-zinc-600">{blueprintName ?? "—"}</span>
          <span className="h-3 w-px bg-white/10 shrink-0" />
          <CompletionBadge pct={completionPct} />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => builderCommands.undo()}
            disabled={!history.canUndo}
            className={cn("rounded p-1 transition-colors", history.canUndo ? "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300" : "text-zinc-700")}
            title="Undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => builderCommands.redo()}
            disabled={!history.canRedo}
            className={cn("rounded p-1 transition-colors", history.canRedo ? "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300" : "text-zinc-700")}
            title="Redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex h-8 items-center justify-between border-t border-white/5 px-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-md bg-zinc-800/50 p-0.5">
            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => onDeviceChange(d.id)}
                className={cn("rounded px-1.5 py-0.5 transition-colors", device === d.id ? "bg-zinc-700 text-zinc-200" : "text-zinc-600 hover:text-zinc-400")}
                title={d.label}
              >
                <d.icon className="h-3 w-3" />
              </button>
            ))}
          </div>
          <span className="h-3 w-px bg-white/5" />
          <PreviewDraftToggle status={publishStatus} />
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View Live
          </Link>
          <span className="h-3 w-px bg-white/5" />
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1 rounded-md bg-indigo-500/10 px-2.5 py-1 text-[10px] font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {saving ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewDraftToggle({ status }: { status: PublishStatusValue }) {
  const items = [
    { id: "preview" as const, label: "Preview" },
    { id: "live" as const, label: "Live" },
    { id: "draft" as const, label: "Draft" },
  ];

  const current = status === "published" || status === "outdated" ? "live" : status === "preview" ? "preview" : "draft";

  return (
    <div className="flex items-center gap-0.5 rounded-md bg-zinc-800/50 p-0.5">
      {items.map((item) => (
        <span
          key={item.id}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
            current === item.id
              ? item.id === "live" ? "bg-emerald-500/20 text-emerald-400" : item.id === "preview" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-700 text-zinc-300"
              : "text-zinc-600"
          )}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
