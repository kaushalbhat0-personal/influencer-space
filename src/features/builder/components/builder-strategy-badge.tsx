"use client";

import { useEffect, useState } from "react";
import { getMyCommerceStrategy } from "@/actions/commerce-strategy.actions";
import { CommerceStrategyBadge } from "@/modules/commerce-strategy/presentation/strategy-badge";

/** RCCF-IMPLEMENTATION-73 Phase 7 — read-only payment strategy in the Builder. */
export function BuilderStrategyBadge() {
  const [strategy, setStrategy] = useState<Awaited<ReturnType<typeof getMyCommerceStrategy>>["strategy"] | null>(null);

  useEffect(() => {
    getMyCommerceStrategy().then((r) => { if (r.ok) setStrategy(r.strategy ?? null); });
  }, []);

  if (!strategy) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
      <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Payment Strategy</p>
      <div className="mt-1.5">
        <CommerceStrategyBadge strategy={strategy.id} readiness={strategy.readiness} />
      </div>
      <p className="mt-1.5 text-[10px] text-zinc-600">Creators keep 100% of product revenue — no transaction fees.</p>
    </div>
  );
}
