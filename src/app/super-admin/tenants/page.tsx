import { getAllTenants } from "@/services/super-admin.service";
import { MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import { Building } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface TenantRow {
  id: string;
  name: string;
  subdomain: string | null;
  customDomain: string | null;
}

const columns: Column<TenantRow>[] = [
  { key: "name", header: "Name", sortable: true, cell: (r) => (
    <Link href={`/super-admin/tenants/${r.id}`} className="text-s8ul-cyan hover:underline text-sm">{r.name}</Link>
  )},
  { key: "subdomain", header: "Subdomain", sortable: true, cell: (r) => <span className="text-zinc-300 text-sm font-mono">{r.subdomain ?? "—"}</span> },
  { key: "customDomain", header: "Custom Domain", sortable: true, cell: (r) => <span className="text-zinc-400 text-sm">{r.customDomain ?? "—"}</span> },
];

export default async function TenantsPage() {
  let tenants: TenantRow[] = [];
  try { tenants = await getAllTenants(); } catch { /* empty */ }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Tenants</h1>
        <p className="mt-1 text-sm text-zinc-400">All creator websites on the platform.</p>
      </div>

      <div className="mb-6">
        <MetricGrid>
          <MetricCard label="Total Tenants" value={tenants.length} icon={Building} />
          <MetricCard label="Custom Domains" value={tenants.filter((t) => t.customDomain).length} />
          <MetricCard label="Using Subdomain" value={tenants.filter((t) => t.subdomain && !t.customDomain).length} />
        </MetricGrid>
      </div>

      <DataTable
        columns={columns}
        data={tenants}
        pageSize={25}
        searchable
        searchPlaceholder="Search tenants by name or domain..."
        emptyMessage="No tenants provisioned yet."
      />
    </div>
  );
}
