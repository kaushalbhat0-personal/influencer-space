import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";
import { Building, Users, Globe, IndianRupee } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgencyDetailPage({ params }: { params: { id: string } }) {
  const agency = await prisma.websiteAgency.findUnique({
    where: { id: params.id },
    include: { tenants: { include: { tenant: true } } },
  });
  if (!agency) notFound();

  const tenantRows = agency.tenants.map((at) => ({
    id: at.tenant.id,
    name: at.tenant.name,
    subdomain: at.tenant.subdomain,
  }));

  const cols: Column<{ id: string; name: string; subdomain: string | null }>[] = [
    { key: "name", header: "Creator", sortable: true, cell: (r) => (
      <Link href={`/super-admin/tenants/${r.id}`} className="text-indigo-400 hover:underline text-sm">{r.name}</Link>
    )},
    { key: "subdomain", header: "Domain", sortable: true, cell: (r) => <span className="text-zinc-400 text-xs font-mono">{r.subdomain ?? "—"}</span> },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/super-admin/agencies" className="text-zinc-500 hover:text-zinc-300 text-sm">← Agencies</Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-2xl font-bold text-white">{agency.name}</h1>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Agency Name" value={agency.name} icon={Building} />
          <MetricCard label="Managed Creators" value={agency.tenants.length} icon={Users} />
          <MetricCard label="Subdomain" value={agency.subdomain} icon={Globe} />
          <MetricCard label="Status" value={agency.status} icon={IndianRupee} />
        </MetricGrid>
      </PageSection>

      <div className="mb-4"><h2 className="text-lg font-semibold text-white">Managed Creators</h2></div>
      <DataTable columns={cols} data={tenantRows} pageSize={20} emptyMessage="No creators managed by this agency." />
    </div>
  );
}
