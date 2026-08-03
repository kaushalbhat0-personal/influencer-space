import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { SubscriptionsTable } from "./_components/subscriptions-table";
import { CreditCard, Crown } from "lucide-react";
import { listAllSubscriptions } from "@/modules/billing/application/plan-source";
import { resolvePlan } from "@/lib/capabilities/plan-resolution";

export const dynamic = "force-dynamic";

const PAID_TIERS = new Set(["pro", "business", "enterprise"]);

export default async function SubscriptionsPage() {
  let subs: { tenantName: string; plan: string; status: string; currentPeriodEnd: string | null; }[] = [];
  let proCount = 0;
  let freeCount = 0;
  try {
    // IMPLEMENTATION-33: Billing v2 with legacy fallback (v2 wins per tenant).
    const rows = await listAllSubscriptions();
    subs = rows.map((r) => ({
      tenantName: r.tenantName,
      plan: r.planDisplay,
      status: r.status === "FREE" ? "FREE" : r.status === "TRIALING" ? "TRIALING" : "ACTIVE",
      currentPeriodEnd: r.currentPeriodEnd,
    }));
    proCount = rows.filter((r) => PAID_TIERS.has(resolvePlan(r.planCode).tier)).length;
    freeCount = rows.length - proCount;
  } catch { /* empty */ }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="mt-1 text-sm text-zinc-400">All tenant subscription plans.</p>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Total Subscriptions" value={subs.length} icon={CreditCard} />
          <MetricCard label="Pro / Agency" value={proCount} icon={Crown} />
          <MetricCard label="Free" value={freeCount} />
        </MetricGrid>
      </PageSection>

      <SubscriptionsTable data={subs} />
    </div>
  );
}
