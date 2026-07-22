import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building } from "lucide-react";
import { ClientsTable } from "./_components/clients-table";

export const dynamic = "force-dynamic";

interface ClientRow { id: string; name: string; subdomain: string | null; createdAt: Date; plans: number; status: string; }

export default async function AgencyClientsPage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  let clients: ClientRow[] = [];
  try {
    const raw = await prisma.agencyTenant.findMany({
      where: { agencyId },
      include: { tenant: { include: { _count: { select: { products: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    clients = raw.map((at) => ({
      id: at.tenant.id, name: at.tenant.name, subdomain: at.tenant.subdomain,
      createdAt: at.tenant.createdAt, plans: at.tenant._count.products, status: at.status,
    }));
  } catch { /* empty */ }

  return (
    <ContentContainer>
      <PageHeader title="Clients" description="All your managed creator clients." breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Clients" }]} />

      {clients.length === 0 ? (
        <EmptyState title="No clients" description="Generate a website for your first client to get started." icon={Building} />
      ) : (
        <>
          <PageSection>
            <MetricGrid>
              <MetricCard label="Total Clients" value={clients.length} icon={Building} />
              <MetricCard label="Active" value={clients.filter((c) => c.status === "ACTIVE").length} />
            </MetricGrid>
          </PageSection>
          <ClientsTable data={clients} />
        </>
      )}
    </ContentContainer>
  );
}
