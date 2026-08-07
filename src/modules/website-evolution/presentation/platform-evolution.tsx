"use client";

import { Sparkles, TrendingUp } from "lucide-react";
import type { PlatformEvolutionReport } from "../domain/types";
import { FeaturePage } from "@/features/_shared/components/feature-page";

export function PlatformEvolutionView({ report }: { report: PlatformEvolutionReport }) {
  return (
    <FeaturePage
      title="Website Evolution"
      description="Platform-wide evolution adoption and outcomes from creator-approved changes."
    >
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Opportunities detected", value: report.totals.detected },
          { label: "Applied", value: report.totals.applied },
          { label: "Rejected", value: report.totals.rejected },
          { label: "Deferred", value: report.totals.deferred },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Most adopted improvements
        </p>
        <div className="space-y-1">
          {report.perEvolution.map((evolution) => (
            <div key={evolution.id} className="grid grid-cols-2 gap-2 rounded-lg px-2 py-2 text-xs items-center hover:bg-white/5 sm:grid-cols-6">
              <span className="col-span-2 font-medium text-zinc-200">{evolution.title}</span>
              <span className="text-zinc-500">Applied <b className="text-emerald-400">{evolution.applied}</b></span>
              <span className="text-zinc-500">Rejected <b className="text-rose-400">{evolution.rejectionRate}%</b></span>
              <span className="text-zinc-500">Health <b className="text-amber-300">+{evolution.avgHealthLift}</b></span>
              <span className="text-zinc-500">Conversion <b className="text-s8ul-cyan">+{evolution.avgConversionLift}</b></span>
            </div>
          ))}
          {report.perEvolution.length === 0 && <p className="text-xs text-zinc-600">No evolution history yet.</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">By industry</p>
          <div className="space-y-1">
            {report.byIndustry.map((entry) => (
              <div key={entry.industry} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{entry.industry}</span>
                <span className="flex items-center gap-1 text-zinc-500">
                  <TrendingUp className="h-3 w-3 text-emerald-400" /> {entry.applied} applied · +{entry.avgHealthLift} health
                </span>
              </div>
            ))}
            {report.byIndustry.length === 0 && <p className="text-xs text-zinc-600">No industry data.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">By goal</p>
          <div className="space-y-1">
            {report.byGoal.map((entry) => (
              <div key={entry.goal} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{entry.goal.replace(/_/g, " ")}</span>
                <span className="text-zinc-500">{entry.applied} applied · +{entry.avgHealthLift} health</span>
              </div>
            ))}
            {report.byGoal.length === 0 && <p className="text-xs text-zinc-600">No goal data.</p>}
          </div>
        </div>
      </div>
    </FeaturePage>
  );
}
