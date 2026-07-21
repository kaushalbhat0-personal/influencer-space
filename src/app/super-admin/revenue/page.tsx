import { getPlatformStats } from "@/services/super-admin.service";
import { MetricGrid, PageSection, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { Building, IndianRupee, TrendingUp, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  let stats;
  try { stats = await getPlatformStats(); } catch { stats = { totalTenants: 0, totalProducts: 0, activeProSubscriptions: 0 }; }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Revenue</h1>
        <p className="mt-1 text-sm text-zinc-400">Platform revenue, MRR, and growth metrics.</p>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Total Tenants" value={stats.totalTenants} icon={Building} />
          <MetricCard label="Active Products" value={stats.totalProducts} icon={TrendingUp} />
          <MetricCard label="Pro Subscriptions" value={stats.activeProSubscriptions} icon={Users} />
          <MetricCard label="Est. Monthly Revenue" value={`₹${(stats.activeProSubscriptions * 999).toLocaleString("en-IN")}`} icon={IndianRupee} />
        </MetricGrid>
      </PageSection>

      <DashboardGrid>
        <DashboardGridMain>
          <div className="admin-card p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">MRR Trend</h3>
            <div className="h-48 flex items-center justify-center">
              <p className="text-zinc-500 text-sm">Chart integration available with Recharts. See data above for current metrics.</p>
            </div>
          </div>
        </DashboardGridMain>
        <DashboardGridSide>
          <div className="admin-card p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              {[
                { label: "Free tenants", value: stats.totalTenants - stats.activeProSubscriptions },
                { label: "Products/tenant (avg)", value: stats.totalTenants > 0 ? Math.round(stats.totalProducts / stats.totalTenants) : 0 },
                { label: "Pro adoption", value: stats.totalTenants > 0 ? `${Math.round((stats.activeProSubscriptions / stats.totalTenants) * 100)}%` : "0%" },
              ].map((s) => (
                <div key={s.label} className="flex justify-between text-sm">
                  <span className="text-zinc-500">{s.label}</span>
                  <span className="text-white font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardGridSide>
      </DashboardGrid>
    </div>
  );
}
