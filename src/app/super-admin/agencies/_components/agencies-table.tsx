"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";

export interface AgencyRow { id: string; name: string; subdomain: string | null; status: string; tenantCount: number; }

const columns: Column<AgencyRow>[] = [
  { key: "name", header: "Name", sortable: true, cell: (r) => (
    <a href={`/super-admin/agencies/${r.id}`} className="text-s8ul-cyan hover:underline text-sm">{r.name}</a>
  )},
  { key: "subdomain", header: "Subdomain", sortable: true, cell: (r) => <span className="text-zinc-300 text-sm font-mono">{r.subdomain ?? "—"}</span> },
  { key: "tenantCount", header: "Clients", sortable: true, cell: (r) => <span className="text-white font-medium">{r.tenantCount}</span> },
  { key: "status", header: "Status", sortable: true, cell: (r) => (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>{r.status}</span>
  )},
];

export function AgenciesTable({ data }: { data: AgencyRow[] }) {
  return <DataTable columns={columns} data={data} pageSize={20} searchable searchPlaceholder="Search agencies..." emptyMessage="No agencies registered yet." />;
}
