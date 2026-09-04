"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { formatCurrency } from "@/lib/analytics/date";
import { CHART_COLORS } from "@/lib/analytics/constants";
import type { RevenueStats } from "@/lib/analytics/types";
import {
  chartTooltipStyle, chartGridStroke, chartTickStyle, chartBarRadius, chartMaxBarSize,
  formatXAxisDate, formatYAxisCompact, formatTooltipCurrency,
} from "@/components/charts/ChartTooltip";

interface RevenueAnalyticsProps {
  data: RevenueStats | null;
  loading?: boolean;
  error?: string | null;
}

export function RevenueAnalytics({ data, loading, error }: RevenueAnalyticsProps) {
  return (
    <ChartWrapper
      title="Revenue"
      description="Total revenue over time"
      loading={loading}
      error={error}
      empty={!data || data.total === 0}
      emptyMessage="No revenue yet. Share your website to start collecting sales."
    >
      {data && data.total > 0 && (
        <div className="space-y-6">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white font-display">{formatCurrency(data.total)}</span>
            {data.changePercent !== null && (
              <span className={`text-sm font-medium ${data.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                {data.changePercent >= 0 ? "↑" : "↓"} {Math.abs(data.changePercent)}%
              </span>
            )}
            <span className="text-xs text-[var(--text-muted)]">vs previous period</span>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Revenue by Day</p>
            <div className="h-48" role="img" aria-label={`Revenue chart: ${data.byDay.length} days, total ${formatCurrency(data.total)}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byDay.map((d) => ({ ...d, displayDate: formatXAxisDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="displayDate" tick={chartTickStyle} interval="preserveStartEnd" />
                  <YAxis tick={chartTickStyle} tickFormatter={formatYAxisCompact} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [formatTooltipCurrency(value), "Revenue"]} />
                  <Bar dataKey="amount" fill={CHART_COLORS[0]} radius={chartBarRadius} maxBarSize={chartMaxBarSize} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {data.byProduct.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Revenue by Product</p>
              <div className="h-56" role="img" aria-label="Revenue breakdown by product">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byProduct.slice(0, 7)}
                      dataKey="amount"
                      nameKey="productName"
                      cx="50%" cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      label={({ payload, percent }) => `${payload.productName} ${((Number(percent) || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.byProduct.slice(0, 7).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [formatTooltipCurrency(value), "Revenue"]} />
                    <Legend wrapperStyle={{ fontSize: 10, color: "#a1a1aa" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </ChartWrapper>
  );
}
