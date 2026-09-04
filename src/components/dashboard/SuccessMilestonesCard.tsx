"use client";

import Link from "next/link";
import { Trophy, ArrowUpRight } from "lucide-react";

export interface SuccessMilestoneView {
  id: string;
  label: string;
  action: string;
  href: string;
  done: boolean;
  category: string;
}

interface Props {
  success: {
    completionPercent: number;
    completedMilestones: number;
    totalMilestones: number;
    milestones: SuccessMilestoneView[];
    nextTask: SuccessMilestoneView | null;
  } | null;
}

export function SuccessMilestonesCard({ success }: Props) {
  if (!success) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Progress</p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">Loading your milestones…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Progress</p>
        </div>
        <span className="text-2xl font-bold font-display text-amber-400">{success.completionPercent}%</span>
      </div>
      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
        {success.completedMilestones} of {success.totalMilestones} milestones
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${success.completionPercent}%` }}
        />
      </div>

      <div className="mt-4 space-y-1">
        {success.milestones.slice(0, 5).map((milestone) => (
          <Link
            key={milestone.id}
            href={milestone.href || "/admin/dashboard"}
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5 transition-colors"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${milestone.done ? "bg-emerald-500" : "border border-zinc-600"}`}
            />
            <span className={`flex-1 truncate ${milestone.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"}`}>
              {milestone.label}
            </span>
            {!milestone.done && <ArrowUpRight className="h-3 w-3 text-[var(--text-muted)] group-hover:text-amber-400" />}
          </Link>
        ))}
      </div>

      {success.nextTask && !success.nextTask.done && (
        <Link
          href={success.nextTask.href || "/admin/dashboard"}
          className="mt-4 flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
        >
          Next: {success.nextTask.label}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
