"use client";

import Link from "next/link";
import { CommerceStrategyBadge } from "@/modules/commerce-strategy/presentation/strategy-badge";
import { Landmark, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import type { ResolvedCommerceStrategy } from "@/modules/commerce-strategy/domain/types";
import type { PaymentReadinessReport } from "@/modules/payment-account/domain/types";

export interface PaymentStrategyCardProps {
  strategy: ResolvedCommerceStrategy | null;
  readiness: PaymentReadinessReport | null;
  activeProviderLabel?: string | null;
  lastVerifiedAt?: string | null;
}

/** RCCF-PAYMENTS-UX-01C — canonical sales-readiness card. Reads only PaymentAccount+computePaymentReadiness via props. */
export function PaymentStrategyCard({ strategy, readiness, activeProviderLabel, lastVerifiedAt }: PaymentStrategyCardProps) {
  if (!strategy) return null;

  const isPlatform = strategy.id === "PLATFORM_COLLECT";
  const isDirect = strategy.id === "DIRECT_CREATOR";
  const isReady = readiness?.readiness === "ready" && !!activeProviderLabel;
  const badgeReadiness = (() => {
    if (!readiness?.readiness) return strategy.readiness;
    if (readiness.readiness === "ready") return "ready" as const;
    if (readiness.readiness === "blocked") return "blocked" as const;
    return "incomplete" as const;
  })();

  return (
    <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4" style={{ boxShadow: "var(--shadow-elevation)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            <Landmark className="h-3.5 w-3.5 text-[var(--color-info)]" />
            Payment Strategy
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            You earn <span className="font-semibold text-emerald-400">100% of every product, service, course, booking and donation</span> — CreatorStore never takes a transaction fee.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CommerceStrategyBadge strategy={strategy.id} readiness={badgeReadiness} />
          <span className="text-[11px] text-[var(--text-muted)]">· {strategy.definition.merchantOfRecord === "platform" ? "CreatorStore handles payments for you" : "you handle payments directly"}</span>
        </div>
      </div>

      {isPlatform && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          CreatorStore handles payments for you — no setup needed.
        </div>
      )}

      {isDirect && isReady && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Payments ready — you&apos;re receiving product payments directly through {activeProviderLabel} ✓</span>
          {lastVerifiedAt && <span className="text-[11px] text-emerald-300/70">· Last verified {new Date(lastVerifiedAt).toLocaleString()}</span>}
          <Link href="/admin/payments" className="ml-auto inline-flex items-center gap-1 font-medium text-emerald-300 hover:underline">
            Manage payment account <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {isDirect && !isReady && readiness && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Storefront payments stay unavailable until you complete: {readiness.missing.length ? readiness.missing.join(", ") : "payment setup"}</span>
          <Link href="/admin/payments" className="ml-auto inline-flex items-center gap-1 font-medium text-amber-300 hover:underline">
            Go to Payments <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {!isPlatform && !isDirect && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-muted)]">
          {strategy.definition.label} is reserved — the platform prepares for it without behavior changes.
        </div>
      )}
    </div>
  );
}
