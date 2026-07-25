import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrlWithTenant } from "@/lib/config/platform";
import { ContentContainer, MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { DashboardWidget, DashboardWidgetSkeleton, DashboardWidgetError } from "@/components/ui/DashboardWidget";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickStartGuide } from "@/components/dashboard/QuickStartGuide";
import { computeHealthChecks, getScoreColor, getScoreDotColor } from "@/lib/dashboard/health";
import { getQuickStartSteps } from "@/lib/dashboard/quickstart";
import { ShoppingBag, Image as ImageIcon, Link2, Package, TrendingUp, MessageSquare, HeartPulse, Lightbulb } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function WelcomeHeader({ tenantId }: { tenantId: string }) {
  const session = await getServerSession(authOptions);
  const creatorName = session?.user?.name || "Creator";
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subdomain: true, customDomain: true },
  });
  const storefrontUrl = buildStorefrontUrlWithTenant(tenant?.customDomain, tenant?.subdomain ?? "");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Welcome back, {creatorName}</h1>
        <p className="mt-1 text-sm text-zinc-500">Here&apos;s what&apos;s happening with your store.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">View Website</a>
        <Link href="/builder" className="btn-primary text-xs">Open Builder</Link>
      </div>
    </div>
  );
}

async function DashboardMetrics({ tenantId }: { tenantId: string }) {
  const [
    productCount,
    activeProductCount,
    orderCount,
    revenue,
    affiliateCount,
    galleryCount,
    messageCount,
  ] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.product.count({ where: { tenantId, isActive: true } }),
    prisma.productOrder.count({ where: { tenantId } }),
    prisma.productOrder.aggregate({
      where: { tenantId, status: { in: ["PAID", "COMPLETED"] } },
      _sum: { amount: true },
    }),
    prisma.affiliateLink.count({ where: { tenantId } }),
    prisma.galleryImage.count({ where: { tenantId } }),
    prisma.contactSubmission.count({ where: { tenantId } }),
  ]);

  const totalRevenue = revenue._sum.amount ?? 0;

  return (
    <MetricGrid>
      <MetricCard label="Products" value={productCount} icon={ShoppingBag} subtext={`${activeProductCount} active`} />
      <MetricCard label="Orders" value={orderCount} icon={Package} subtext={`₹${totalRevenue.toLocaleString("en-IN")} revenue`} />
      <MetricCard label="Affiliate Links" value={affiliateCount} icon={Link2} subtext={`${affiliateCount} links`} />
      <MetricCard label="Gallery Items" value={galleryCount} icon={ImageIcon} />
      <MetricCard label="Messages" value={messageCount} icon={MessageSquare} />
      <MetricCard
        label="Avg Order Value"
        value={orderCount > 0 ? `₹${Math.round(totalRevenue / orderCount).toLocaleString("en-IN")}` : "—"}
        icon={TrendingUp}
        subtext={orderCount > 0 ? "per order" : "No orders yet"}
      />
    </MetricGrid>
  );
}

async function DashboardHealth({ tenantId }: { tenantId: string }) {
  const [productCount, orderCount, galleryCount, tenant, seoSetting] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.productOrder.count({ where: { tenantId } }),
    prisma.galleryImage.count({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { customDomain: true } }),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } } }),
  ]);

  const { overall, checks } = computeHealthChecks({
    productCount,
    orderCount,
    galleryCount,
    hasCustomDomain: !!tenant?.customDomain,
    hasSEO: !!seoSetting,
  });

  return (
    <DashboardWidget
      title="Website Health"
      icon={HeartPulse}
      actions={
        <span className={`text-lg font-bold font-display ${getScoreColor(overall)}`}>
          {overall}%
        </span>
      }
    >
      <div className="space-y-2">
        {checks.map((check) => (
          <Link
            key={check.label}
            href={check.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 transition-colors"
          >
            <div className={`h-2 w-2 rounded-full shrink-0 ${getScoreDotColor(check.done)}`} />
            <span className="flex-1 text-sm text-zinc-300">{check.label}</span>
            <span className={`text-xs font-medium ${getScoreColor(check.score)}`}>
              {check.score}%
            </span>
          </Link>
        ))}
      </div>
    </DashboardWidget>
  );
}

