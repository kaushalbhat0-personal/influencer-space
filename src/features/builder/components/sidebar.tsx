"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { memo } from "react";
import { SectionManager } from "./section-manager";
import type { WebsiteAggregate } from "@/types/snapshot";

export const BuilderSidebar = memo(function BuilderSidebar({
  collapsed,
  onToggle,
  aggregate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  /** Website Aggregate shared with the canvas — canonical source for counts. */
  aggregate?: WebsiteAggregate | null;
}) {
  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-2 py-2">
        <button onClick={onToggle} className="rounded p-1 text-zinc-600 hover:text-indigo-400 hover:bg-white/5" title="Expand sections" aria-label="Expand sections rail">
          <PanelRightOpen className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Sections</span>
        <button onClick={onToggle} className="rounded p-0.5 text-zinc-600 hover:text-indigo-400 hover:bg-white/5" aria-label="Collapse sections rail">
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SectionManager aggregate={aggregate} />
      </div>
    </div>
  );
});
