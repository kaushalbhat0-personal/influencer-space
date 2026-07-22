"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";

export interface SubscriptionRow { tenantName: string; plan: string; status: string; currentPeriodEnd: string | null; }

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

export function SubscriptionsTable({ data }: { data: SubscriptionRow[] }) {
  return <DataTable columns={columns} data={data} pageSize={20} searchable searchPlaceholder="Search by tenant name..." emptyMessage="No subscriptions found." />;
}
