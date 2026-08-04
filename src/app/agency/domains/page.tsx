import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { prisma } from "@/lib/prisma";
import { Globe, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgencyDomainsPage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;

  const links = agencyId
    ? await prisma.agencyTenant.findMany({
        where: { agencyId, status: "ACTIVE" },
        include: { tenant: { select: { name: true, subdomain: true, customDomain: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const withCustom = links.filter((l) => l.tenant.customDomain).length;

  return (
    <ContentContainer>
      <PageHeader title="Domains" description="Custom domains across the creators your agency manages."
        breadcrumbs={[{ label: "Agency", href: "/agency" }, { label: "Domains" }]} />

      <MetricGrid>
        <MetricCard label="Managed Creators" value={links.length} icon={Globe} />
        <MetricCard label="Custom Domains" value={withCustom} icon={CheckCircle2} />
        <MetricCard label="Subdomain Only" value={links.length - withCustom} icon={Clock} />
      </MetricGrid>

      <div className="admin-card mt-6 overflow-hidden">
        <table className="admin-table" data-testid="agency-domains-table">
          <thead>
            <tr>
              <th>Creator</th>
              <th>Subdomain</th>
              <th>Custom Domain</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 && (
              <tr><td colSpan={3} className="p-4 text-center text-xs text-zinc-600">No managed creators yet.</td></tr>
            )}
            {links.map((l) => (
              <tr key={l.id} data-tenant={l.tenantId}>
                <td className="text-sm text-white">{l.tenant.name}</td>
                <td className="text-xs text-zinc-500">{l.tenant.subdomain}</td>
                <td className="text-xs text-zinc-500">{l.tenant.customDomain ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContentContainer>
  );
}
