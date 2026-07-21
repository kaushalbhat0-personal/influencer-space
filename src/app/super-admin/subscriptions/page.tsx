import { prisma } from "@/lib/prisma";
import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import { CreditCard, Crown } from "lucide-react";

export const dynamic = "force-dynamic";

interface SubscriptionRow {
  tenantName: string;
  plan: string;
  status: string;
  currentPeriodEnd: Date | null;
}

const columns: Column<SubscriptionRow>[] = [
  { key: "tenantName", header: "Tenant", sortable: true, cell: (r) => <span className="text-white text-sm">{r.tenantName}</span> },
  { key: "plan", header: "Plan", sortable: true, cell: (r) => (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.plan === "PRO" ? "bg-s8ul-cyan/20 text-s8ul-cyan" : r.plan === "AGENCY" ? "bg-purple-500/20 text-purple-400" : "bg-zinc-800 text-zinc-400"}`}>{r.plan}</span>
  )},
  { key: "status", header: "Status", sortable: true, cell: (r) => (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>{r.status}</span>
  )},
  { key: "currentPeriodEnd", header: "Renews", sortable: true, cell: (r) => (
    <span className="text-zinc-400 text-sm">{r.currentPeriodEnd ? new Date(r.currentPeriodEnd).toLocaleDateString("en-IN") : "—"}</span>
  )},
];

export default async function SubscriptionsPage() {
  let subs: SubscriptionRow[] = [];
  try {
    const raw = await prisma.subscription.findMany({
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    subs = raw.map((s) => ({
      tenantName: s.tenant?.name ?? "Unknown",
      plan: s.plan,
      status: s.status === "FREE" ? "FREE" : "ACTIVE",
      currentPeriodEnd: s.currentPeriodEnd,
    }));
  } catch { /* empty */ }

  const proCount = subs.filter((s) => s.plan === "PRO" || s.plan === "AGENCY").length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="mt-1 text-sm text-zinc-400">All tenant subscription plans.</p>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Total Subscriptions" value={subs.length} icon={CreditCard} />
          <MetricCard label="Pro / Agency" value={proCount} icon={Crown} />
          <MetricCard label="Free" value={subs.filter((s) => s.plan === "STARTER").length} />
        </MetricGrid>
      </PageSection>

      <DataTable
        columns={columns}
        data={subs}
        pageSize={20}
        searchable
        searchPlaceholder="Search by tenant name..."
        emptyMessage="No subscriptions found."
      />
    </div>
  );
}
