"use client";

import Link from "next/link";
import { Monitor, Tablet, Smartphone, Upload, Undo, Redo, Layers, Settings2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderCanvas } from "@/lib/builder/types";
import { builderCommands } from "@/lib/builder/commands";
import { builderQuery } from "@/lib/builder/query";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { CompletionBadge } from "./completion-badge";
import { ContextualHelp } from "@/components/guidance/ContextualHelp";

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
      {/* Row 1 — single ~44px primary row at 390; compact device + save collapsed into Row 1 at <md */}
      <div className="flex h-11 items-center justify-between gap-1.5 px-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            href="/admin/dashboard"
            aria-label="Back to Dashboard"
            className="shrink-0 rounded-[var(--radius-control)] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-zinc-200 transition-colors lg:min-h-0 lg:min-w-0 lg:p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/admin/dashboard"
            className="hidden sm:inline shrink-0 text-sm font-bold text-[var(--text-primary)] font-display hover:text-[var(--text-secondary)] transition-colors"
          >
            CreatorStore
          </Link>
          <span className="truncate text-xs text-zinc-300 font-medium max-w-[90px] sm:max-w-none">{creatorName}</span>
          <span className="hidden lg:inline h-4 w-px bg-white/10 shrink-0" />
          <span className="hidden lg:inline truncate text-[11px] text-zinc-600">{themeName ?? "No theme"}</span>
          {/* Compact device segmented control — visible at <md, hidden at md+ where Row 2 shows it */}
          <div className="flex items-center gap-0.5 rounded-[var(--radius-control)] bg-zinc-800/50 p-0.5 md:hidden">
            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => onDeviceChange(d.id)}
                aria-pressed={device === d.id}
                aria-label={`${d.label} preview`}
                className={cn("rounded-[var(--radius-control)] min-h-[44px] min-w-[44px] flex items-center justify-center px-2 py-1 transition-colors border md:min-h-[32px] md:min-w-[32px]", device === d.id ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border)]" : "text-zinc-500 hover:text-zinc-300 border-transparent")}
              >
                <d.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile-only panel access */}
          {onOpenSections && onOpenProperties && (
            <div className="flex items-center gap-0.5 lg:hidden">
              <button
                onClick={onOpenSections}
                aria-pressed={mobilePanel === "sections"}
                aria-label="Toggle sections panel"
                className={cn("rounded-[var(--radius-control)] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors lg:min-h-0 lg:min-w-0 lg:p-1", mobilePanel === "sections" ? "text-[var(--text-primary)] bg-[var(--surface-hover)]" : "text-zinc-500 hover:text-zinc-300")}
              >
                <Layers className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onOpenProperties}
                aria-pressed={mobilePanel === "properties"}
                aria-label="Toggle properties panel"
                className={cn("rounded-[var(--radius-control)] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors lg:min-h-0 lg:min-w-0 lg:p-1", mobilePanel === "properties" ? "text-[var(--text-primary)] bg-[var(--surface-hover)]" : "text-zinc-500 hover:text-zinc-300")}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <span className="hidden sm:inline h-4 w-px bg-white/10 shrink-0" />
          <CompletionBadge pct={completionPct} />
          <span className="hidden sm:inline h-4 w-px bg-white/10 shrink-0" />
          <button
            onClick={() => builderCommands.undo()}
            disabled={!history.canUndo}
            aria-label="Undo"
            title="Undo"
            className={cn("rounded-[var(--radius-control)] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors lg:min-h-0 lg:min-w-0 lg:p-1", history.canUndo ? "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200" : "text-zinc-700")}
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => builderCommands.redo()}
            disabled={!history.canRedo}
            aria-label="Redo"
            title="Redo"
            className={cn("rounded-[var(--radius-control)] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors lg:min-h-0 lg:min-w-0 lg:p-1", history.canRedo ? "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200" : "text-zinc-700")}
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
          {/* Compact Save — icon-only at <md to save width, full label at md+ is in Row 2 */}
          <button
            onClick={onSave}
            disabled={saving}
            aria-label="Save draft"
            className="flex md:hidden items-center justify-center rounded-[var(--radius-control)] min-h-[44px] min-w-[44px] bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          >
            {saving ? <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <Upload className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Row 2 — hidden at <md to keep 44px chrome at 390; visible at md+ for full controls */}
      <div className="hidden md:flex min-h-10 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-white/5 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-[var(--radius-control)] bg-zinc-800/50 p-0.5">
            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => onDeviceChange(d.id)}
                aria-pressed={device === d.id}
                aria-label={`${d.label} preview — ${d.id === "mobile" ? "375 pixels" : d.id === "tablet" ? "768 pixels" : "1200 pixels"}`}
                className={cn("rounded-[var(--radius-control)] min-h-[32px] min-w-[32px] flex items-center justify-center px-2 py-1 transition-colors border", device === d.id ? "bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border)]" : "text-zinc-600 hover:text-zinc-400 border-transparent")}
              >
                <d.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <span className="h-4 w-px bg-white/5" />
          <PreviewDraftToggle status={publishStatus} />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onSave}
            disabled={saving}
            data-testid="toolbar-save-draft"
            aria-label="Save draft"
            className="flex items-center gap-1 rounded-[var(--radius-control)] bg-[var(--surface-hover)] border border-[var(--border)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          >
            {saving ? (
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <ContextualHelp text="Save your latest changes without making them public." label="About Save Draft" />
        </div>
      </div>
    </div>
  );
}

function PreviewDraftToggle({ status }: { status: PublishStatusValue }) {
  const current = status === "published" || status === "outdated" ? "live" : status === "preview" ? "preview" : "draft";
  const label = current === "live" ? "Published — live to visitors" : current === "preview" ? "Preview — not yet published" : "Draft — save to keep changes";
  const hint = current === "live" ? "Your changes are public" : "Save your draft, then publish from your dashboard to go live";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Website status: ${label}`}
      title={hint}
      className={cn(
        "rounded-md px-2 py-0.5 text-[10px] font-medium ring-1",
        current === "live" ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30" : current === "preview" ? "bg-[var(--surface-hover)] text-[var(--text-secondary)] ring-[var(--border)]" : "bg-zinc-700 text-zinc-200 ring-white/10"
      )}
    >
      {current === "live" ? "Live" : current === "preview" ? "Preview" : "Draft"} <span className="hidden sm:inline font-normal opacity-80">— {current === "live" ? "public" : "save, then publish"}</span>
    </div>
  );
}
