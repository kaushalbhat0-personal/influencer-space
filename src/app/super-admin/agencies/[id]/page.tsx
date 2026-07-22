import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { AgencyTenantsTable } from "./_components/agency-tenants-table";
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
      <AgencyTenantsTable data={tenantRows} />
    </div>
  );
}
