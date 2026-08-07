import { getRevenueCenterData } from "@/actions/revenue-runtime.actions";
import { RevenueCenterClient } from "./_components/revenue-center-client";

export const dynamic = "force-dynamic";

export default async function RevenueCenterPage() {
  const data = await getRevenueCenterData();

  if (!data.ok) {
    return <div className="p-8 text-sm text-red-400">{data.error ?? "Unauthorized"}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Revenue Center</h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-400">
        Recurring subscription revenue from the runtime: platform revenue, agency revenue share, settlements and
        payouts. Creators keep 100% of product revenue — no transaction fees.
      </p>
      <RevenueCenterClient
        platform={data.platform!}
        health={data.health!}
        payouts={data.payouts!}
        payoutSummary={data.payoutSummary!}
        settlements={data.settlements ?? []}
        commissionEntries={data.commissionEntries ?? []}
      />
    </div>
  );
}
