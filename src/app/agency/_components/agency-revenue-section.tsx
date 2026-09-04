"use client";

import { useEffect, useState } from "react";
import { getAgencyRevenueData } from "@/actions/revenue-runtime.actions";
import { IndianRupee, TrendingUp, Clock, CheckCircle2, Users, RefreshCw, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const inr = (n: number) => formatCurrency(n ?? 0);

export function AgencyRevenueSection({ agencyId }: { agencyId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAgencyRevenueData>> | null>(null);

  const load = async () => {
    const r = await getAgencyRevenueData(agencyId);
    setData(r);
  };

  useEffect(() => { load(); }, [agencyId]);

  if (!data?.ok || !data.summary || !data.payoutSummary) return null;
  const s = data.summary;
  const p = data.payoutSummary;
  const l = data.loyalty;
  const tierPercent = l?.tier?.commissionPercent ?? null;
  const clientsToNext = l?.nextTier ? Math.max(0, l.nextTier.minActiveClients - (l?.activeClients ?? 0)) : 0;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <IndianRupee className="h-4 w-4 text-emerald-400" />
          Recurring Revenue
        </h2>
        <button onClick={load} className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {l && (
        <div className="mb-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">{tierPercent != null ? `${tierPercent}%` : "—"}</span>
              <div>
                <p className="text-xs font-semibold text-emerald-400">{l.tier?.name ?? "No tier"}</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {l.activeClients} active client{l.activeClients === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            {l.nextTier && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  {clientsToNext} more to unlock {l.nextTier.commissionPercent}% ({l.nextTier.name})
                </span>
              </div>
            )}
            {!l.nextTier && tierPercent != null && (
              <span className="text-xs text-emerald-400">Top loyalty tier reached</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <RevenueCard label="Lifetime earned" value={inr(s.lifetime)} icon={TrendingUp} />
        <RevenueCard label="Pending (unsettled)" value={inr(s.pending)} icon={Clock} />
        <RevenueCard label="Available" value={inr(s.available)} icon={IndianRupee} />
        <RevenueCard label="Paid out" value={inr(s.paid)} icon={CheckCircle2} />
        <RevenueCard label="Active clients" value={String(s.activeClients)} icon={Users} />
        <RevenueCard label="Upcoming renewals" value={String(s.upcomingRenewals)} icon={RefreshCw} />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--text-muted)]">
        <span>Payouts: {p.pending} queued · {p.approved} approved · {p.processing} processing · <span className="text-emerald-400">{p.paid} paid</span> · <span className="text-red-400">{p.failed} failed</span></span>
        <span className="text-[var(--text-muted)]">· You earn a recurring share of creator subscriptions only — creators keep 100% of product revenue.</span>
      </div>

      {data.entries && data.entries.length > 0 && (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="mb-2 text-xs font-semibold text-white">Recent subscription earnings</h3>
          <div className="space-y-1.5">
            {data.entries.slice(0, 8).map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span className="font-mono">{e.planCode} · {e.status}</span>
                <span className="text-[var(--text-primary)]">your share {inr(e.partnerShare)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-emerald-400" />
        <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">{label}</p>
      </div>
      <p className="mt-1.5 text-lg font-bold text-white">{value}</p>
    </div>
  );
}
