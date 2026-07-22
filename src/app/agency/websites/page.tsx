import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrlWithTenant } from "@/lib/config/platform";
import { ContentContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Globe } from "lucide-react";
import { WebsitesTable } from "./_components/websites-table";

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
      url: buildStorefrontUrlWithTenant(at.tenant.customDomain, at.tenant.subdomain),
      products: at.tenant._count.products,
      isActive: at.status === "ACTIVE",
    }));
  } catch { /* empty */ }

  return (
    <ContentContainer>
      <PageHeader title="Websites" description="All managed creator websites." breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Websites" }]} />
      {sites.length === 0 ? <EmptyState title="No websites" description="Generate websites for your clients." icon={Globe} /> : (
        <WebsitesTable data={sites} />
      )}
    </ContentContainer>
  );
}
