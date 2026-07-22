"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import Link from "next/link";

const columns: Column<{ id: string; name: string; subdomain: string | null }>[] = [
  { key: "name", header: "Creator", sortable: true, cell: (r) => (
    <Link href={`/super-admin/tenants/${r.id}`} className="text-indigo-400 hover:underline text-sm">{r.name}</Link>
  )},
  { key: "subdomain", header: "Domain", sortable: true, cell: (r) => <span className="text-zinc-400 text-xs font-mono">{r.subdomain ?? "—"}</span> },
];

export function AgencyTenantsTable({ data }: { data: { id: string; name: string; subdomain: string | null }[] }) {
  return <DataTable columns={columns} data={data} pageSize={20} emptyMessage="No creators managed by this agency." />;
}
