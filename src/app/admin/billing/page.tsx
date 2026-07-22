import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPlanLimits } from "@/lib/feature-gate";
import { BillingClient } from "./_components/billing-client";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No tenant configured.</p>
      </div>
    );
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
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

  return (
    <BillingClient
      subscription={{
        id: subscription.id,
        tenantId: subscription.tenantId,
        razorpaySubscriptionId: subscription.razorpaySubscriptionId,
        status: subscription.status,
        plan: subscription.plan,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      }}
      productCount={productCount}
      planInfo={plan}
    />
  );
}
