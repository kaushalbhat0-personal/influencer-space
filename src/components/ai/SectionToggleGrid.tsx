"use client";

import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";

export interface SectionToggle {
  id: string;
  label: string;
  enabled: boolean;
  icon?: string;
}

interface SectionToggleGridProps {
  sections: SectionToggle[];
  onToggle: (sectionId: string) => void;
  title?: string;
  columns?: 2 | 3;
  className?: string;
}

export function SectionToggleGrid({
  sections,
  onToggle,
  title = "Sections",
  columns = 2,
  className,
}: SectionToggleGridProps) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        <h4 className="text-sm font-medium text-zinc-300">{title}</h4>
        <span className="text-xs text-zinc-600 ml-auto">
          {sections.filter((s) => s.enabled).length}/{sections.length}
        </span>
      </div>
      <div
        className={cn(
          "grid gap-2",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-2 sm:grid-cols-3"
        )}
        role="group"
        aria-label={title}
      >
        {sections.map((section) => (
          <label
            key={section.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-all duration-200",
              "focus-within:ring-2 focus-within:ring-s8ul-cyan/50",
              section.enabled
                ? "border-s8ul-cyan/50 bg-s8ul-cyan/10 text-s8ul-cyan"
                : "border-white/10 bg-white/5 text-zinc-500 hover:border-white/20"
            )}
          >
            <input
              type="checkbox"
              checked={section.enabled}
              onChange={() => onToggle(section.id)}
              className="sr-only"
            />
            <span
              className={cn(
                "flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                section.enabled
                  ? "border-s8ul-cyan bg-s8ul-cyan"
                  : "border-zinc-600 bg-transparent"
              )}
              aria-hidden="true"
            >
              {section.enabled && (
                <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="text-sm font-medium">{section.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
