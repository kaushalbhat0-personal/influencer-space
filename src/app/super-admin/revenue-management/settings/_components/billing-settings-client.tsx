"use client";

import { useState } from "react";
import { adminUpdateRevenueSettings } from "@/actions/super-admin-billing.actions";
import { useRouter } from "next/navigation";

type Settings = {
  defaultCurrency: string;
  defaultTrialDays: number;
  gracePeriodDays: number;
  invoicePrefix: string;
  autoRenew: boolean;
  refundWindowDays: number;
  prorationEnabled: boolean;
};

export function BillingSettingsClient({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const result = await adminUpdateRevenueSettings(form);
    if (result.success) {
      setNotice({ ok: true, message: "Billing settings saved." });
      router.refresh();
    } else {
      setNotice({ ok: false, message: result.error ?? "Failed to save" });
    }
    setSaving(false);
  }

  const input = "rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 w-40";
  const row = "flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3";

  return (
    <div className="space-y-4">
      {notice && (
        <p data-testid="billing-settings-notice" className={`rounded-lg p-2 text-xs ${notice.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
          {notice.message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-4">General</h3>
          <div className={row}><span className="text-sm text-zinc-300">Default Currency</span>
            <input className={input} value={form.defaultCurrency} onChange={(e) => set("defaultCurrency", e.target.value)} aria-label="Default currency" data-testid="bs-currency" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Default Trial Days</span>
            <input className={input} type="number" min={0} value={form.defaultTrialDays} onChange={(e) => set("defaultTrialDays", Number(e.target.value))} aria-label="Trial days" data-testid="bs-trial" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Grace Period (days)</span>
            <input className={input} type="number" min={0} value={form.gracePeriodDays} onChange={(e) => set("gracePeriodDays", Number(e.target.value))} aria-label="Grace period" data-testid="bs-grace" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Auto-renew</span>
            <input type="checkbox" checked={form.autoRenew} onChange={(e) => set("autoRenew", e.target.checked)} aria-label="Auto renew" data-testid="bs-autorenew" /></div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-4">Invoicing & Compliance</h3>
          <div className={row}><span className="text-sm text-zinc-300">Invoice Prefix</span>
            <input className={input} value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} aria-label="Invoice prefix" data-testid="bs-prefix" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Refund Window (days)</span>
            <input className={input} type="number" min={0} value={form.refundWindowDays} onChange={(e) => set("refundWindowDays", Number(e.target.value))} aria-label="Refund window" data-testid="bs-refund" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Proration</span>
            <input type="checkbox" checked={form.prorationEnabled} onChange={(e) => set("prorationEnabled", e.target.checked)} aria-label="Proration" data-testid="bs-proration" /></div>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="rounded-md bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600 disabled:opacity-50" data-testid="bs-save">
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}
