"use client";

import { useState } from "react";
import { GripVertical, Copy, Trash2, Plus } from "lucide-react";
import { builderEditor } from "@/lib/builder/commands/editor";
import type { SectionId, PageId } from "@/lib/builder/types";

export function SectionActions({
  sectionId,
  pageId,
  sectionName,
}: {
  sectionId: SectionId;
  pageId?: PageId;
  sectionName?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {visible && (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-0.5">
          {/* Drag Handle */}
          <div
            className="flex cursor-grab items-center justify-center rounded-md bg-zinc-800 p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          {/* Duplicate */}
          <button
            onClick={() => builderEditor.duplicateSection(sectionId, pageId)}
            className="flex items-center justify-center rounded-md bg-zinc-800 p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
            title="Duplicate section"
          >
            <Copy className="h-3 w-3" />
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              if (confirm(`Delete "${sectionName || "this section"}"?`)) {
                builderEditor.deleteSection(sectionId, pageId);
              }
            }}
            className="flex items-center justify-center rounded-md bg-zinc-800 p-1 text-zinc-500 hover:bg-red-500/20 hover:text-red-400"
            title="Delete section"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Section name label */}
      {visible && (
        <div className="absolute -top-3 left-0 z-20 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500 uppercase tracking-wider">
          {sectionName || "Section"}
        </div>
      )}
    </div>
  );
}

/** Drop zone indicator between sections — shows a + button to add components. */
export function SectionDropZone() {
  const [hover, setHover] = useState(false);

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-200 ${
        hover ? "h-8" : "h-2"
      }`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={`absolute inset-x-0 h-0.5 transition-colors ${hover ? "bg-s8ul-cyan/40" : "bg-white/5"}`} />
      {hover && (
        <button
          className="absolute z-10 flex items-center gap-1 rounded-full bg-s8ul-cyan px-2 py-0.5 text-[9px] font-semibold text-black shadow-lg hover:opacity-90"
          title="Add component"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      )}
    </div>
  );
}
