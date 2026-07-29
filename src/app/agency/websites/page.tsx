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
      <PageHeader title="Websites" description="All managed creator websites." breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Websites" }]} />
      {sites.length === 0 ? <EmptyState title="No websites" description="Generate websites for your clients." icon={Globe} /> : (
        <WebsitesTable data={sites} />
      )}
    </ContentContainer>
  );
}
