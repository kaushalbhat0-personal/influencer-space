"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href: string;
}

interface ProgressChecklistProps {
  items: ChecklistItem[];
}

export function ProgressChecklist({ items }: ProgressChecklistProps) {
  const [dismissed] = useState<Set<string>>(new Set());
  const visible = items.filter((i) => !i.done && !dismissed.has(i.id));
  const completed = items.filter((i) => i.done).length;
  const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  if (visible.length === 0) return null;

  return (
    <div className="admin-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Getting Started</h3>
        <span className="text-xs text-zinc-500">{pct}% complete</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] mb-4 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1.5">
        {visible.slice(0, 5).map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/[0.04] group"
          >
            <div className="h-4 w-4 rounded-full border-2 border-zinc-700 flex-shrink-0 group-hover:border-indigo-500/50 transition-colors" />
            <span className="text-zinc-400 group-hover:text-zinc-200">{item.label}</span>
            <span className="ml-auto text-[10px] text-zinc-700">→</span>
          </a>
        ))}
      </div>
      {items.filter((i) => i.done).length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <p className="text-xs text-zinc-600 mb-1.5">{items.filter((i) => i.done).length} completed</p>
          <div className="flex flex-wrap gap-1">
            {items.filter((i) => i.done).map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5" /> {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
