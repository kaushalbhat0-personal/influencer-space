"use client";

import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import Link from "next/link";

interface TenantRow { id: string; name: string; subdomain: string | null; customDomain: string | null; }

const columns: Column<TenantRow>[] = [
  { key: "name", header: "Name", sortable: true, cell: (r) => (
    <Link href={`/super-admin/tenants/${r.id}`} className="text-s8ul-cyan hover:underline text-sm">{r.name}</Link>
  )},
  { key: "subdomain", header: "Subdomain", sortable: true, cell: (r) => <span className="text-zinc-300 text-sm font-mono">{r.subdomain ?? "—"}</span> },
  { key: "customDomain", header: "Custom Domain", sortable: true, cell: (r) => <span className="text-zinc-400 text-sm">{r.customDomain ?? "—"}</span> },
];

export function TenantsTable({ data }: { data: TenantRow[] }) {
  return <DataTable columns={columns} data={data} pageSize={25} searchable searchPlaceholder="Search tenants by name or domain..." emptyMessage="No tenants provisioned yet." />;
}
