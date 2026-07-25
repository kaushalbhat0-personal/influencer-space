"use client";

import { MetricCard } from "@/components/data/MetricCard";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { formatCurrency } from "@/lib/analytics/date";
import { ShoppingBag, Star, TrendingUp, Package } from "lucide-react";
import type { ProductStats } from "@/lib/analytics/types";

interface ProductPerformanceProps {
  data: ProductStats | null;
  loading?: boolean;
  error?: string | null;
}

export function ProductPerformance({ data, loading, error }: ProductPerformanceProps) {
  const empty = !data || data.total === 0;

  return (
    <ChartWrapper
      title="Product Performance"
      description="Catalog and sales performance"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="Add products to start tracking performance."
    >
      {data && data.total > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Total" value={data.total} icon={Package} />
            <MetricCard label="Active" value={data.active} icon={ShoppingBag} />
            <MetricCard label="Featured" value={data.featured} icon={Star} />
            <MetricCard label="With Sales" value={data.withSales} icon={TrendingUp} />
          </div>

          {data.topPerformers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2">Top Performers</p>
              <div className="space-y-1">
                {data.topPerformers.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3 text-sm py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-xs text-zinc-600 w-4 shrink-0">{i + 1}</span>
                    <span className="flex-1 text-zinc-300 truncate">{p.name}</span>
                    <span className="text-zinc-400 text-xs">{p.sales} sold</span>
                    <span className="text-zinc-200 font-medium tabular-nums">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.lowestPerformers.length > 0 && data.topPerformers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2">Needs Attention</p>
              <div className="space-y-1">
                {data.lowestPerformers.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3 text-sm py-1.5">
                    <span className="text-xs text-red-400 w-4 shrink-0">{i + 1}</span>
                    <span className="flex-1 text-zinc-300 truncate">{p.name}</span>
                    <span className="text-xs text-zinc-600">No sales</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ChartWrapper>
  );
}
