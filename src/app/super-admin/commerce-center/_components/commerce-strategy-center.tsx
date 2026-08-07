"use client";

import { COMMERCE_STRATEGY_REGISTRY } from "@/modules/commerce-strategy/application/registry";
import { CommerceStrategyBadge } from "@/modules/commerce-strategy/presentation/strategy-badge";
import type { CommerceStrategyId } from "@/modules/commerce-strategy/domain/types";

interface Props {
  distribution: Array<{ strategy: CommerceStrategyId; count: number }>;
  migration: { total: number; directReady: number; directIncomplete: number; reason: string };
}

export function CommerceStrategyCenter({ distribution, migration }: Props) {
  const total = distribution.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Commerce Strategy</h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-400">
        The canonical strategy runtime decides how money flows for every commercial transaction. Read-only — this page
        prepares the platform for Direct Creator payments without changing behavior today.
      </p>

      {/* Migration readiness */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Tenants</p>
          <p className="mt-1 text-lg font-bold text-white">{migration.total}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Direct-ready</p>
          <p className="mt-1 text-lg font-bold text-emerald-400">{migration.directReady}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Incomplete</p>
          <p className="mt-1 text-lg font-bold text-amber-400">{migration.directIncomplete}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-500">{migration.reason}</p>

      {/* Strategy distribution */}
      <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Strategy distribution</h2>
        <div className="space-y-2">
          {distribution.map((d) => (
            <div key={d.strategy} className="flex items-center gap-3 text-xs">
              <span className="w-40"><CommerceStrategyBadge strategy={d.strategy} /></span>
              <div className="h-2 flex-1 rounded-full bg-white/5">
                <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${total ? Math.round((d.count / total) * 100) : 0}%` }} />
              </div>
              <span className="w-12 text-right text-zinc-400">{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Declarative registry */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {COMMERCE_STRATEGY_REGISTRY.map((s) => (
          <div key={s.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <CommerceStrategyBadge strategy={s.id} />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.status === "active" ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-500/10 text-zinc-400"}`}>
                {s.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-300">{s.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-500">
              <dt className="text-zinc-600">Merchant of record</dt><dd className="text-zinc-300">{s.merchantOfRecord}</dd>
              <dt className="text-zinc-600">Products / Bookings / Services / Courses</dt><dd className="text-zinc-300">{s.supportsProducts && s.supportsBookings && s.supportsServices && s.supportsCourses ? "yes" : "partial"}</dd>
              <dt className="text-zinc-600">Subscriptions</dt><dd className="text-zinc-300">{s.supportsSubscriptions ? "yes" : "no"}</dd>
              <dt className="text-zinc-600">Linked account required</dt><dd className="text-zinc-300">{s.requiresLinkedAccount ? "yes" : "no"}</dd>
              <dt className="text-zinc-600">Settlement required</dt><dd className="text-zinc-300">{s.requiresSettlement ? "yes" : "no"}</dd>
              <dt className="text-zinc-600">Transfers / Shipping / Digital</dt><dd className="text-zinc-300">{s.supportsTransfers ? "transfers" : s.requiresShipping ? "shipping" : s.requiresDigitalDelivery ? "digital" : "—"}</dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
