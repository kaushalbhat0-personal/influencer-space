"use client";

import { Target } from "lucide-react";

function barColor(percent: number): string {
  if (percent >= 80) return "bg-emerald-500";
  if (percent >= 60) return "bg-s8ul-cyan";
  if (percent >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export interface GoalAlignmentViewItem {
  goalId: string;
  label: string;
  weight: number;
  supported: number;
  total: number;
  percent: number;
}

export function GoalAlignmentCard({ alignment }: {
  alignment: { items: GoalAlignmentViewItem[]; overall: number };
}) {
  if (alignment.items.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 text-sm text-zinc-400">
        No goals selected — set business goals on the Goals page to unlock Goal Alignment.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Goal Alignment</p>
        <span className="text-2xl font-bold font-display text-s8ul-cyan">{alignment.overall}%</span>
      </div>
      <p className="mt-0.5 text-[11px] text-zinc-600">
        How well your storefront supports your selected goals
      </p>

      <div className="mt-4 space-y-3">
        {alignment.items.map((item) => {
          return (
            <div key={item.goalId}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Target className="h-3 w-3 text-s8ul-cyan" />
                  {item.label}
                  <span className="text-zinc-600">· {item.weight}%</span>
                </span>
                <span className="text-xs font-semibold text-zinc-300">{item.percent}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${barColor(item.percent)} transition-all duration-500`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-600">{item.supported}/{item.total} supporting fields complete</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
