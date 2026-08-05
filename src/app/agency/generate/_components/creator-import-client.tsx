"use client";

import { useState } from "react";
import { importCreatorViaAgency } from "@/actions/partner.actions";
import { useRouter } from "next/navigation";
import { getCreatorCommercePlans } from "@/config/commerce/plans";

const PLANS = getCreatorCommercePlans()
  .filter((p) => p.code !== "creator_enterprise")
  .map((p) => ({ code: p.code, name: p.name }));

export function CreatorImportClient({ agencyId }: { agencyId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ creatorName: "", email: "", sourceUrl: "", planCode: "creator_grow" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; inviteUrl?: string } | null>(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    const res = await importCreatorViaAgency({
      creatorName: form.creatorName,
      email: form.email,
      sourceUrl: form.sourceUrl || undefined,
      planCode: form.planCode,
    });
    if (res.success && res.inviteToken) {
      const claimUrl = `/claim-invite?token=${res.inviteToken}&email=${encodeURIComponent(form.email)}`;
      setResult({ ok: true, message: "Creator provisioned and linked to your agency.", inviteUrl: claimUrl });
      router.refresh();
    } else {
      setResult({ ok: false, message: res.error ?? "Import failed" });
    }
    setBusy(false);
  }

  const input = "w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">New Creator</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Creator Name</label>
            <input className={input} value={form.creatorName} onChange={(e) => setForm({ ...form, creatorName: e.target.value })} aria-label="Creator name" data-testid="ci-name" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Creator Email</label>
            <input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Creator email" data-testid="ci-email" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Source URL (optional — YouTube / Instagram)</label>
            <input className={input} value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} aria-label="Source URL" data-testid="ci-source" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Plan</label>
            <select className={input} value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })} aria-label="Plan" data-testid="ci-plan">
              {PLANS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          <button onClick={submit} disabled={busy || !form.creatorName || !form.email} className="rounded-md bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600 disabled:opacity-50" data-testid="ci-submit">
            {busy ? "Provisioning…" : "Provision & Invite"}
          </button>
        </div>

        {result && (
          <div className={`mt-4 rounded-lg p-3 text-xs ${result.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`} data-testid="ci-result">
            <p>{result.message}</p>
            {result.inviteUrl && (
              <p className="mt-2">
                Invitation: <code className="text-emerald-400" data-testid="ci-invite-url">{result.inviteUrl}</code>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 text-xs text-zinc-500 space-y-3">
        <h3 className="text-sm font-semibold text-white">Flow</h3>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Creator Intelligence acquires the profile from the source URL.</li>
          <li>The canonical provisioning runtime creates the workspace + builder + publishing.</li>
          <li>The AgencyTenant relationship is established (your agency ↔ creator).</li>
          <li>A passwordless invitation is generated — the creator sets their own password.</li>
          <li>The creator becomes the workspace owner; you remain the manager.</li>
        </ol>
        <p className="text-zinc-600">No passwords are generated or shared by the agency.</p>
      </div>
    </div>
  );
}
