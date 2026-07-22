import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrlWithTenant } from "@/lib/config/platform";
import { dashboardAppService } from "@/lib/application/dashboard-app.service";
import { ContentContainer, MetricGrid, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { HealthScore } from "@/components/dashboard/HealthScore";
import { ProgressChecklist } from "@/components/dashboard/ProgressChecklist";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import type { ChecklistItem } from "@/components/dashboard/ProgressChecklist";
import type { ActivityItem } from "@/components/dashboard/ActivityTimeline";
import { ShoppingBag, Image, Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return <ContentContainer><div className="admin-card p-8 text-center"><p className="text-red-400">Tenant ID not configured.</p></div></ContentContainer>;
  }

  const creatorName = session?.user?.name || "Creator";

  const [statsResult, tenant, productCount, orderCount, domainCheck] = await Promise.all([
    dashboardAppService.getStats(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { subdomain: true, customDomain: true } }),
    prisma.product.count({ where: { tenantId } }),
    prisma.productOrder.count({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { customDomain: true } }),
  ]);

  const storefront = buildStorefrontUrlWithTenant(tenant?.customDomain, tenant?.subdomain ?? "");
  const hasCustomDomain = !!domainCheck?.customDomain;
  const websitePublished = true; // SSR storefront is always live
  const stats = statsResult.success ? statsResult.data : { productCount: 0, activeProductCount: 0, affiliateCount: 0, totalClicks: 0, galleryCount: 0, gamesCount: 0 };

  // Health scores
  const healthCategories = [
    { label: "Website", score: websitePublished ? 100 : 30, href: "/builder" },
    { label: "Products", score: productCount > 0 ? 100 : 10, href: "/admin/products" },
    { label: "SEO", score: 50, href: "/admin/seo" },
    { label: "Branding", score: hasCustomDomain ? 100 : 40, href: "/admin/settings/domain" },
    { label: "Commerce", score: orderCount > 0 ? 100 : 0, href: "/admin/orders" },
  ];

  // Checklist
  const checklist: ChecklistItem[] = [
    { id: "website", label: "Website Generated", done: true, href: "/builder" },
    { id: "publish", label: "Website Published", done: websitePublished, href: "/builder" },
    { id: "product", label: "Add First Product", done: productCount > 0, href: "/admin/products" },
    { id: "domain", label: "Connect Custom Domain", done: hasCustomDomain, href: "/admin/settings/domain" },
    { id: "seo", label: "Configure SEO", done: false, href: "/admin/seo" },
    { id: "checkout", label: "Test Checkout", done: orderCount > 0, href: "/admin/products" },
    { id: "share", label: "Share Website", done: false, href: "/admin/settings" },
  ];

  // Activity
  const activity: ActivityItem[] = [
    { id: "1", icon: "published", title: "Website published", time: "Just now" },
    ...(productCount > 0 ? [{ id: "2", icon: "product" as const, title: `${productCount} products added`, time: "Recently" }] : []),
  ];

  return (
    <ContentContainer>
      <ErrorBoundary>
        <div className="space-y-6">
          <DashboardHero
            creatorName={creatorName}
            websitePublished={websitePublished}
            productCount={productCount}
            hasCustomDomain={hasCustomDomain}
            planName="Starter"
            storefrontUrl={storefront}
          />

          <MetricGrid>
            <MetricCard label="Products" value={stats?.productCount ?? 0} icon={ShoppingBag} subtext={`${stats?.activeProductCount ?? 0} active`} />
            <MetricCard label="Affiliate Links" value={stats?.affiliateCount ?? 0} icon={Link2} subtext={`${stats?.totalClicks ?? 0} clicks`} />
            <MetricCard label="Gallery Items" value={stats?.galleryCount ?? 0} icon={Image} />
            <MetricCard label="Orders" value={orderCount} icon={ShoppingBag} subtext={orderCount > 0 ? "First sale!" : "Pending"} />
          </MetricGrid>

          <DashboardGrid>
            <DashboardGridMain>
              <ProgressChecklist items={checklist} />
              <ActivityTimeline items={activity} />
            </DashboardGridMain>
            <DashboardGridSide>
              <HealthScore categories={healthCategories} />
            </DashboardGridSide>
          </DashboardGrid>
        </div>
      </ErrorBoundary>
    </ContentContainer>
  );
}
