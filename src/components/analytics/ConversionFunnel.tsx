"use client";

import { cn } from "@/lib/utils";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import type { ConversionStats } from "@/lib/analytics/types";

interface ConversionFunnelProps {
  data: ConversionStats | null;
  loading?: boolean;
  error?: string | null;
}

export function ConversionFunnel({ data, loading, error }: ConversionFunnelProps) {
  const empty = !data || data.funnel.length === 0 || data.funnel.every((s) => s.count === 0);

  if (empty && !loading && !error) {
    return (
      <ChartWrapper title="Conversion Funnel" empty emptyMessage="Insufficient data to build a conversion funnel. Start selling to see this chart.">
        <div />
      </ChartWrapper>
    );
  }

  return (
    <ChartWrapper title="Conversion Funnel" description="Visitor to purchase drop-off" loading={loading} error={error}>
      {data && data.funnel.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-white font-display">{data.overall}%</span>
            <span className="text-xs text-[var(--text-muted)]">overall conversion rate</span>
          </div>

          <div className="space-y-2" role="img" aria-label={`Conversion funnel: ${data.overall}% overall rate`}>
            {data.funnel.map((stage, i) => {
              const maxCount = data.funnel[0].count;
              const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
              return (
                <div key={stage.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{stage.label}</span>
                    <span className="text-[var(--text-primary)] font-medium tabular-nums">{stage.count}</span>
                  </div>
                  <div className="relative h-8 rounded-lg bg-white/5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-lg transition-all duration-500",
                        i === data.funnel.length - 1 ? "bg-[var(--brand-primary)]" : "bg-[var(--brand-primary)]/30",
                      )}
                      style={{ width: `${Math.max(widthPct, 4)}%` }}
                    />
                    {stage.dropoff > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-red-400 font-medium">
                        -{stage.dropoffPercent}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-[var(--text-muted)] text-center">
            {data.funnel[data.funnel.length - 1]?.count} completed purchases out of {data.funnel[0]?.count} visitors
          </p>
        </div>
      )}
    </ChartWrapper>
  );
}
