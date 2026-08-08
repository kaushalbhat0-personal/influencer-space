import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { IndianRupee, FileText, CreditCard, TrendingUp, Users } from "lucide-react";
import { billingRepository } from "@/modules/billing/infrastructure/repository";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { capabilityService } from "@/lib/capabilities";
import { partnerService } from "@/modules/partner/application/partner";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatRupees(amount: number): string {
  return formatCurrency(amount);
}

export default async function AgencyBilling() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">No agency configured</p></ContentContainer>;

  const wsRecords = await prisma.workspace.findMany({ where: { agencyId }, select: { id: true } });
  const wsIds = wsRecords.map((w) => w.id);

  const [invoiceData, subscriptionData, agencyWs, managedCreators, partner] = await Promise.all([
    wsIds.length > 0 ? billingRepository.findInvoicesByWorkspaceIds(wsIds, 20) : Promise.resolve([]),
    wsIds.length > 0 ? billingRepository.findSubscriptionsByWorkspaceIds(wsIds) : Promise.resolve([]),
    wsRecords[0] ? resolveActivePlan(wsRecords[0]?.id, undefined) : Promise.resolve({ code: null, origin: "none" as const, status: null }),
    prisma.agencyTenant.count({ where: { agencyId, status: "ACTIVE" } }),
    partnerService.getById(agencyId),
  ]);

  const activeSubs = subscriptionData.filter((s) => s.status === "ACTIVE" || s.status === "TRIALING");
  const creatorLimit = agencyWs.code ? capabilityService.limit(agencyWs.code, "max_clients") : 1;
  const limitLabel = creatorLimit === -1 ? "Unlimited" : String(creatorLimit);
  const displayName = agencyWs.code ? capabilityService.getPlan(agencyWs.code)?.name ?? agencyWs.code : "Partner Free";

  return (
    <ContentContainer>
      <PageHeader title="Billing" description="Your partner plan and the creators you manage."
        breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Billing" }]} />

      <PageSection>
        <MetricGrid>
          <MetricCard label="Partner Tier" value={displayName} icon={CreditCard} subtext={`Renews ${subscriptionData[0]?.renewsAt ? new Date(subscriptionData[0].renewsAt).toISOString().slice(0, 10) : "per your plan"}`} />
          <MetricCard label="Managed Creators" value={managedCreators} icon={Users} subtext={`Limit: ${limitLabel}`} />
          <MetricCard label="Creator Subscriptions" value={activeSubs.length} icon={TrendingUp} />
          <MetricCard label="Creator Invoices" value={invoiceData.length} icon={FileText} />
        </MetricGrid>
      </PageSection>

      {/* Honest policy — creators pay CreatorStore directly (Phase 5) */}
      <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/50 p-5 text-sm text-zinc-400" data-testid="partner-subscription-policy">
        <p className="font-medium text-zinc-200">Creator Subscription Policy</p>
        <ul className="mt-2 space-y-1.5 text-xs text-zinc-500" role="list">
          <li>Every creator pays CreatorStore directly for their own Creator plan (Creator Grow minimum for partner-onboarded creators).</li>
          <li>The invoices below are the creators&apos; subscriptions billed by CreatorStore — they are not your revenue.</li>
          <li>You may charge clients separately for setup, migration, training, branding, consulting and maintenance.</li>
        </ul>
      </div>

      {invoiceData.length > 0 && (
        <PageSection>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Creator Subscriptions (billed to CreatorStore)</h2>
          <div className="admin-card overflow-hidden">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.map((inv) => (
                  <tr key={inv.id}>
                    <td><span className="text-white text-sm">{inv.planCode}</span></td>
                    <td><span className="text-zinc-300">{formatRupees(inv.amount)}</span></td>
                    <td>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        inv.status === "PAID" ? "bg-emerald-500/20 text-emerald-400" :
                        inv.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>{inv.status}</span>
                    </td>
                    <td><span className="text-xs text-zinc-500">{new Date(inv.createdAt).toISOString().slice(0, 10)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageSection>
      )}

      {invoiceData.length === 0 && (
        <div className="admin-card p-8 text-center">
          <CreditCard className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No creator subscriptions yet. They appear when your managed creators subscribe.</p>
        </div>
      )}

      <PageSection>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recurring Revenue</h2>
        <div className="admin-card p-5 text-sm text-zinc-500" data-testid="partner-rewards">
          You earn a recurring share of every creator subscription you onboard. Your clients pay CreatorStore directly for
          their own Creator plan; the platform shares a percentage of that subscription with you — no transaction fees, no
          manual invoicing. See your earnings on the Agency Dashboard.
        </div>
      </PageSection>
    </ContentContainer>
  );
}
