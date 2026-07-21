"use client";

import { useState, useCallback } from "react";
import { builderStore } from "@/lib/builder/store";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";

interface SectionManagerProps {
  className?: string;
}

const DEFAULT_SECTIONS = [
  "Hero", "About", "Products", "Gallery", "Timeline",
  "Testimonials", "FAQ", "Newsletter", "Contact", "Footer",
];

export function SectionManager({ className }: SectionManagerProps) {
  const [sections, setSections] = useState(() => {
    const canvas = builderStore.canvas;
    const page = canvas.pages.find((p) => p.id === canvas.activePageId);
    return page?.sections ?? [];
  });

  const refresh = useCallback(() => {
    const canvas = builderStore.canvas;
    const page = canvas.pages.find((p) => p.id === canvas.activePageId);
    setSections(page?.sections ?? []);
  }, []);

  const addSection = useCallback((name: string) => {
    builderStore.addSection(name);
    refresh();
  }, [refresh]);

  const removeSection = useCallback((id: string) => {
    builderStore.removeElement(id);
    refresh();
  }, [refresh]);

  const moveSection = useCallback((id: string, direction: "up" | "down") => {
    const canvas = builderStore.canvas;
    const page = canvas.pages.find((p) => p.id === canvas.activePageId);
    if (!page) return;
    const idx = page.sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? Math.max(0, idx - 1) : Math.min(page.sections.length - 1, idx + 1);
    if (newIdx === idx) return;
    const reordered = [...page.sections];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved!);
    page.sections = reordered.map((s, i) => ({ ...s, order: i }));
    builderStore.select(id);
    refresh();
  }, [refresh]);

  const toggleVisibility = useCallback((id: string) => {
    const section = sections.find((s) => s.id === id);
    if (section) {
      section.visible = !section.visible;
      refresh();
    }
  }, [sections, refresh]);

  const handleSelect = useCallback((id: string) => {
    builderStore.select(id);
  }, []);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sections</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sections.map((section) => (
          <div
            key={section.id}
            onClick={() => handleSelect(section.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors group text-sm",
              builderStore.isSelected(section.id)
                ? "bg-s8ul-cyan/10 text-s8ul-cyan"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
          >
            <GripVertical className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            <span className="flex-1 truncate">{section.name}</span>
            <span className="text-[10px] text-zinc-600">{section.slots.length} blocks</span>
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); moveSection(section.id, "up"); }}
                className="p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
                aria-label="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); moveSection(section.id, "down"); }}
                className="p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
                aria-label="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleVisibility(section.id); }}
                className="p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300"
                aria-label={section.visible ? "Hide section" : "Show section"}
              >
                {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                className="p-0.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400"
                aria-label="Remove section"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-2 space-y-1">
        <p className="px-2 text-[10px] font-medium uppercase text-zinc-600">Add Section</p>
        {DEFAULT_SECTIONS.map((name) => (
          <button
            key={name}
            onClick={() => addSection(name)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"
          >
            <Plus className="h-3 w-3" />
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
