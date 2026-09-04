import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building, Activity, Globe, AlertTriangle } from "lucide-react";
import { clientService } from "@/lib/client/service";
import { ClientsTable } from "./_components/clients-table";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgencyClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const query = searchParams.q ?? "";
  const statusFilter = searchParams.status ?? "";

  let clients = await clientService.listByAgency(agencyId);

  if (query) {
    clients = await clientService.search(agencyId, query);
  }

  if (statusFilter) {
    clients = clients.filter((c) => c.status === statusFilter);
  }

  return (
    <ContentContainer>
      <PageHeader
        title="Clients"
        description="All your managed creator clients."
        breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Clients" }]}
        actions={
          <Link href="/agency/clients/new" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-black hover:opacity-90">
            + New Client
          </Link>
        }
      />

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total" value={clients.length} icon={Building} />
        <MetricCard label="Active" value={clients.filter((c) => c.status === "active").length} icon={Activity} />
        <MetricCard label="Published" value={clients.filter((c) => c.publishState === "live").length} icon={Globe} />
        <MetricCard label="Needs Attention" value={clients.filter((c) => c.healthScore != null && c.healthScore < 50).length} icon={AlertTriangle} />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Building}
          title={query ? "No matching clients" : "No clients yet"}
          description={query ? "Try a different search term." : "Create your first client to get started."}
          action={
            !query ? (
              <Link href="/agency/clients/new" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-black hover:opacity-90">
                Create Client
              </Link>
            ) : undefined
          }
        />
      ) : (
        <PageSection>
          <ClientsTable
            data={clients.map((c) => ({
              id: c.tenantId,
              name: c.businessName,
              subdomain: null,
              createdAt: c.createdAt,
              plans: c.websiteCount,
              status: c.status,
              healthScore: c.healthScore,
              publishState: c.publishState,
            }))}
          />
        </PageSection>
      )}
    </ContentContainer>
  );
}