async function DashboardQuickStart({ tenantId }: { tenantId: string }) {
  const [productCount, tenant, seoSetting] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { customDomain: true } }),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "seo" } } }),
  ]);

  const steps = getQuickStartSteps({
    productCount,
    hasCustomDomain: !!tenant?.customDomain,
    hasSEO: !!seoSetting,
  });

  return <QuickStartGuide steps={steps} />;
}

async function DashboardInsights({ tenantId }: { tenantId: string }) {
  const [products, topProduct, revenue] = await Promise.all([
    prisma.product.count({ where: { tenantId, isActive: true } }),
    prisma.productOrder.findFirst({
      where: { tenantId },
      orderBy: { amount: "desc" },
      include: { product: { select: { name: true } } },
    }),
    prisma.productOrder.aggregate({
      where: { tenantId, status: { in: ["PAID", "COMPLETED"] } },
      _sum: { amount: true },
    }),
  ]);

  const totalRevenue = revenue._sum.amount ?? 0;
  const hasData = products > 0 || totalRevenue > 0;

  return (
    <DashboardWidget
      title="Insights"
      icon={Lightbulb}
      empty={!hasData}
      emptyMessage="Add products and start selling to see insights here."
    >
      <div className="space-y-3">
        {topProduct && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Top Product</span>
            <span className="text-zinc-200 font-medium">{topProduct.product?.name ?? "—"}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Active Products</span>
          <span className="text-zinc-200 font-medium">{products}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Total Revenue</span>
          <span className="text-zinc-200 font-medium">₹{totalRevenue.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </DashboardWidget>
  );
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <ContentContainer>
        <DashboardWidgetError message="No tenant configured. Please contact support." />
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <div className="space-y-6">
        <ErrorBoundary>
          <Suspense fallback={<div className="h-16 rounded-lg bg-white/5 animate-pulse" aria-label="Loading header" />}>
            <WelcomeHeader tenantId={tenantId} />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<MetricsSkeleton />}>
            <DashboardMetrics tenantId={tenantId} />
          </Suspense>
        </ErrorBoundary>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ErrorBoundary>
              <Suspense fallback={<DashboardWidgetSkeleton rows={4} />}>
                <DashboardQuickStart tenantId={tenantId} />
              </Suspense>
            </ErrorBoundary>

            <ErrorBoundary>
              <Suspense fallback={<ActivitySkeleton />}>
                <ActivityFeed tenantId={tenantId} />
              </Suspense>
            </ErrorBoundary>
          </div>

          <div className="space-y-6">
            <ErrorBoundary>
              <Suspense fallback={<DashboardWidgetSkeleton rows={6} />}>
                <DashboardHealth tenantId={tenantId} />
              </Suspense>
            </ErrorBoundary>

            <ErrorBoundary>
              <Suspense fallback={<DashboardWidgetSkeleton rows={3} />}>
                <DashboardInsights tenantId={tenantId} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </ContentContainer>
  );
}

function MetricsSkeleton() {
  return (
    <MetricGrid>
      {Array.from({ length: 6 }).map((_, i) => (
        <MetricCard key={i} label="" value="" loading />
      ))}
    </MetricGrid>
  );
}

function ActivitySkeleton() {
  return (
    <div className="admin-card p-5" role="status" aria-label="Loading activity">
      <div className="h-4 w-24 rounded bg-white/5 animate-pulse mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-lg bg-white/5 animate-pulse" />
          <div className="flex-1 h-4 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-12 rounded bg-white/5 animate-pulse" />
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}


