import { revenueService } from "@/modules/billing/application/revenue-service";
import { BillingSettingsClient } from "./_components/billing-settings-client";

export const dynamic = "force-dynamic";

export default async function BillingSettingsPage() {
  const settings = await revenueService.getBillingSettings();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Billing Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Global billing defaults, trial configuration, and invoice preferences — editable by Super Admin.
        </p>
      </div>

      <BillingSettingsClient initial={settings} />

      <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Architecture Note</h3>
        <p className="text-xs text-zinc-500">
          These settings are consumed by BillingService during checkout, subscription lifecycle, and invoice generation. Changes affect future billing operations only. Historical invoices are immutable.
        </p>
      </div>
    </div>
  );
}
