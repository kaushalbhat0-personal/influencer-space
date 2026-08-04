"use client";

import { useState } from "react";
import { adminUpdateCommissionConfig } from "@/actions/super-admin-billing.actions";
import { useRouter } from "next/navigation";

type Commission = { agencyClientPercent: number; platformPercent: number; referralPercent: number; creatorDefaultShare: number; agencyDefaultShare: number };

export function CommissionClient({ initial }: { initial: Commission }) {
  const router = useRouter();
  const [form, setForm] = useState<Commission>(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  function set<K extends keyof Commission>(key: K, value: number) {
    setForm((f) => ({ ...f, [key]: Math.max(0, Math.min(100, value)) }));
  }

  async function save() {
    setSaving(true);
    const result = await adminUpdateCommissionConfig(form);
    if (result.success) {
      setNotice({ ok: true, message: "Commission settings saved." });
      router.refresh();
    } else {
      setNotice({ ok: false, message: result.error ?? "Failed to save" });
    }
    setSaving(false);
  }

  const input = "rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 w-20";
  const row = "flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3";

  return (
    <div className="space-y-4">
      {notice && (
        <p data-testid="commission-notice" className={`rounded-lg p-2 text-xs ${notice.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
          {notice.message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue Sharing</h3>
          <div className={row}><span className="text-sm text-zinc-300">Agency Client Revenue Share</span>
            <input className={input} type="number" min={0} max={100} value={form.agencyClientPercent} onChange={(e) => set("agencyClientPercent", Number(e.target.value))} aria-label="Agency client share" data-testid="com-agency" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Platform Fee</span>
            <input className={input} type="number" min={0} max={100} value={form.platformPercent} onChange={(e) => set("platformPercent", Number(e.target.value))} aria-label="Platform fee" data-testid="com-platform" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Referral Commission</span>
            <input className={input} type="number" min={0} max={100} value={form.referralPercent} onChange={(e) => set("referralPercent", Number(e.target.value))} aria-label="Referral commission" data-testid="com-referral" /></div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-4">Default Splits</h3>
          <div className={row}><span className="text-sm text-zinc-300">Creator Default Share</span>
            <input className={input} type="number" min={0} max={100} value={form.creatorDefaultShare} onChange={(e) => set("creatorDefaultShare", Number(e.target.value))} aria-label="Creator share" data-testid="com-creator" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Agency Default Share</span>
            <input className={input} type="number" min={0} max={100} value={form.agencyDefaultShare} onChange={(e) => set("agencyDefaultShare", Number(e.target.value))} aria-label="Agency share" data-testid="com-agencyshare" /></div>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="rounded-md bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600 disabled:opacity-50" data-testid="com-save">
        {saving ? "Saving…" : "Save Commission Settings"}
      </button>
    </div>
  );
}
