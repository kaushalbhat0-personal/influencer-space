"use client";

import Link from "next/link";
import { Monitor, Tablet, Smartphone, ExternalLink, Upload, Undo, Redo, Layers, Settings2, ArrowLeft } from "lucide-react";
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
  /** RCCF-68.3.3 — mobile panel state for the toolbar's panel toggles. */
  mobilePanel?: "sections" | "properties" | null;
  onOpenSections?: () => void;
  onOpenProperties?: () => void;
}

export function BuilderToolbar({
  device, themeName, blueprintName, creatorName, completionPct,
  publishStatus, storefrontUrl, onDeviceChange, onSave, saving,
  mobilePanel, onOpenSections, onOpenProperties,
}: Props) {
  const history = builderQuery.getHistoryState();

  const devices = [
    { id: "desktop" as const, icon: Monitor, label: "Desktop" },
    { id: "tablet" as const, icon: Tablet, label: "Tablet" },
    { id: "mobile" as const, icon: Smartphone, label: "Mobile" },
  ];

  return (
    <div className="flex flex-col flex-shrink-0 border-b border-white/10 bg-zinc-950 z-20">
      {/* Row 1 — brand + identity + undo/redo + mobile panel toggles */}
      <div className="flex h-11 items-center justify-between gap-2 px-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/admin/dashboard"
            aria-label="Back to Dashboard"
            className="shrink-0 rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/admin/dashboard"
            className="hidden sm:inline shrink-0 text-sm font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent font-display hover:opacity-80 transition-opacity"
          >
            CreatorStore
          </Link>
          <span className="hidden md:inline h-4 w-px bg-white/10 shrink-0" />
          <span className="truncate text-xs text-zinc-300 font-medium">{creatorName}</span>
          <span className="hidden lg:inline h-4 w-px bg-white/10 shrink-0" />
          <span className="hidden lg:inline truncate text-[11px] text-zinc-600">{themeName ?? "No theme"}</span>
          <span className="hidden xl:inline text-zinc-800 text-[10px]">·</span>
          <span className="hidden xl:inline truncate text-[11px] text-zinc-600">{blueprintName ?? "—"}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile-only panel access — mirrors the bottom bar without duplicating actions. */}
          {onOpenSections && onOpenProperties && (
            <div className="flex items-center gap-0.5 lg:hidden">
              <button
                onClick={onOpenSections}
                aria-pressed={mobilePanel === "sections"}
                aria-label="Toggle sections panel"
                className={cn("rounded p-1 transition-colors", mobilePanel === "sections" ? "text-indigo-400 bg-white/5" : "text-zinc-500 hover:text-zinc-300")}
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onOpenProperties}
                aria-pressed={mobilePanel === "properties"}
                aria-label="Toggle properties panel"
                className={cn("rounded p-1 transition-colors", mobilePanel === "properties" ? "text-indigo-400 bg-white/5" : "text-zinc-500 hover:text-zinc-300")}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <span className="hidden sm:inline h-4 w-px bg-white/10 shrink-0" />
          <CompletionBadge pct={completionPct} />
          <span className="h-4 w-px bg-white/10 shrink-0" />
          <button
            onClick={() => builderCommands.undo()}
            disabled={!history.canUndo}
            aria-label="Undo"
            title="Undo"
            className={cn("rounded p-1 transition-colors", history.canUndo ? "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200" : "text-zinc-700")}
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => builderCommands.redo()}
            disabled={!history.canRedo}
            aria-label="Redo"
            title="Redo"
            className={cn("rounded p-1 transition-colors", history.canRedo ? "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200" : "text-zinc-700")}
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Row 2 — device switch + preview + view live + save (wraps on narrow screens) */}
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-white/5 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-zinc-800/50 p-0.5">
            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => onDeviceChange(d.id)}
                aria-pressed={device === d.id}
                aria-label={`${d.label} preview`}
                className={cn("rounded-md px-1.5 py-0.5 transition-colors", device === d.id ? "bg-indigo-500/20 text-indigo-300" : "text-zinc-600 hover:text-zinc-400")}
              >
                <d.icon className="h-3 w-3" />
              </button>
            ))}
          </div>
          <span className="h-4 w-px bg-white/5" />
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
            <span className="hidden sm:inline">View Live</span>
            <span className="sm:hidden">Live</span>
          </Link>
          <span className="h-4 w-px bg-white/5" />
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
            {saving ? "Saving..." : "Save"}
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
    <div className="flex items-center gap-0.5 rounded-lg bg-zinc-800/50 p-0.5">
      {items.map((item) => (
        <span
          key={item.id}
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors",
            current === item.id
              ? item.id === "live" ? "bg-emerald-500/20 text-emerald-400" : item.id === "preview" ? "bg-indigo-500/20 text-indigo-300" : "bg-zinc-700 text-zinc-300"
              : "text-zinc-600"
          )}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
