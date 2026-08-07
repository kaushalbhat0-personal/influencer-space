"use client";

import { Layers, Globe2, Target, HeartPulse } from "lucide-react";
import type { ExperienceAnalyticsReport } from "../application/analytics";
import { FeaturePage } from "@/features/_shared/components/feature-page";

export function ExperienceAnalyticsView({ report }: { report: ExperienceAnalyticsReport }) {
  return (
    <FeaturePage
      title="Experience Intelligence"
      description="Platform-wide experience, industry and goal distribution from existing data."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-s8ul-cyan" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Experiences used</p>
          </div>
          <div className="mt-3 space-y-1">
            {report.experiences.map((e) => (
              <div key={e.experience} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{e.experience}</span>
                <span className="text-zinc-500">{e.count}</span>
              </div>
            ))}
            {report.experiences.length === 0 && <p className="text-xs text-zinc-600">No websites yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-emerald-400" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Industries</p>
          </div>
          <div className="mt-3 space-y-1">
            {report.industries.map((e) => (
              <div key={e.industry} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{e.industry}</span>
                <span className="text-zinc-500">{e.count}</span>
              </div>
            ))}
            {report.industries.length === 0 && <p className="text-xs text-zinc-600">No industries yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-400" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Primary goals</p>
          </div>
          <div className="mt-3 space-y-1">
            {report.goals.map((e) => (
              <div key={e.goal} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{e.goal.replace(/_/g, " ")}</span>
                <span className="text-zinc-500">{e.count}</span>
              </div>
            ))}
            {report.goals.length === 0 && <p className="text-xs text-zinc-600">No goals set yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-emerald-400" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Business Health</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{report.health.average}%</p>
          <p className="text-xs text-zinc-600">{report.health.tracked} creators tracked</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Health by experience</p>
          <div className="mt-3 space-y-1">
            {report.byExperienceHealth.map((e) => (
              <div key={e.experience} className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">{e.experience}</span>
                <span className="text-zinc-500">{e.average}% ({e.count})</span>
              </div>
            ))}
            {report.byExperienceHealth.length === 0 && <p className="text-xs text-zinc-600">No tracked health yet.</p>}
          </div>
        </div>
      </div>
    </FeaturePage>
  );
}
