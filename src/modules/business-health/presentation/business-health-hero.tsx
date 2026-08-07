"use client";

import { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Minus, Target, Trophy } from "lucide-react";
import type { BusinessHealth, HealthTrend } from "../domain/types";

const TREND_LABELS: Record<HealthTrend, string> = {
  improving: "improving",
  stable: "stable",
  declining: "declining",
  new: "just started",
};

function gradeColor(score: number): string {
  if (score >= 90) return "text-emerald-400";
  if (score >= 80) return "text-s8ul-cyan";
  if (score >= 70) return "text-amber-300";
  if (score >= 60) return "text-amber-500";
  return "text-rose-400";
}

function statusColor(status: string): string {
  if (status === "healthy") return "text-emerald-400";
  if (status === "warning") return "text-amber-400";
  return "text-rose-400";
}

export function BusinessHealthHero({ health, trend }: { health: BusinessHealth; trend: HealthTrend }) {
  const [expanded, setExpanded] = useState(false);
  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;

  return (
    <div className="rounded-xl border border-s8ul-cyan/25 bg-gradient-to-br from-s8ul-cyan/[0.08] to-emerald-500/[0.05] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Store Health</p>
          <div className="mt-1 flex items-end gap-3">
            <span className={`text-5xl font-bold font-display ${gradeColor(health.overallScore)}`}>
              {health.overallScore}%
            </span>
            <span className="mb-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-sm font-semibold text-white">
              Grade {health.grade}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
            <TrendIcon className="h-3.5 w-3.5" />
            {TREND_LABELS[trend]} this period
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="flex items-center gap-1 text-xs text-zinc-400">
                <Target className="h-3.5 w-3.5 text-s8ul-cyan" /> Recommended focus
              </p>
              <p className="text-sm font-medium text-white">{health.recommendedFocus}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right">
            <p className="flex items-center gap-1 text-xs text-zinc-400">
              <Trophy className="h-3.5 w-3.5 text-amber-400" /> Next milestone
            </p>
            <p className="text-sm font-semibold text-amber-300">{health.nextMilestone}%</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "Hide dimensions" : "Show dimension breakdown"}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {health.dimensions.filter((d) => d.weight > 0).map((dimension) => (
            <div key={dimension.id}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">{dimension.label}</span>
                <span className={`text-[11px] font-semibold ${statusColor(dimension.status)}`}>
                  {dimension.score}%
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-s8ul-cyan to-emerald-400"
                  style={{ width: `${dimension.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
