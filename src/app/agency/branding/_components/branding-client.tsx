"use client";

import { useState } from "react";
import { updateAgencyBranding } from "@/actions/partner.actions";

export function BrandingClient({ agencyId, initial }: { agencyId: string; initial: { primaryColor: string; accentColor: string; supportEmail: string | null; supportPhone: string | null; footerText: string | null } }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  async function save() {
    setBusy(true);
    setNotice(null);
    const result = await updateAgencyBranding({
      agencyId,
      primaryColor: form.primaryColor,
      accentColor: form.accentColor,
      supportEmail: form.supportEmail ?? undefined,
      supportPhone: form.supportPhone ?? undefined,
      footerText: form.footerText ?? undefined,
    });
    setNotice(result.success ? { ok: true, message: "Branding saved." } : { ok: false, message: result.error ?? "Failed to save" });
    setBusy(false);
  }

  const input = "w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200";

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Brand Settings</h3>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Primary Color</label>
          <input className={input} value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} data-testid="brand-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Accent Color</label>
          <input className={input} value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} data-testid="brand-accent" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Support Email</label>
          <input className={input} value={form.supportEmail ?? ""} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} data-testid="brand-email" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Support Phone</label>
          <input className={input} value={form.supportPhone ?? ""} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} data-testid="brand-phone" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-zinc-400 mb-1">Footer Text</label>
          <input className={input} value={form.footerText ?? ""} onChange={(e) => setForm({ ...form, footerText: e.target.value })} data-testid="brand-footer" />
        </div>
      </div>

      <button onClick={save} disabled={busy} className="mt-6 rounded-md bg-[var(--brand-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--primary-hover)] disabled:opacity-50" data-testid="brand-save">
        {busy ? "Saving…" : "Save Branding"}
      </button>
      {notice && (
        <p className={`mt-3 rounded-lg p-2 text-xs ${notice.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`} data-testid="brand-notice">
          {notice.message}
        </p>
      )}
    </div>
  );
}
