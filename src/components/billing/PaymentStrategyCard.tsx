"use client";

import { useEffect, useState } from "react";
import { getMyCommerceStrategy, getMyStrategyReadiness } from "@/actions/commerce-strategy.actions";
import { CommerceStrategyBadge } from "@/modules/commerce-strategy/presentation/strategy-badge";
import { Landmark, ArrowRight } from "lucide-react";

/** RCCF-IMPLEMENTATION-73 Phase 8 — read-only Payment Strategy card. */
export function PaymentStrategyCard() {
  const [strategy, setStrategy] = useState<Awaited<ReturnType<typeof getMyCommerceStrategy>>["strategy"] | null>(null);
  const [readiness, setReadiness] = useState<Awaited<ReturnType<typeof getMyStrategyReadiness>>["readiness"] | null>(null);

  useEffect(() => {
    getMyCommerceStrategy().then((r) => { if (r.ok) setStrategy(r.strategy ?? null); });
    getMyStrategyReadiness().then((r) => { if (r.ok) setReadiness(r.readiness ?? null); });
  }, []);

  if (!strategy) return null;

  return (
    <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            <Landmark className="h-3.5 w-3.5 text-cyan-400" />
            Payment Strategy
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            You earn <span className="font-semibold text-emerald-400">100% of every product, service, course, booking and donation</span> — CreatorStore never takes a transaction fee.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CommerceStrategyBadge strategy={strategy.id} readiness={readiness?.readiness ?? strategy.readiness} />
          <span className="text-[11px] text-zinc-600">· {strategy.definition.merchantOfRecord === "platform" ? "CreatorStore handles payments for you" : "you handle payments directly"}</span>
        </div>
      </div>
      {strategy.id !== "PLATFORM_COLLECT" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
          <ArrowRight className="h-3.5 w-3.5" />
          Connect Razorpay to receive product payments directly — coming soon.
        </div>
      )}
    </div>
  );
}
