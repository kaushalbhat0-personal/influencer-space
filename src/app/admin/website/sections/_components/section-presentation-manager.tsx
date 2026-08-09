"use client";

import { useState } from "react";
import { updateSectionPresentation, resetSectionPresentation } from "@/actions/section-presentation.actions";
import type { SectionPresentation } from "@/modules/section-presentation";
import { Pencil, RotateCcw, ChevronUp } from "lucide-react";

interface BlockRow {
  id: string;
  moduleId: string;
  displayName: string;
  order: number;
  visible: boolean;
  presentation: SectionPresentation | null;
}

interface SectionRow {
  id: string;
  name: string;
  order: number;
  blocks: BlockRow[];
}

interface PageRow {
  id: string;
  name: string;
  slug: string;
  isHome: boolean;
  sections: SectionRow[];
}

const inputCls = "rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-white placeholder-zinc-600";

/** RCCF-IMPLEMENTATION-09B (Phase 1) — creator-facing section presentation
 *  editor OUTSIDE the Builder. Edits the same `Block.config.presentation`
 *  shape the Builder panel writes; presentation-only, canonical ids untouched. */
export function SectionPresentationManager({ initialPages }: { initialPages: PageRow[] }) {
  const [pages, setPages] = useState<PageRow[]>(initialPages);
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const allBlocks = pages.flatMap((p) => p.sections.flatMap((s) => s.blocks));
  if (allBlocks.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-500">No sections yet. Open the Builder to add sections to your pages.</p>
      </div>
    );
  }

  const setPresentation = (blockId: string, patch: Partial<SectionPresentation>) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        sections: p.sections.map((s) => ({
          ...s,
          blocks: s.blocks.map((b) =>
            b.id === blockId
              ? { ...b, presentation: { ...(b.presentation ?? {}), ...patch } }
              : b,
          ),
        })),
      })),
    );
  };

  const handleUpdate = async (block: BlockRow, patch: Partial<SectionPresentation>) => {
    setBusy(block.id);
    setMessage(null);
    setPresentation(block.id, patch);
    const result = await updateSectionPresentation(block.id, patch as Record<string, unknown>);
    setBusy(null);
    if (!result.success) {
      setMessage({ id: block.id, text: result.error ?? "Failed to save", ok: false });
    } else {
      setMessage({ id: block.id, text: "Saved", ok: true });
    }
  };

  const handleReset = async (block: BlockRow, property?: keyof SectionPresentation) => {
    setBusy(block.id);
    setMessage(null);
    const result = await resetSectionPresentation(block.id, property);
    setBusy(null);
    if (result.success) {
      if (property) {
        setPresentation(block.id, { [property]: undefined });
      } else {
        setPages((prev) =>
          prev.map((p) => ({
            ...p,
            sections: p.sections.map((s) => ({
              ...s,
              blocks: s.blocks.map((b) => (b.id === block.id ? { ...b, presentation: null } : b)),
            })),
          })),
        );
      }
      setMessage({ id: block.id, text: "Reset", ok: true });
    } else {
      setMessage({ id: block.id, text: result.error ?? "Failed to reset", ok: false });
    }
  };

  const editor = (block: BlockRow) => {
    const p = block.presentation ?? {};
    const ResetButton = ({ property, show }: { property?: keyof SectionPresentation; show: boolean }) =>
      show ? (
        <button
          type="button"
          onClick={() => handleReset(block, property)}
          title="Reset to default"
          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          Reset
        </button>
      ) : null;

    return (
      <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-zinc-900/60 p-3">
        <div className="flex items-center gap-1">
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-zinc-400">
            Title
            <input
              className={inputCls}
              value={p.titleOverride ?? ""}
              onChange={(e) => handleUpdate(block, { titleOverride: e.target.value || undefined })}
              placeholder="e.g. Menu, Portfolio, My Journey"
            />
          </label>
          <ResetButton property="titleOverride" show={p.titleOverride !== undefined} />
        </div>
        <div className="flex items-center gap-1">
          <label className="flex flex-1 flex-col gap-1 text-[11px] text-zinc-400">
            Description
            <input
              className={inputCls}
              value={p.descriptionOverride ?? ""}
              onChange={(e) => handleUpdate(block, { descriptionOverride: e.target.value || undefined })}
              placeholder="Optional one-line description"
            />
          </label>
          <ResetButton property="descriptionOverride" show={p.descriptionOverride !== undefined} />
        </div>

        <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-2">Visible <ResetButton property="visible" show={p.visible !== undefined} /></span>
          <input
            type="checkbox"
            checked={p.visible ?? true}
            onChange={(e) => handleUpdate(block, { visible: e.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-zinc-900"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-2">Hide title <ResetButton property="hideTitle" show={p.hideTitle !== undefined} /></span>
          <input
            type="checkbox"
            checked={p.hideTitle ?? false}
            onChange={(e) => handleUpdate(block, { hideTitle: e.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-zinc-900"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-2">Hide when empty <ResetButton property="hideWhenEmpty" show={p.hideWhenEmpty !== undefined} /></span>
          <input
            type="checkbox"
            checked={p.hideWhenEmpty ?? true}
            onChange={(e) => handleUpdate(block, { hideWhenEmpty: e.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-zinc-900"
          />
        </label>

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-zinc-600">
            {busy === block.id ? "Saving…" : message?.id === block.id ? (
              <span className={message.ok ? "text-emerald-400" : "text-red-400"}>{message.text}</span>
            ) : (
              "Changes appear after you publish."
            )}
          </p>
          {Object.keys(p).length > 0 && (
            <button
              type="button"
              onClick={() => handleReset(block)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <RotateCcw className="h-3 w-3" />
              Reset all
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {pages.map((page) => (
        <div key={page.id} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white">{page.name}</h3>
            {page.isHome && <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-400">Home</span>}
            <span className="text-xs text-zinc-500">{page.slug}</span>
          </div>
          <div className="mt-3 space-y-2">
            {page.sections.map((section) => (
              <div key={section.id} className="rounded-lg border border-white/5 bg-zinc-900/40 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{section.name}</p>
                <div className="mt-2 space-y-2">
                  {section.blocks.map((block) => {
                    const open = openBlockId === block.id;
                    return (
                      <div key={block.id} className="rounded-lg border border-white/10 bg-zinc-900/70 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-200">{block.displayName}</span>
                            {block.presentation?.titleOverride && (
                              <span className="rounded-full bg-s8ul-cyan/10 px-2 py-0.5 text-[10px] font-medium text-s8ul-cyan">
                                {block.presentation.titleOverride}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setOpenBlockId(open ? null : block.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                          >
                            {open ? <ChevronUp className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                            {open ? "Close" : "Edit Heading"}
                          </button>
                        </div>
                        {open && editor(block)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
