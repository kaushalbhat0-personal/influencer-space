"use client";

import { useSyncExternalStore } from "react";
import { builderStore } from "@/lib/builder/store";
import { builderEvents } from "@/lib/builder/events";
import type { SectionPresentation } from "@/modules/section-presentation";
import { RegistryFieldInspector } from "./registry-field-inspector";

const inputCls = "admin-input px-2.5 py-1.5 text-xs";

/** RCCF-LAUNCH-TRACK-04 — Section Presentation panel. Edits the selected slot's
 * presentation metadata (title, description, hide title, visibility, hide when
 * empty). Presentation only — canonical section ids and business logic are
 * untouched. */
export function SectionPresentationPanel() {
  const subscribe = (cb: () => void) => builderEvents.subscribe("store:changed", () => cb());
  useSyncExternalStore(subscribe, () => builderStore.getSelectedSlot()?.id ?? "");

  const slot = builderStore.getSelectedSlot();
  if (!slot) return null;

  const p = (slot.config.presentation as SectionPresentation | undefined) ?? {};
  const moduleId = slot.moduleId;

  const set = (patch: Partial<SectionPresentation>) => {
    builderStore.updateSlotPresentation(slot.id, patch as Record<string, unknown>);
  };

  const reset = (property?: keyof SectionPresentation) => {
    builderStore.resetSlotPresentation(slot.id, property);
  };

  const ResetButton = ({ property, show }: { property?: keyof SectionPresentation; show: boolean }) => {
    if (!show) return null;
    return (
      <button
        type="button"
        onClick={() => reset(property)}
        title="Reset to default"
        className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
      >
        Reset
      </button>
    );
  };

  return (
    <>
      <RegistryFieldInspector />
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Section Presentation</p>
          <p className="mt-0.5 truncate text-[10px] text-zinc-500">{moduleId}</p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          title="Reset all presentation to defaults"
          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          Reset all
        </button>
      </div>

      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-1">
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-zinc-400">
            Title
            <input className={inputCls} value={p.titleOverride ?? ""} onChange={(e) => set({ titleOverride: e.target.value || undefined })} placeholder="e.g. Courses, Portfolio, My Journey" />
          </label>
          <ResetButton property="titleOverride" show={p.titleOverride !== undefined} />
        </div>
        <div className="flex items-center gap-1">
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-zinc-400">
            Description
            <input className={inputCls} value={p.descriptionOverride ?? ""} onChange={(e) => set({ descriptionOverride: e.target.value || undefined })} placeholder="Optional one-line description" />
          </label>
          <ResetButton property="descriptionOverride" show={p.descriptionOverride !== undefined} />
        </div>

        <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-2">Visible <ResetButton property="visible" show={p.visible !== undefined} /></span>
          <input type="checkbox" checked={p.visible ?? true} onChange={(e) => set({ visible: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-zinc-900 accent-indigo-500" />
        </label>
        <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-2">Hide title <ResetButton property="hideTitle" show={p.hideTitle !== undefined} /></span>
          <input type="checkbox" checked={p.hideTitle ?? false} onChange={(e) => set({ hideTitle: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-zinc-900 accent-indigo-500" />
        </label>
        <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-2">Hide when empty <ResetButton property="hideWhenEmpty" show={p.hideWhenEmpty !== undefined} /></span>
          <input type="checkbox" checked={p.hideWhenEmpty ?? true} onChange={(e) => set({ hideWhenEmpty: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-zinc-900 accent-indigo-500" />
        </label>
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">Changes preview live in the canvas and appear after you publish. They never affect how your store is analysed.</p>
    </div>
    </>
  );
}
