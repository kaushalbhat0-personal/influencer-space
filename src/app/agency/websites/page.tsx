import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrlWithTenant } from "@/lib/config/platform";
import { ContentContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Globe } from "lucide-react";
import { WebsitesTable } from "./_components/websites-table";
import { getAgencyClients } from "@/lib/workspace/adapters";

export const dynamic = "force-dynamic";

interface WebsiteRow { name: string; url: string; products: number; isActive: boolean; }

export default async function AgencyWebsitesPage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const clients = await getAgencyClients(agencyId);

  const sites: WebsiteRow[] = clients.map((c) => ({
    name: c.tenantName,
    url: buildStorefrontUrlWithTenant(null, c.subdomain ?? ""),
    products: c.products,
    isActive: c.status === "ACTIVE",
  }));

  return (
    <ContentContainer>
      <PageHeader title="Websites" description="All managed client websites." breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Websites" }]} />
      {sites.length === 0 ? <EmptyState title="No client websites yet" description="Create your first client website to generate a site." icon={Globe} action={<a href="/agency/generate" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-black hover:opacity-90">Create Client Website</a>} /> : (
        <WebsitesTable data={sites} />
      )}
    </ContentContainer>
  );
}
