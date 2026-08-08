"use client";

import { useState } from "react";
import { createSettlementAction, updateSettlementAction, createPayoutAction, approvePayoutAction, processPayoutAction, retryPayoutAction } from "@/actions/revenue-runtime.actions";
import { formatCurrency } from "@/lib/utils";

export interface PlatformSummary {
  platformRevenue: number; agencyRevenue: number; totalSubscriptions: number;
  commissionEntries: number; pendingSettlements: number; paidPayouts: number;
  topAgencies: Array<{ partnerId: string; revenue: number }>;
}
export interface RuntimeHealth { id: string; label: string; status: "healthy" | "warning" | "broken"; detail: string }
export interface PayoutRow { id: string; partnerId: string; status: string; provider: string; total: number; netAmount: number; entryCount: number; providerReference: string | null; failureReason: string | null; createdAt: string; metadata: Record<string, string>; audit: Record<string, unknown> }
export interface PayoutSummary { pending: number; approved: number; processing: number; paid: number; failed: number; totalPaid: number }
export interface SettlementRow { id: string; partnerId: string; partnerName: string | null; status: string; totalAmount: number; netAmount: number; entryCount: number; settlementRef: string; createdAt: string }
export interface CommissionRow { id: string; partnerId: string; planCode: string; amount: number; platformShare: number; partnerShare: number; status: string; createdAt: string }

interface Props {
  platform: PlatformSummary;
  health: RuntimeHealth[];
  payouts: { items: PayoutRow[]; total: number };
  payoutSummary: PayoutSummary;
  settlements: SettlementRow[];
  commissionEntries: CommissionRow[];
}

const inr = (n: number) => formatCurrency(n ?? 0);

export function RevenueCenterClient({ platform, health, payouts, payoutSummary, settlements, commissionEntries }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState("");

  const run = async (key: string, fn: () => Promise<{ success: boolean; error?: string }>) => {
    setBusy(key); setMsg(null);
    const r = await fn();
    setMsg(r.success ? "Done. Refreshing…" : (r.error ?? "Failed"));
    if (r.success) setTimeout(() => window.location.reload(), 700);
    setBusy(null);
  };

  return (
    <div className="mt-6 space-y-6">
      {msg && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm text-emerald-300">{msg}</div>}

      {/* Health */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {health.map((h) => (
          <div key={h.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${h.status === "healthy" ? "bg-emerald-400" : h.status === "warning" ? "bg-amber-400" : "bg-red-400"}`} />
              <p className="text-xs font-semibold text-white">{h.label}</p>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">{h.detail}</p>
          </div>
        ))}
      </div>

      {/* Platform revenue */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card label="Platform revenue" value={inr(platform.platformRevenue)} />
        <Card label="Agency revenue" value={inr(platform.agencyRevenue)} />
        <Card label="Subscriptions" value={String(platform.totalSubscriptions)} />
        <Card label="Commission entries" value={String(platform.commissionEntries)} />
        <Card label="Pending settlements" value={String(platform.pendingSettlements)} />
        <Card label="Paid payouts" value={String(platform.paidPayouts)} />
      </div>

      {platform.topAgencies.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Top agencies by revenue</h2>
          <div className="space-y-1.5">
            {platform.topAgencies.map((a) => (
              <div key={a.partnerId} className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-mono">{a.partnerId.slice(0, 12)}</span>
                <span className="text-zinc-200">{inr(a.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payouts */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Payout queue</h2>
          <div className="flex gap-3 text-[11px] text-zinc-500">
            <span>pending {payoutSummary.pending}</span>
            <span>approved {payoutSummary.approved}</span>
            <span>processing {payoutSummary.processing}</span>
            <span className="text-emerald-400">paid {payoutSummary.paid}</span>
            <span className="text-red-400">failed {payoutSummary.failed}</span>
          </div>
        </div>
        <div className="space-y-2">
          {payouts.items.length === 0 && <p className="text-xs text-zinc-500">No payouts yet.</p>}
          {payouts.items.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.04] bg-zinc-900/50 px-3 py-2 text-xs">
              <div>
                <p className="text-zinc-200 font-mono">{p.id.slice(0, 12)} · {p.status}</p>
                <p className="text-zinc-500">{inr(p.netAmount)} · {p.entryCount} entries · {new Date(p.createdAt).toLocaleString()}{p.providerReference ? ` · ${p.providerReference}` : ""}</p>
                {p.failureReason && <p className="text-red-400">{p.failureReason}</p>}
              </div>
              <div className="flex gap-2">
                {p.status === "pending" && (
                  <button onClick={() => run(`approve-${p.id}`, () => approvePayoutAction(p.id))} disabled={busy === `approve-${p.id}`} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5">Approve</button>
                )}
                {p.status === "approved" && (
                  <button onClick={() => run(`process-${p.id}`, () => processPayoutAction(p.id))} disabled={busy === `process-${p.id}`} className="rounded-md bg-indigo-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-indigo-400">Process</button>
                )}
                {p.status === "failed" && (
                  <button onClick={() => run(`retry-${p.id}`, () => retryPayoutAction(p.id))} disabled={busy === `retry-${p.id}`} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5">Retry</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settlements */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Settlements</h2>
          <div className="flex items-center gap-2">
            <input
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              placeholder="Agency id (uuid)"
              className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-white placeholder-zinc-600"
            />
            <button onClick={() => { if (partnerId.trim()) run(`settle-create`, () => createSettlementAction(partnerId.trim())); }} disabled={busy === "settle-create"} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">
              Create settlement
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {settlements.length === 0 && <p className="text-xs text-zinc-500">No settlements yet — create one from a partner&apos;s pending commission.</p>}
          {settlements.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.04] bg-zinc-900/50 px-3 py-2 text-xs">
              <div>
                <p className="text-zinc-200">{s.settlementRef} · {s.status}</p>
                <p className="text-zinc-500">{inr(s.netAmount)} · {s.entryCount} entries · {s.partnerId.slice(0, 8)}</p>
              </div>
              <div className="flex gap-2">
                {s.status === "PENDING" && (
                  <button onClick={() => run(`settle-approve-${s.id}`, () => updateSettlementAction(s.id, "APPROVED", { approvedBy: "superadmin" }))} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5">Approve</button>
                )}
                {s.status === "APPROVED" && (
                  <>
                    <button onClick={() => run(`settle-payout-${s.id}`, () => createPayoutAction(s.id))} className="rounded-md bg-indigo-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-indigo-400">Create payout</button>
                    {/* RCCF-IMPLEMENTATION-74 Phase 10: manual agency payout — Super Admin transfers by bank/UPI and records it. */}
                    <button
                      onClick={() => {
                        const ref = window.prompt(`Manual payout for ${s.settlementRef}\nEnter the transfer reference (UTR / UPI ref / bank ref):`);
                        if (ref !== null) run(`settle-manual-${s.id}`, () => updateSettlementAction(s.id, "PAID", { transferRef: ref || `manual_${Date.now()}`, transferMethod: "manual" }));
                      }}
                      className="rounded-md border border-emerald-500/20 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/5"
                    >
                      Mark paid (manual)
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent commission entries */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Recent commission entries</h2>
        <div className="space-y-1.5">
          {commissionEntries.length === 0 && <p className="text-xs text-zinc-500">No commission entries yet — they appear when agency-managed creators subscribe.</p>}
          {commissionEntries.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-mono">{e.planCode} · {e.status}</span>
              <span className="text-zinc-200">{inr(e.amount)} → platform {inr(e.platformShare)} / agency {inr(e.partnerShare)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}
