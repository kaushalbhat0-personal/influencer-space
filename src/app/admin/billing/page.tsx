import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { getPlanLimits } from "@/lib/feature-gate";
import { BillingClient } from "./_components/billing-client";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const tenant = await getTenantContext();
  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No tenant configured.</p>
      </div>
    );
  }

  let subscription = await prisma.subscription.findUnique({
    where: { tenantId: tenant.id },
  });

  if (!subscription) {
    subscription = {
      id: "",
      tenantId: tenant.id,
      razorpaySubscriptionId: null,
      status: "FREE",
      plan: "STARTER",
      currentPeriodEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const productCount = await prisma.product.count({ where: { tenantId: tenant.id } });
  const plan = await getPlanLimits(tenant.id);

  return <BillingClient subscription={subscription} productCount={productCount} planInfo={plan} />;
}
