import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader } from "@/components/layout";
import { DataTable } from "@/components/data/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Globe } from "lucide-react";
import type { Column } from "@/components/data/DataTable";

export const dynamic = "force-dynamic";

interface WebsiteRow { name: string; url: string; products: number; isActive: boolean; }

export default async function AgencyWebsitesPage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  let sites: WebsiteRow[] = [];
  try {
    const raw = await prisma.agencyTenant.findMany({
      where: { agencyId }, include: { tenant: { include: { _count: { select: { products: true } } } } },
    });
    sites = raw.map((at) => ({
      name: at.tenant.name,
      url: at.tenant.customDomain ?? `${at.tenant.subdomain}.creatorspace.app`,
      products: at.tenant._count.products,
      isActive: at.status === "ACTIVE",
    }));
  } catch { /* empty */ }

  const cols: Column<WebsiteRow>[] = [
    { key: "name", header: "Creator", sortable: true, cell: (r) => <span className="text-white text-sm">{r.name}</span> },
    { key: "url", header: "URL", sortable: true, cell: (r) => (
      <a href={`https://${r.url}`} target="_blank" rel="noopener noreferrer" className="text-s8ul-cyan hover:underline text-xs font-mono">{r.url}</a>
    )},
    { key: "products", header: "Products", sortable: true, cell: (r) => <span className="text-zinc-300">{r.products}</span> },
    { key: "isActive", header: "Active", sortable: true, cell: (r) => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.isActive ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>{r.isActive ? "Active" : "Inactive"}</span>
    )},
  ];

  return (
    <ContentContainer>
      <PageHeader title="Websites" description="All managed creator websites." breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Websites" }]} />
      {sites.length === 0 ? <EmptyState title="No websites" description="Generate websites for your clients." icon={Globe} /> : (
        <DataTable columns={cols} data={sites} pageSize={20} searchable searchPlaceholder="Search websites..." />
      )}
    </ContentContainer>
  );
}
