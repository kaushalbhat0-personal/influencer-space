import { revenueService } from "@/modules/billing/application/revenue-service";
import { Settings, IndianRupee, Clock, FileText, RefreshCw, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

function Field({ label, value, icon }: { label: string; value: string | number | boolean; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-zinc-500">{icon}</span>
        <span className="text-sm text-zinc-300">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">
        {typeof value === "boolean" ? (value ? "Enabled" : "Disabled") : String(value)}
      </span>
    </div>
  );
}

export default async function BillingSettingsPage() {
  const settings = await revenueService.getBillingSettings();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Billing Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Global billing defaults, trial configuration, and invoice preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">General</h3>
          <div className="space-y-2">
            <Field label="Default Currency" value={settings.defaultCurrency} icon={<IndianRupee className="h-3.5 w-3.5" />} />
            <Field label="Default Trial Days" value={settings.defaultTrialDays} icon={<Clock className="h-3.5 w-3.5" />} />
            <Field label="Grace Period (days)" value={settings.gracePeriodDays} icon={<Clock className="h-3.5 w-3.5" />} />
            <Field label="Auto-renew" value={settings.autoRenew} icon={<RefreshCw className="h-3.5 w-3.5" />} />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Invoicing & Compliance</h3>
          <div className="space-y-2">
            <Field label="Invoice Prefix" value={settings.invoicePrefix} icon={<FileText className="h-3.5 w-3.5" />} />
            <Field label="Refund Window (days)" value={settings.refundWindowDays} icon={<Shield className="h-3.5 w-3.5" />} />
            <Field label="Proration" value={settings.prorationEnabled} icon={<Settings className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Architecture Note</h3>
        <p className="text-xs text-zinc-500">
          These settings are consumed by BillingService during checkout, subscription lifecycle, and invoice generation. Changes affect future billing operations only. Historical invoices are immutable.
        </p>
      </div>
    </div>
  );
}
