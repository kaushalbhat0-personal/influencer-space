import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
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
      <PageHeader title="Domains" description="Custom domains across your client websites."
        breadcrumbs={[{ label: "Agency", href: "/agency" }, { label: "Domains" }]} />

      <MetricGrid>
        <MetricCard label="Client Websites" value={links.length} icon={Globe} />
        <MetricCard label="Custom Domains" value={withCustom} icon={CheckCircle2} />
        <MetricCard label="Subdomain Only" value={links.length - withCustom} icon={Clock} />
      </MetricGrid>

      {links.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Globe}
            title="No client websites yet"
            description="Domains appear after you create client websites."
            action={<a href="/agency/generate" className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-xs font-semibold text-black hover:opacity-90">Create Client Website</a>}
          />
        </div>
      ) : (
      <div className="admin-card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="admin-table" data-testid="agency-domains-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Subdomain</th>
              <th>Custom Domain</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 && (
              <tr><td colSpan={3} className="p-4 text-center text-xs text-[var(--text-muted)]">No client websites yet.</td></tr>
            )}
            {links.map((l) => (
              <tr key={l.id} data-tenant={l.tenantId}>
                <td className="text-sm text-white">{l.tenant.name}</td>
                <td className="text-xs text-[var(--text-muted)]">{l.tenant.subdomain}</td>
                <td className="text-xs text-[var(--text-muted)]">{l.tenant.customDomain ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      )}
    </ContentContainer>
  );
}
