import { revenueService } from "@/modules/billing/application/revenue-service";
import { Percent } from "lucide-react";

export const dynamic = "force-dynamic";

function Field({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
      <span className="text-sm text-zinc-300">{label}</span>
      <span className="text-sm font-semibold text-white">{value}{suffix ?? "%"}</span>
    </div>
  );
}

export default async function CommissionCenterPage() {
  const config = await revenueService.getCommissionConfig();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Commission Center</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Platform revenue sharing, agency splits, and referral rates.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agency & Platform */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue Sharing</h3>
          <div className="space-y-2">
            <Field label="Agency Client Revenue Share" value={config.agencyClientPercent} />
            <Field label="Platform Fee" value={config.platformPercent} />
            <Field label="Referral Commission" value={config.referralPercent} />
          </div>
        </div>

        {/* Creator & Agency Defaults */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Default Splits</h3>
          <div className="space-y-2">
            <Field label="Creator Default Share" value={config.creatorDefaultShare} />
            <Field label="Agency Default Share" value={config.agencyDefaultShare} />
          </div>
          <div className="mt-4 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
            <p className="text-xs text-amber-400">
              Commission configuration is read via RevenueService and consumed by BillingService during payment capture. Changes to these values affect future commission calculations only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
