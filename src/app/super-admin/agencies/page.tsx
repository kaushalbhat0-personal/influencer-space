import { prisma } from "@/lib/prisma";
import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import { Building2, Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface AgencyRow {
  id: string;
  name: string;
  subdomain: string | null;
  status: string;
  tenantCount: number;
}

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

export default async function AgenciesPage() {
  let agencies: AgencyRow[] = [];
  try {
    const raw = await prisma.websiteAgency.findMany({
      include: { _count: { select: { tenants: true } } },
      orderBy: { createdAt: "desc" },
    });
    agencies = raw.map((a) => ({
      id: a.id,
      name: a.name,
      subdomain: a.subdomain ?? null,
      status: a.status,
      tenantCount: a._count.tenants,
    }));
  } catch { /* empty */ }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Agencies</h1>
        <p className="mt-1 text-sm text-zinc-400">All registered agencies and their clients.</p>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Total Agencies" value={agencies.length} icon={Building2} />
          <MetricCard label="Active" value={agencies.filter((a) => a.status === "ACTIVE").length} />
          <MetricCard label="Total Clients" value={agencies.reduce((s, a) => s + a.tenantCount, 0)} icon={Users} />
        </MetricGrid>
      </PageSection>

      <DataTable
        columns={columns}
        data={agencies}
        pageSize={20}
        searchable
        searchPlaceholder="Search agencies..."
        emptyMessage="No agencies registered yet."
      />
    </div>
  );
}
