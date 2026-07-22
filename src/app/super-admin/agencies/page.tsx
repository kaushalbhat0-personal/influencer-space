import { prisma } from "@/lib/prisma";
import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { AgenciesTable } from "./_components/agencies-table";
import { Building2, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgenciesPage() {
  let agencies: { id: string; name: string; subdomain: string | null; status: string; tenantCount: number; }[] = [];
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

      <AgenciesTable data={agencies} />
    </div>
  );
}
