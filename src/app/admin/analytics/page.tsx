import { Suspense } from "react";
import { requireTenant } from "@/lib/auth/require-tenant";
import { ContentContainer, PageHeader, DashboardGrid, DashboardGridMain, DashboardGridSide, MetricGrid } from "@/components/layout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { DashboardWidgetSkeleton } from "@/components/ui/DashboardWidget";
import { MetricCard } from "@/components/data/MetricCard";
import { Package, IndianRupee, ShoppingBag, TrendingUp } from "lucide-react";
import { computeDateRange, formatCurrency } from "@/lib/analytics/date";
import { DEFAULT_DATE_PRESET } from "@/lib/analytics/constants";
import { computeAnalytics } from "@/lib/analytics/queries";
import { AnalyticsClient } from "@/features/analytics/components/analytics-client";

export const dynamic = "force-dynamic";

async function AnalyticsShell({ tenantId }: { tenantId: string }) {
  const range = computeDateRange(DEFAULT_DATE_PRESET);
  const summary = await computeAnalytics(tenantId, range);

  return (
    <>
      <div className="mb-6">
        <PageHeader
          title="Analytics"
          description="Track store performance, revenue, and customer trends."
          breadcrumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Analytics" }]}
        />
      </div>

      <div className="mb-6">
        <MetricGrid>
          <MetricCard label="Total Revenue" value={formatCurrency(summary.revenue.total)} icon={IndianRupee} subtext={`${summary.orders.completed} completed orders`} />
          <MetricCard label="Total Orders" value={summary.orders.total} icon={Package} subtext={`${summary.orders.completed} completed`} />
          <MetricCard label="Active Products" value={summary.products.active} icon={ShoppingBag} subtext={`${summary.products.featured} featured`} />
          <MetricCard label="Conversion" value={summary.conversion.overall > 0 ? `${summary.conversion.overall}%` : "—"} icon={TrendingUp} subtext={summary.orders.total > 0 ? `${summary.orders.completed} of ${summary.orders.total}` : "No orders"} />
        </MetricGrid>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<AnalyticsFallback />}>
          <AnalyticsClient tenantId={tenantId} initialSummary={summary} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

function AnalyticsFallback() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-full max-w-96 rounded bg-white/5 animate-pulse" />
      <DashboardGrid>
        <DashboardGridMain>
          <DashboardWidgetSkeleton rows={6} />
          <DashboardWidgetSkeleton rows={4} />
        </DashboardGridMain>
        <DashboardGridSide>
          <DashboardWidgetSkeleton rows={5} />
          <DashboardWidgetSkeleton rows={4} />
        </DashboardGridSide>
      </DashboardGrid>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const { tenantId } = await requireTenant();

  return (
    <ContentContainer>
      <Suspense fallback={<AnalyticsFallback />}>
        <AnalyticsShell tenantId={tenantId} />
      </Suspense>
    </ContentContainer>
  );
}
