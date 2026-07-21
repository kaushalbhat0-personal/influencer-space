import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dashboardAppService } from "@/lib/application/dashboard-app.service";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { MetricCard } from "@/components/data/MetricCard";
import { ShoppingBag, Image, Gamepad2, Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <ContentContainer>
        <PageHeader title="Dashboard" description="Welcome back to your admin panel" />
        <div className="admin-card p-8 text-center">
          <p className="text-red-400">Error: Tenant ID is missing or not configured.</p>
        </div>
      </ContentContainer>
    );
  }

  const statsResult = await dashboardAppService.getStats(tenantId);

  if (!statsResult.success || !statsResult.data) {
    return (
      <ContentContainer>
        <PageHeader title="Dashboard" description="Welcome back to your admin panel" />
        <div className="admin-card p-8 text-center">
          <p className="text-red-400">{statsResult.error?.message ?? "Failed to load dashboard stats"}</p>
        </div>
      </ContentContainer>
    );
  }

  const stats = statsResult.data;

  return (
    <ContentContainer>
      <PageHeader title="Dashboard" description="Welcome back to your admin panel" />

      <ErrorBoundary>
        <MetricGrid>
          <MetricCard
            label="Products"
            value={stats.productCount}
            subtext={`${stats.activeProductCount} active`}
            icon={ShoppingBag}
          />
          <MetricCard
            label="Affiliate Links"
            value={stats.affiliateCount}
            subtext={`${stats.totalClicks} total clicks`}
            icon={Link2}
          />
          <MetricCard label="Gallery Items" value={stats.galleryCount} icon={Image} />
          <MetricCard label="Games" value={stats.gamesCount} icon={Gamepad2} />
        </MetricGrid>
      </ErrorBoundary>
    </ContentContainer>
  );
}
