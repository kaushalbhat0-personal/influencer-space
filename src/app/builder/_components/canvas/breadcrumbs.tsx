"use client";

import { ChevronRight, Home } from "lucide-react";
import { builderQuery } from "@/lib/builder/query";

export function BuilderBreadcrumbs() {
  const selection = builderQuery.getSelection();
  const sel = builderQuery.getSelectedNode();
  const page = builderQuery.getCurrentPage();

  const parts: { label: string; action?: () => void }[] = [];
  if (page) parts.push({ label: page.name, action: undefined });
  if (sel.section) parts.push({ label: sel.section.name, action: undefined });
  if (sel.slot) parts.push({ label: sel.slot.moduleId.split(".").pop() || sel.slot.id, action: undefined });

  return (
    <div className="flex items-center gap-1 border-b border-white/5 bg-zinc-950/80 px-3 py-1.5">
      <Home className="h-3 w-3 text-zinc-600" />
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-zinc-700" />
          <span className="text-[10px] text-zinc-500">{p.label}</span>
        </span>
      ))}
      {selection.count > 0 && (
        <span className="ml-auto text-[10px] text-zinc-600">{selection.count} selected</span>
      )}
    </div>
  );
}
