"use client";

import Link from "next/link";
import { HeartPulse, TrendingUp } from "lucide-react";
import type { PlatformHealthReport } from "../domain/types";
import { FeaturePage } from "@/features/_shared/components/feature-page";

export function PlatformHealthView({ report }: { report: PlatformHealthReport }) {
  return (
    <FeaturePage
      title="Business Health"
      description="Platform-wide Business Health from immutable health projections."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-emerald-400" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Average Health</p>
          </div>
          <p className="mt-1 text-3xl font-bold text-white">{report.average}%</p>
          <p className="text-xs text-zinc-600">{report.creators} creators tracked</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Distribution</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {report.distribution.map((d) => (
              <span key={d.grade} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300">
                {d.grade}: {d.count}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Dimension averages</p>
          <div className="mt-2 space-y-1">
            {report.dimensionAverages.slice(0, 6).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">{d.label}</span>
                <span className="text-zinc-300">{d.average}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Top 10 creators</p>
          <div className="space-y-1">
            {report.topTen.map((s) => (
              <TenantRow key={s.tenantId} snapshot={s} />
            ))}
            {report.topTen.length === 0 && <p className="text-xs text-zinc-600">No projections yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Fastest improvers</p>
          <div className="space-y-1">
            {report.fastestImprovers.map((s) => (
              <div key={s.tenantId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                <Link href={`/super-admin/tenants/${s.tenantId}`} className="flex-1 truncate text-zinc-300 hover:text-white">
                  {s.name}
                </Link>
                <span className="text-xs text-zinc-500">{s.overallScore}%</span>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400">
                  <TrendingUp className="h-3 w-3" /> +{s.delta}
                </span>
              </div>
            ))}
            {report.fastestImprovers.length === 0 && <p className="text-xs text-zinc-600">No trend data yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">By plan</p>
          <div className="space-y-1">
            {report.byPlan.map((p) => (
              <div key={p.plan} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{p.plan}</span>
                <span className="text-zinc-300">{p.average}% <span className="text-zinc-600">({p.count})</span></span>
              </div>
            ))}
            {report.byPlan.length === 0 && <p className="text-xs text-zinc-600">No plan data.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">By industry</p>
          <div className="space-y-1">
            {report.byIndustry.map((p) => (
              <div key={p.industry} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{p.industry}</span>
                <span className="text-zinc-300">{p.average}% <span className="text-zinc-600">({p.count})</span></span>
              </div>
            ))}
            {report.byIndustry.length === 0 && <p className="text-xs text-zinc-600">No industry data.</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Lowest health</p>
        <div className="space-y-1">
          {report.lowestTen.map((s) => <TenantRow key={s.tenantId} snapshot={s} />)}
          {report.lowestTen.length === 0 && <p className="text-xs text-zinc-600">No projections yet.</p>}
        </div>
      </div>
    </FeaturePage>
  );
}

function TenantRow({ snapshot }: { snapshot: { tenantId: string; name: string; overallScore: number; grade: string; plan: string | null; industry: string | null } }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
      <Link href={`/super-admin/tenants/${snapshot.tenantId}`} className="flex-1 truncate text-zinc-300 hover:text-white">
        {snapshot.name}
      </Link>
      <span className="text-[10px] text-zinc-600">{snapshot.industry ?? "—"}</span>
      <span className="text-[10px] text-zinc-600">{snapshot.plan ?? "—"}</span>
      <span className="text-xs font-semibold text-white">{snapshot.overallScore}%</span>
      <span className="text-[10px] text-zinc-500">{snapshot.grade}</span>
    </div>
  );
}
