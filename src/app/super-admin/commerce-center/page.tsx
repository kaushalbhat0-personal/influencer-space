import { getCommerceStrategyOverview } from "@/actions/commerce-strategy.actions";
import { getPaymentHealthData } from "@/actions/payment-account.actions";
import { getFulfillmentOpsData } from "@/actions/fulfillment.actions";
import { CommerceStrategyCenter } from "./_components/commerce-strategy-center";

export const dynamic = "force-dynamic";

export default async function CommerceStrategyPage() {
  const [data, payment, fulfillment] = await Promise.all([getCommerceStrategyOverview(), getPaymentHealthData(), getFulfillmentOpsData()]);
  if (!data.ok) return <div className="p-8 text-sm text-red-400">{data.error ?? "Unauthorized"}</div>;
  return <CommerceStrategyCenter distribution={data.distribution ?? []} migration={data.migration!} paymentHealth={payment.ok ? payment.health ?? null : null} fulfillmentHealth={fulfillment.ok ? fulfillment.health ?? null : null} />;
}
