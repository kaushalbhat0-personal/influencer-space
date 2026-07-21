import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid, PageSection, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { fetchAnalytics } from "@/actions/order.actions";
import { MetricCard } from "@/components/data/MetricCard";
import { Package, IndianRupee, TrendingUp, ShoppingBag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  let data: Awaited<ReturnType<typeof fetchAnalytics>> | null = null;
  try { data = await fetchAnalytics(tenantId); } catch { /* handled */ }

  if (!data) {
    return (
      <ContentContainer>
        <PageHeader title="Analytics" description="Track store performance" />
        <p className="text-zinc-500">Unable to load analytics. Please try again.</p>
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <PageHeader
        title="Analytics"
        description="Track store performance, revenue, and customer trends."
        breadcrumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Analytics" }]}
      />

      <PageSection>
        <MetricGrid>
          <MetricCard label="Total Orders" value={data.completedOrders} icon={Package} />
          <MetricCard label="Total Revenue" value={`₹${data.totalRevenue.toLocaleString("en-IN")}`} icon={IndianRupee} />
          <MetricCard label="Active Products" value={data.activeProducts} icon={ShoppingBag} />
          <MetricCard
            label="Conversion"
            value={data.totalOrders > 0 ? `${Math.round((data.completedOrders / data.totalOrders) * 100)}%` : "—"}
            icon={TrendingUp}
          />
        </MetricGrid>
      </PageSection>

      <ErrorBoundary>
        <DashboardGrid>
          <DashboardGridMain>
            <div className="admin-card p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Revenue Overview</h3>
              <div className="h-48 flex items-center justify-center">
                <p className="text-3xl font-bold text-white font-display">₹{data.totalRevenue.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </DashboardGridMain>
          <DashboardGridSide>
            <div className="admin-card p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Top Products</h3>
              {data.topProducts.length > 0 ? (
                <ul className="space-y-2">
                  {data.topProducts.map((name, i) => (
                    <li key={name} className="flex items-center gap-3 text-sm">
                      <span className="text-xs font-bold text-zinc-600 w-4">{i + 1}</span>
                      <span className="text-zinc-300">{name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No products yet</p>
              )}
            </div>
          </DashboardGridSide>
        </DashboardGrid>
      </ErrorBoundary>
    </ContentContainer>
  );
}
