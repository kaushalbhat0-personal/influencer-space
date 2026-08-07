"use client";

import Link from "next/link";
import { ArrowUpRight, Target } from "lucide-react";
import type { GoalDashboardData } from "../domain/types";
import { goalIcon } from "./goal-icons";

export function GoalDashboardCard({ dashboard }: { dashboard: GoalDashboardData | null }) {
  if (!dashboard) {
    return (
      <Link
        href="/admin/goals"
        className="block rounded-xl border border-dashed border-white/15 bg-zinc-900/40 p-5 hover:border-s8ul-cyan/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-s8ul-cyan" />
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Business Goal</p>
        </div>
        <p className="mt-3 text-sm text-zinc-300">Set a business goal to guide your website, Builder and recommendations.</p>
        <p className="mt-3 text-xs text-s8ul-cyan">Choose your goals →</p>
      </Link>
    );
  }

  const PrimaryIcon = goalIcon(dashboard.primary.icon);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PrimaryIcon className="h-4 w-4 text-s8ul-cyan" />
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Business Goal</p>
        </div>
        <span className="rounded-full bg-s8ul-cyan/10 px-2 py-0.5 text-[10px] font-medium text-s8ul-cyan">
          {dashboard.primary.weight}%
        </span>
      </div>

      <p className="mt-2 text-sm font-medium text-white">{dashboard.primary.label}</p>
      <p className="text-[11px] text-zinc-500">Primary goal — {dashboard.primary.progress}% aligned</p>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-s8ul-cyan to-emerald-400 transition-all duration-500"
          style={{ width: `${dashboard.primary.progress}%` }}
        />
      </div>

      <div className="mt-4 space-y-1">
        {dashboard.primary.missing.slice(0, 3).map((field) => (
          <Link
            key={field.fieldId}
            href={field.href}
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span className="flex-1 truncate">{field.label}</span>
            <ArrowUpRight className="h-3 w-3 text-zinc-600 group-hover:text-s8ul-cyan" />
          </Link>
        ))}
        {dashboard.primary.missing.length === 0 && (
          <p className="rounded-lg bg-emerald-500/5 px-2 py-1.5 text-xs text-emerald-400">
            Everything supporting this goal is in place.
          </p>
        )}
      </div>

      {dashboard.primary.cta && (
        <Link
          href={dashboard.primary.cta.href}
          className="mt-4 flex items-center justify-between rounded-lg bg-s8ul-cyan px-3 py-2 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
        >
          {dashboard.primary.cta.label}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}

      {dashboard.secondary.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Also working on</p>
          <div className="space-y-1">
            {dashboard.secondary.map((goal) => (
              <div key={goal.goalId} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{goal.label}</span>
                <span className="text-zinc-600">{goal.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
