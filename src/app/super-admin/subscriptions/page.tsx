import { prisma } from "@/lib/prisma";
import { MetricGrid, PageSection } from "@/components/layout";
import { MetricCard } from "@/components/data/MetricCard";
import { SubscriptionsTable } from "./_components/subscriptions-table";
import { CreditCard, Crown } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  let subs: { tenantName: string; plan: string; status: string; currentPeriodEnd: string | null; }[] = [];
  try {
    const raw = await prisma.subscription.findMany({
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    subs = raw.map((s) => ({
      tenantName: s.tenant?.name ?? "Unknown",
      plan: s.plan,
      status: s.status === "FREE" ? "FREE" : "ACTIVE",
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    }));
  } catch { /* empty */ }

  const proCount = subs.filter((s) => s.plan === "PRO" || s.plan === "AGENCY").length;

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
          <MetricCard label="Free" value={subs.filter((s) => s.plan === "STARTER").length} />
        </MetricGrid>
      </PageSection>

      <SubscriptionsTable data={subs} />
    </div>
  );
}
