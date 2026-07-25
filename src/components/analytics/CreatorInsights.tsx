"use client";

import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartSkeleton } from "@/components/charts/ChartSkeleton";

interface CreatorInsightsProps {
  insights: string[];
  loading?: boolean;
}

export function CreatorInsights({ insights, loading }: CreatorInsightsProps) {
  if (loading) {
    return <ChartSkeleton rows={3} />;
  }

  if (insights.length === 0) {
    return (
      <div className="admin-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-s8ul-cyan" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Insights</h2>
        </div>
        <p className="text-sm text-zinc-500">No insights yet. Add more data to get actionable recommendations.</p>
      </div>
    );
  }

  return (
    <div className="admin-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-amber-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-white">Insights</h2>
        <span className="text-[10px] text-zinc-600 ml-auto">{insights.length} suggestions</span>
      </div>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              "text-zinc-300"
            )}
          >
            <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-s8ul-cyan mt-1.5" aria-hidden="true" />
            <p className="flex-1 leading-relaxed">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
