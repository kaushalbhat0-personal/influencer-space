import { getCommerceStrategyOverview } from "@/actions/commerce-strategy.actions";
import { CommerceStrategyCenter } from "./_components/commerce-strategy-center";

export const dynamic = "force-dynamic";

export default async function CommerceStrategyPage() {
  const data = await getCommerceStrategyOverview();
  if (!data.ok) return <div className="p-8 text-sm text-red-400">{data.error ?? "Unauthorized"}</div>;
  return <CommerceStrategyCenter distribution={data.distribution ?? []} migration={data.migration!} />;
}
