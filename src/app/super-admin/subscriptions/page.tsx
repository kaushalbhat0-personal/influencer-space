import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { CreditCard, Crown } from "lucide-react";
import { listAllSubscriptions } from "@/modules/billing/application/plan-source";
import { resolvePlan } from "@/lib/capabilities/plan-resolution";
import { SubscriptionsClient } from "./_components/subscriptions-client";

export const dynamic = "force-dynamic";

const PAID_TIERS = new Set(["pro", "business", "enterprise"]);

export default async function SubscriptionsPage() {
  const rows = await listAllSubscriptions().catch(() => []);
  let proCount = 0;
  let freeCount = 0;

  const subs = rows.map((r) => ({
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    planCode: r.planCode ?? "creator_launch",
    plan: r.planDisplay,
    status: r.status === "FREE" ? "FREE" : r.status === "TRIALING" ? "TRIALING" : r.status ?? "ACTIVE",
    currentPeriodEnd: r.currentPeriodEnd,
  }));
  proCount = rows.filter((r) => r.planCode && PAID_TIERS.has(resolvePlan(r.planCode).tier)).length;
  freeCount = rows.length - proCount;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="mt-1 text-sm text-zinc-400">All tenant subscription plans — operable through BillingService.</p>
      </div>

      <PageSection>
        <MetricGrid>
          <MetricCard label="Total Subscriptions" value={subs.length} icon={CreditCard} />
          <MetricCard label="Paid Plans" value={proCount} icon={Crown} />
          <MetricCard label="Free" value={freeCount} />
        </MetricGrid>
      </PageSection>

      <SubscriptionsClient initial={subs} />
    </div>
  );
}
