"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { formatCurrency } from "@/lib/analytics/date";
import { ORDER_STATUS_COLORS } from "@/lib/analytics/constants";
import type { OrderStats } from "@/lib/analytics/types";
import {
  chartTooltipStyle, chartGridStroke, chartTickStyle, chartBarRadius, chartMaxBarSize,
  formatXAxisDate,
} from "@/components/charts/ChartTooltip";
import { MetricCard } from "@/components/data/MetricCard";
import { Package, TrendingUp, IndianRupee } from "lucide-react";

interface OrderAnalyticsProps {
  data: OrderStats | null;
  loading?: boolean;
  error?: string | null;
}

export function OrderAnalytics({ data, loading, error }: OrderAnalyticsProps) {
  const empty = !data || data.total === 0;
  const statusData = data ? [
    { name: "Completed", value: data.completed },
    { name: "Pending", value: data.pending },
    { name: "Failed", value: data.failed },
  ].filter((s) => s.value > 0) : [];

  return (
    <ChartWrapper
      title="Orders"
      description="Order volume and status distribution"
      loading={loading}
      error={error}
      empty={empty}
      emptyMessage="No orders yet. Share your website to start collecting sales."
    >
      {data && data.total > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Total Orders" value={data.total} icon={Package} />
            <MetricCard label="Avg Value" value={formatCurrency(data.averageValue)} icon={IndianRupee} />
            <MetricCard label="Completion" value={data.total > 0 ? `${Math.round((data.completed / data.total) * 100)}%` : "—"} icon={TrendingUp} />
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-400 mb-3">Orders by Day</p>
            <div className="h-40" role="img" aria-label={`${data.byDay.length} days of order data`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byDay.map((d) => ({ ...d, displayDate: formatXAxisDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="displayDate" tick={chartTickStyle} interval="preserveStartEnd" />
                  <YAxis tick={chartTickStyle} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill={ORDER_STATUS_COLORS.completed} radius={chartBarRadius} maxBarSize={chartMaxBarSize} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {statusData.length > 0 && (
            <div className="flex gap-6 items-center">
              <div className="h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={40} innerRadius={20}>
                      {statusData.map((s) => (
                        <Cell key={s.name} fill={ORDER_STATUS_COLORS[s.name.toLowerCase()] || "#6366f1"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ORDER_STATUS_COLORS[s.name.toLowerCase()] || "#6366f1" }} aria-hidden="true" />
                    <span className="text-zinc-400">{s.name}</span>
                    <span className="text-zinc-200 font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.topProducts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2">Top Selling Products</p>
              <div className="space-y-1">
                {data.topProducts.slice(0, 5).map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3 text-sm">
                    <span className="text-xs text-zinc-600 w-4 shrink-0">{i + 1}</span>
                    <span className="flex-1 text-zinc-300 truncate">{p.name}</span>
                    <span className="text-zinc-400 tabular-nums">{p.count} sold</span>
                    <span className="text-zinc-200 font-medium tabular-nums">{formatCurrency(p.revenue)}</span>
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
