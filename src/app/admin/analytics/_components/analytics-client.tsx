"use client";

import { useState, useTransition, useCallback } from "react";
import { DashboardGrid, DashboardGridMain, DashboardGridSide, PageSection } from "@/components/layout";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { RevenueAnalytics } from "@/components/analytics/RevenueAnalytics";
import { OrderAnalytics } from "@/components/analytics/OrderAnalytics";
import { ConversionFunnel } from "@/components/analytics/ConversionFunnel";
import { ProductPerformance } from "@/components/analytics/ProductPerformance";
import { CreatorInsights } from "@/components/analytics/CreatorInsights";
import type { DatePreset } from "@/lib/analytics/date";
import type { AnalyticsSummary } from "@/lib/analytics/types";

interface AnalyticsClientProps {
  tenantId: string;
  initialSummary: AnalyticsSummary;
}

export function AnalyticsClient({ tenantId, initialSummary }: AnalyticsClientProps) {
  const [preset, setPreset] = useState<DatePreset>("last_30_days");
  const [summary, setSummary] = useState(initialSummary);
  const [loading, startTransition] = useTransition();

  const handlePresetChange = useCallback((newPreset: DatePreset) => {
    setPreset(newPreset);
    startTransition(async () => {
      const { fetchAnalytics } = await import("@/actions/analytics.actions");
      const result = await fetchAnalytics(tenantId, newPreset);
      if (result.success && result.data) {
        setSummary(result.data);
      }
    });
  }, [tenantId]);

  return (
    <div className="space-y-6">
      <PageSection>
        <DateRangePicker value={preset} onChange={handlePresetChange} />
      </PageSection>

      <DashboardGrid>
        <DashboardGridMain>
          <RevenueAnalytics data={summary.revenue} loading={loading} />
          <OrderAnalytics data={summary.orders} loading={loading} />
        </DashboardGridMain>
        <DashboardGridSide>
          <ConversionFunnel data={summary.conversion} loading={loading} />
          <ProductPerformance data={summary.products} loading={loading} />
        </DashboardGridSide>
      </DashboardGrid>

      <CreatorInsights insights={summary.insights} loading={loading} />
    </div>
  );
}
