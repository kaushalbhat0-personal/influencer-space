import { revenueService } from "@/modules/billing/application/revenue-service";
import { CommissionClient } from "./_components/commission-client";

export const dynamic = "force-dynamic";

export default async function CommissionCenterPage() {
  const config = await revenueService.getCommissionConfig();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Commission Center</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Platform revenue sharing, agency splits, and referral rates — editable by Super Admin.
        </p>
      </div>

      <CommissionClient initial={config} />

      <div className="mt-4 rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">
        <p className="text-xs text-amber-400">
          Commission configuration is read via RevenueService and consumed by BillingService during payment capture. Changes to these values affect future commission calculations only.
        </p>
      </div>
    </div>
  );
}
