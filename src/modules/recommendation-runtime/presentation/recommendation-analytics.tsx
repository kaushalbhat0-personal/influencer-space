"use client";

import type { RecommendationAnalytics } from "../domain/types";
import { FeaturePage } from "@/features/_shared/components/feature-page";

export function RecommendationAnalyticsView({ analytics }: { analytics: RecommendationAnalytics }) {
  const sortedBySuggested = [...analytics.perRecommendation].sort((a, b) => b.suggested - a.suggested);
  const mostCompleted = [...analytics.perRecommendation].sort((a, b) => b.completed - a.completed)[0];
  const leastCompleted = [...analytics.perRecommendation]
    .filter((r) => r.suggested > 0)
    .sort((a, b) => a.completionRate - b.completionRate)[0];

  const knowledgeLift = Math.round(
    analytics.perRecommendation.filter((r) => r.completed > 0).reduce((sum, r) => sum + r.expectedLift.knowledge, 0),
  );
  const goalLift = Math.round(
    analytics.perRecommendation.filter((r) => r.completed > 0).reduce((sum, r) => sum + r.expectedLift.goalAlignment, 0),
  );
  const storefrontLift = Math.round(
    analytics.perRecommendation.filter((r) => r.completed > 0).reduce((sum, r) => sum + r.expectedLift.storefront, 0),
  );

  return (
    <FeaturePage
      title="Recommendation Analytics"
      description="How creators engage with the Recommendation Runtime across the platform."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Suggestions shown", value: analytics.totals.suggested },
          { label: "Completed", value: analytics.totals.completed },
          { label: "Dismissed", value: analytics.totals.dismissed },
          { label: "Creators using it", value: analytics.totals.creatorsWithRecommendations },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Most suggested</p>
          <p className="mt-1 text-sm font-medium text-white">{sortedBySuggested[0]?.title ?? "—"}</p>
          <p className="text-xs text-zinc-600">{sortedBySuggested[0]?.suggested ?? 0} shown</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Most completed</p>
          <p className="mt-1 text-sm font-medium text-white">{mostCompleted?.title ?? "—"}</p>
          <p className="text-xs text-zinc-600">{mostCompleted?.completed ?? 0} completed</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Least completed</p>
          <p className="mt-1 text-sm font-medium text-white">{leastCompleted?.title ?? "—"}</p>
          <p className="text-xs text-zinc-600">{leastCompleted?.completionRate ?? 0}% completion</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Knowledge lift (completed)", value: knowledgeLift },
          { label: "Goal alignment lift (completed)", value: goalLift },
          { label: "Storefront lift (completed)", value: storefrontLift },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
            <p className="text-xl font-bold text-emerald-400">+{stat.value}%</p>
            <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Per recommendation</p>
        <div className="space-y-1">
          {analytics.perRecommendation.map((rec) => (
            <div key={rec.id} className="grid grid-cols-2 gap-2 rounded-lg px-2 py-2 text-xs hover:bg-white/5 sm:grid-cols-6 items-center">
              <span className="col-span-2 font-medium text-zinc-200">{rec.title}</span>
              <span className="text-zinc-500">Suggested <b className="text-zinc-300">{rec.suggested}</b></span>
              <span className="text-zinc-500">Completed <b className="text-emerald-400">{rec.completed}</b></span>
              <span className="text-zinc-500">Rate <b className="text-zinc-300">{rec.completionRate}%</b></span>
              <span className="text-zinc-500">
                Avg <b className="text-zinc-300">{rec.avgCompletionMinutes !== null ? `${rec.avgCompletionMinutes}m` : "—"}</b>
              </span>
            </div>
          ))}
        </div>
      </div>
    </FeaturePage>
  );
}
