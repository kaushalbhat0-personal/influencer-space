"use client";

import { useState } from "react";
import { adminSetSubscription } from "@/actions/super-admin-billing.actions";
import { useRouter } from "next/navigation";

const fmtDate = (v: string | Date) => new Date(v).toISOString().replace("T", " ").slice(0, 10);

type SubRow = { tenantId: string; tenantName: string; planCode: string; plan: string; status: string; currentPeriodEnd: string | null };

export function SubscriptionsClient({
  initial,
  plans,
}: {
  initial: SubRow[];
  /** RCCF-LAUNCH-TRACK-06 (Phase 11): plan options come from the BillingPlan Runtime. */
  plans: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<SubRow[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(tenantId: string, action: "upgrade" | "downgrade" | "cancel" | "resume", planCode?: string) {
    setBusy(`${tenantId}:${action}`);
    const result = await adminSetSubscription(tenantId, action, planCode);
    if (result.success) {
      setNotice(`${action} succeeded`);
      router.refresh();
    } else {
      setNotice(`${action} failed: ${result.error}`);
    }
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      {notice && (
        <p className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-zinc-300" data-testid="subs-notice">
          {notice}
        </p>
      )}
      <div className="overflow-x-auto admin-card">
        <table className="w-full text-sm" data-testid="subscriptions-table">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-zinc-500">
              <th className="px-3 py-2">Tenant</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Renews</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tenantId} className="border-b border-white/5" data-subscription={r.tenantId}>
                <td className="px-3 py-2 text-zinc-300">{r.tenantName}</td>
                <td className="px-3 py-2 text-zinc-400">{r.plan}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${r.status === "CANCELLED" ? "bg-red-500/10 text-red-400" : r.status === "TRIALING" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-500 text-xs">{r.currentPeriodEnd ? fmtDate(r.currentPeriodEnd) : "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      defaultValue={r.planCode}
                      onChange={(e) => run(r.tenantId, e.target.value === r.planCode ? "upgrade" : "downgrade", e.target.value)}
                      disabled={busy !== null}
                      aria-label={`Set plan for ${r.tenantName}`}
                      className="rounded border border-white/10 bg-zinc-900 px-1.5 py-1 text-[10px] text-zinc-300 disabled:opacity-50"
                    >
                      {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                    </select>
                    {r.status === "CANCELLED" ? (
                      <button onClick={() => run(r.tenantId, "resume")} disabled={busy !== null} className="rounded bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50" data-testid="subs-resume">
                        Resume
                      </button>
                    ) : (
                      <button onClick={() => run(r.tenantId, "cancel")} disabled={busy !== null} className="rounded bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20 disabled:opacity-50" data-testid="subs-cancel">
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
