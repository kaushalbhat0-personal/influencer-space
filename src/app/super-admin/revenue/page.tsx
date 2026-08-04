import { prisma } from "@/lib/prisma";
import { MetricGrid, PageSection, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { RevenueTable } from "./_components/revenue-table";
import { Building, CreditCard, IndianRupee, TrendingUp, Users, Wallet, CircleDollarSign } from "lucide-react";
import { revenueService } from "@/modules/billing/application/revenue-service";

export const dynamic = "force-dynamic";

/**
 * IMPLEMENTATION-39: Revenue is derived entirely from Billing v2
 * (RevenueService.getRevenueDashboard) — no hardcoded MRR/prices.
 */
export default async function RevenuePage() {
  const [revenue, tenantCount, agencyCount, recentPayments] = await Promise.all([
    revenueService.getRevenueDashboard(),
    prisma.tenant.count(),
    prisma.websiteAgency.count(),
    prisma.productOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { product: { select: { name: true } } },
    }),
  ]);

  const paymentRows = recentPayments.map((o) => ({
    id: o.id,
    productName: o.product?.name ?? "Unknown",
    amount: o.amount,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
  }));
  const total = revenue.planDistribution.reduce((s, p) => s + p.count, 0);
  const maxCount = Math.max(1, ...revenue.planDistribution.map((p) => p.count));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Revenue</h1>
        <p className="mt-1 text-sm text-zinc-400">Platform revenue, MRR, and payment activity — derived from Billing v2.</p>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Monthly Revenue (MRR)" value={`₹${revenue.mrr.toLocaleString("en-IN")}`} icon={IndianRupee} />
          <MetricCard label="Annual (ARR)" value={`₹${revenue.arr.toLocaleString("en-IN")}`} icon={Wallet} />
          <MetricCard label="Active Subscribers" value={revenue.activeSubscribers} icon={Users} />
          <MetricCard label="Revenue / Creator" value={`₹${revenue.averageRevenuePerCreator}`} icon={CircleDollarSign} />
        </MetricGrid>
      </PageSection>

      <DashboardGrid>
        <DashboardGridMain>
          <div className="admin-card p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Plan Distribution (active subscriptions)</h3>
            {revenue.planDistribution.length === 0 ? (
              <p className="text-xs text-zinc-600">No active subscriptions yet.</p>
            ) : (
              <div className="space-y-3">
                {revenue.planDistribution.map((p) => (
                  <div key={p.planCode} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-28">{p.planName}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.round((p.count / maxCount) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500 w-8 text-right">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardGridMain>
        <DashboardGridSide>
          <div className="admin-card p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Revenue Metrics</h3>
            <div className="space-y-3">
              {[
                { label: "Monthly Revenue", value: `₹${revenue.monthlyRevenue.toLocaleString("en-IN")}` },
                { label: "Total Invoiced", value: `₹${revenue.totalInvoiced.toLocaleString("en-IN")}` },
                { label: "Paid Invoices", value: `${revenue.totalPaidInvoices}` },
                { label: "Pending Amount", value: `₹${revenue.invoicePendingAmount.toLocaleString("en-IN")}` },
                { label: "Growth (MoM)", value: `${revenue.growth.growthPercent >= 0 ? "+" : ""}${revenue.growth.growthPercent}%` },
                { label: "Commission Revenue", value: `₹${revenue.commissionRevenue.toLocaleString("en-IN")}` },
                { label: "Take Rate", value: `${revenue.platformTakeRate}%` },
                { label: "Total Tenants", value: `${tenantCount}` },
                { label: "Agencies", value: `${agencyCount}` },
              ].map((m) => (
                <div key={m.label} className="flex justify-between text-sm">
                  <span className="text-zinc-500">{m.label}</span>
                  <span className="text-white font-medium">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardGridSide>
      </DashboardGrid>

      <div className="mt-8">
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Recent Payments</h3>
        <RevenueTable data={paymentRows} />
      </div>
    </div>
  );
}
