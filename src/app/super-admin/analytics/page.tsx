"use client";

import { cn } from "@/lib/utils";
import { getFunnelCounts, getFunnelDropoff, getConversionRate } from "@/lib/analytics/events";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function AnalyticsPage() {
  const counts = getFunnelCounts();
  const funnel = getFunnelDropoff();
  const signupToPublish = getConversionRate("signup", "website_published");
  const publishToSale = getConversionRate("website_published", "first_sale");

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Product Analytics</h1>
        <p className="mt-1 text-sm text-zinc-400">Activation funnel, conversion rates, and product metrics.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Signup → Publish", value: `${signupToPublish}%`, trend: "up" },
          { label: "Publish → First Sale", value: `${publishToSale}%`, trend: publishToSale > 0 ? "up" : "down" },
          { label: "Active Creators", value: String(counts.website_published ?? 0), trend: "up" as const },
          { label: "Upgrades", value: String(counts.upgrade ?? 0), trend: "up" as const },
        ].map((kpi) => (
          <div key={kpi.label} className="admin-card p-4">
            <p className="text-xs text-zinc-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
            <p className={cn("text-xs flex items-center gap-1 mt-1", kpi.trend === "up" ? "text-emerald-400" : "text-red-400")}>
              {kpi.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            </p>
          </div>
        ))}
      </div>

      {/* Activation Funnel */}
      <div className="admin-card p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Activation Funnel</h3>
        <div className="space-y-0">
          {funnel.map((f, i) => (
            <div key={f.stage} className="flex items-center gap-4 py-2.5 border-b border-white/[0.04] last:border-0">
              <span className="text-xs text-zinc-500 w-4 text-right">{i + 1}</span>
              <span className="text-sm text-zinc-300 flex-1">{f.stage.replace(/_/g, " ")}</span>
              <span className="text-sm font-medium text-white tabular-nums w-12 text-right">{f.count}</span>
              {f.dropoff > 0 && <span className="text-xs text-red-400 w-20 text-right">-{f.dropoff} ({f.dropoffPct}%)</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
