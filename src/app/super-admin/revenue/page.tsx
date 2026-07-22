import { prisma } from "@/lib/prisma";
import { MetricGrid, PageSection, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { DataTable } from "@/components/data/DataTable";
import { BillingStatusBadge } from "@/components/admin/BillingStatusBadge";
import type { Column } from "@/components/data/DataTable";
import { Building, CreditCard, IndianRupee, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const [tenantCount, subData, agencyCount, recentPayments] = await Promise.all([
    prisma.tenant.count(),
    prisma.subscription.findMany({ select: { plan: true, status: true } }),
    prisma.websiteAgency.count(),
    prisma.productOrder.findMany({
      orderBy: { createdAt: "desc" }, take: 10,
      include: { product: { select: { name: true } } },
    }),
  ]);

  const activeSubs = subData.filter((s) => s.status === "ACTIVE" || s.status === "FREE");
  const proCount = subData.filter((s) => s.plan === "PRO").length;
  const mrr = proCount * 999;

  interface PaymentRow { id: string; productName: string; amount: number; status: string; createdAt: Date; }
  const payCols: Column<PaymentRow>[] = [
    { key: "productName", header: "Product", sortable: true, cell: (r) => <span className="text-white text-sm">{r.productName}</span> },
    { key: "amount", header: "Amount", sortable: true, cell: (r) => <span className="text-white font-medium tabular-nums">₹{r.amount}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => <BillingStatusBadge status={r.status} /> },
    { key: "createdAt", header: "Date", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
  ];

  const paymentRows: PaymentRow[] = recentPayments.map((o) => ({
    id: o.id, productName: o.product?.name ?? "Unknown", amount: o.amount, status: o.status, createdAt: o.createdAt,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Revenue</h1>
        <p className="mt-1 text-sm text-zinc-400">Platform revenue, MRR, and payment activity.</p>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Active Subscriptions" value={activeSubs.length} icon={CreditCard} />
          <MetricCard label="Monthly Revenue (MRR)" value={`₹${mrr.toLocaleString("en-IN")}`} icon={IndianRupee} />
          <MetricCard label="Total Tenants" value={tenantCount} icon={Building} />
          <MetricCard label="Agencies" value={agencyCount} icon={TrendingUp} />
        </MetricGrid>
      </PageSection>

      <DashboardGrid>
        <DashboardGridMain>
          <div className="admin-card p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Plan Distribution</h3>
            <div className="space-y-3">
              {[
                { label: "PRO", count: proCount, total: activeSubs.length },
                { label: "STARTER", count: activeSubs.length - proCount, total: activeSubs.length },
              ].map((p) => (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-20">{p.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${p.total > 0 ? Math.round((p.count / p.total) * 100) : 0}%` }} />
                  </div>
                  <span className="text-xs text-zinc-500 w-8 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardGridMain>
        <DashboardGridSide>
          <div className="admin-card p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Revenue Metrics</h3>
            <div className="space-y-3">
              {[
                { label: "Total Revenue", value: `₹${recentPayments.filter((p) => p.status === "COMPLETED" || p.status === "PAID").reduce((s, p) => s + p.amount, 0).toLocaleString("en-IN")}` },
                { label: "Pro Adoption", value: `${tenantCount > 0 ? Math.round((proCount / tenantCount) * 100) : 0}%` },
                { label: "Avg Products/Tenant", value: "—" },
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
        <DataTable columns={payCols} data={paymentRows} pageSize={10} emptyMessage="No payments recorded yet." />
      </div>
    </div>
  );
}
