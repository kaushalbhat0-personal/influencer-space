import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building, Globe, Users, IndianRupee } from "lucide-react";
import { AgencyClientsTable } from "./_components/agency-clients-table";

export const dynamic = "force-dynamic";

interface ClientRow { id: string; name: string; subdomain: string | null; products: number; status: string; }

export default async function AgencyDashboard() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">No agency configured</p></ContentContainer>;

  let clients: ClientRow[] = [];
  let tenantCount = 0;
  try {
    const agency = await prisma.websiteAgency.findUnique({
      where: { id: agencyId },
      include: {
        tenants: {
          include: {
            tenant: {
              include: { _count: { select: { products: true } } },
            },
          },
        },
      },
    });
    if (agency) {
      tenantCount = agency.tenants.length;
      clients = agency.tenants.map((at) => ({
        id: at.tenant.id,
        name: at.tenant.name,
        subdomain: at.tenant.subdomain,
        products: at.tenant._count.products,
        status: at.status,
      }));
    }
  } catch { /* empty */ }

  return (
    <ContentContainer>
      <PageHeader title="Agency Dashboard" description="Manage your clients, websites, and revenue." />

      {clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Generate a website for your first client." icon={Building} />
      ) : (
        <>
          <PageSection>
            <MetricGrid>
              <MetricCard label="Clients" value={tenantCount} icon={Building} />
              <MetricCard label="Websites" value={tenantCount} icon={Globe} />
              <MetricCard label="Staff" value={0} icon={Users} />
              <MetricCard label="Est. Revenue" value="—" icon={IndianRupee} />
            </MetricGrid>
          </PageSection>

          <div className="mb-4"><h2 className="text-lg font-semibold text-white">Recent Clients</h2></div>
          <AgencyClientsTable data={clients} />
        </>
      )}
    </ContentContainer>
  );
}
