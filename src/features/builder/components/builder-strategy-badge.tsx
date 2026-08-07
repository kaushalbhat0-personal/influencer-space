"use client";

import { useEffect, useState } from "react";
import { getMyPaymentAccount } from "@/actions/payment-account.actions";
import { CommerceStrategyBadge } from "@/modules/commerce-strategy/presentation/strategy-badge";

/** RCCF-IMPLEMENTATION-74 Phase 7 — read-only payment strategy + readiness in the Builder. */
export function BuilderStrategyBadge() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getMyPaymentAccount>> | null>(null);

  useEffect(() => {
    getMyPaymentAccount().then(setData);
  }, []);

  const readiness = data?.readiness;
  if (!readiness) return null;

  const ready = readiness.readiness === "ready";
  const missing = readiness.missing ?? [];

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-3">
      <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Payment</p>
      <div className="mt-1.5">
        <CommerceStrategyBadge strategy={readiness.strategy as never} />
      </div>
      <p className={`mt-1.5 text-[10px] ${ready ? "text-emerald-400" : "text-amber-300"}`}>
        {ready ? "Payment ready — start selling" : missing.length > 0 ? `Missing: ${missing.slice(0, 3).join(", ")}` : "Set up in Payments"}
      </p>
    </div>
  );
}
