import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer, PageHeader, MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { IndianRupee, FileText, CreditCard, TrendingUp } from "lucide-react";
import { billingRepository } from "@/modules/billing/infrastructure/repository";

export const dynamic = "force-dynamic";

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AgencyBilling() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">No agency configured</p></ContentContainer>;

  const wsRecords = await prisma.workspace.findMany({ where: { agencyId }, select: { id: true } });
  const wsIds = wsRecords.map((w) => w.id);

  const [invoiceData, subscriptionData] = await Promise.all([
    wsIds.length > 0 ? billingRepository.findInvoicesByWorkspaceIds(wsIds, 20) : Promise.resolve([]),
    wsIds.length > 0 ? billingRepository.findSubscriptionsByWorkspaceIds(wsIds) : Promise.resolve([]),
  ]);

  const totalRevenue = invoiceData.reduce((s, i) => s + i.amount, 0);
  const activeSubs = subscriptionData.filter((s) => s.status === "ACTIVE" || s.status === "TRIALING");

  return (
    <ContentContainer>
      <PageHeader title="Billing" description="Client subscriptions and revenue."
        breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Billing" }]} />

      <PageSection>
        <MetricGrid>
          <MetricCard label="Total Revenue" value={formatRupees(totalRevenue)} icon={IndianRupee} />
          <MetricCard label="Active Subscriptions" value={activeSubs.length} icon={CreditCard} />
          <MetricCard label="Invoices" value={invoiceData.length} icon={FileText} />
          <MetricCard label="Avg per Client" value={wsIds.length > 0 ? formatRupees(Math.round(totalRevenue / wsIds.length)) : "—"} icon={TrendingUp} />
        </MetricGrid>
      </PageSection>

      {invoiceData.length > 0 && (
        <PageSection>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Invoices</h2>
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
                    <td><span className="text-xs text-zinc-500">{new Date(inv.createdAt).toLocaleDateString("en-IN")}</span></td>
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
          <p className="text-sm text-zinc-500">No billing data yet. Invoices appear when clients subscribe.</p>
        </div>
      )}
    </ContentContainer>
  );
}
