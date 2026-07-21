import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { DataTable } from "@/components/data/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Building } from "lucide-react";
import Link from "next/link";
import type { Column } from "@/components/data/DataTable";

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

  const cols: Column<ClientRow>[] = [
    { key: "name", header: "Name", sortable: true, cell: (r) => (
      <Link href={`/super-admin/tenants/${r.id}`} className="text-s8ul-cyan hover:underline text-sm">{r.name}</Link>
    )},
    { key: "subdomain", header: "Domain", sortable: true, cell: (r) => <span className="text-zinc-400 text-xs font-mono">{r.subdomain ?? "—"}</span> },
    { key: "createdAt", header: "Created", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span> },
    { key: "status", header: "Status", sortable: true, cell: (r) => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>{r.status}</span>
    )},
  ];

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
          <DataTable columns={cols} data={clients} pageSize={20} searchable searchPlaceholder="Search clients..." emptyMessage="No clients found." />
        </>
      )}
    </ContentContainer>
  );
}
