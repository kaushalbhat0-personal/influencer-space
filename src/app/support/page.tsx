import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader, MetricGrid } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { prisma } from "@/lib/prisma";
import { getOperationsSnapshotAction } from "@/actions/operations.actions";
import { revenueService } from "@/modules/billing/application/revenue-service";
import { SupportSearch } from "./_components/support-search";
import { Users, Globe, CreditCard, Activity, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * IMPLEMENTATION-41: read-only support console for SUPPORT / READ_ONLY roles.
 * No mutations anywhere — every write path is separately gated by role.
 */
export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPPORT" && role !== "READ_ONLY" && role !== "SUPER_ADMIN") {
    return <p className="p-8 text-sm text-red-400">Unauthorized</p>;
  }

  const [snapshot, revenue, tenantCount, userCount, agencyCount] = await Promise.all([
    getOperationsSnapshotAction().catch(() => null),
    revenueService.getRevenueDashboard().catch(() => null),
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.websiteAgency.count(),
  ]);

  return (
    <ContentContainer>
      <PageHeader title="Support Console" description="Read-only platform view — no mutations."
        breadcrumbs={[{ label: "Support" }]} />

      <MetricGrid>
        <MetricCard label="Tenants" value={tenantCount} icon={Users} />
        <MetricCard label="Users" value={userCount} icon={Activity} />
        <MetricCard label="Agencies / Partners" value={agencyCount} icon={Building2} />
        <MetricCard label="Published Sites" value={snapshot?.publishing.websites ?? 0} icon={Globe} />
        <MetricCard label="Active Subs" value={revenue?.activeSubscribers ?? 0} icon={CreditCard} />
        <MetricCard label="MRR" value={revenue ? `₹${revenue.mrr.toLocaleString("en-IN")}` : "—"} icon={CreditCard} />
      </MetricGrid>

      <div className="mt-6" data-testid="support-console">
        <SupportSearch />
      </div>
    </ContentContainer>
  );
}
