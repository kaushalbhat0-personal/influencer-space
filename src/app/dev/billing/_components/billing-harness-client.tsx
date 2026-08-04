"use client";

/**
 * Dev-only Billing Harness client — IMPLEMENTATION-35.
 *
 * Exercises the webhook lifecycle through the SAME server path a Razorpay
 * webhook uses (simulateRazorpayEvent → BillingService.handleSubscriptionWebhook).
 * Replays are idempotent; illegal transitions are recorded, not applied.
 */
import { useState } from "react";
import { simulateRazorpayEvent } from "@/actions/billing.actions";

const EVENTS = [
  "subscription.activated",
  "subscription.charged",
  "subscription.completed",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.resumed",
  "payment.failed",
  "order.paid",
];

export function BillingHarnessClient({ workspaceId, tenantId, planCode }: { workspaceId: string; tenantId: string; planCode: string }) {
  const [last, setLast] = useState<{ event: string; result: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function fire(eventName: string) {
    setBusy(eventName);
    try {
      const result = await simulateRazorpayEvent(eventName, workspaceId, planCode);
      setLast({ event: eventName, result: result.handled ? `handled → ${result.status}` : result.error ?? "ignored" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4">
      <p className="mb-2 text-xs font-medium text-[var(--text-primary,#FAFAFA)]">Webhook simulator (dev-only)</p>
      <div className="flex flex-wrap gap-2">
        {EVENTS.map((ev) => (
          <button
            key={ev}
            onClick={() => fire(ev)}
            disabled={busy !== null}
            data-testid={`sim-${ev}`}
            className="rounded-md border border-[var(--border,rgba(255,255,255,0.12))] bg-white/5 px-2.5 py-1.5 text-[10px] text-[var(--text-secondary,#A1A1AA)] hover:bg-white/10 disabled:opacity-50"
          >
            {ev}
          </button>
        ))}
      </div>
      {last && (
        <p className="mt-2 text-[10px] text-[var(--text-muted,#71717A)]" data-testid="sim-last">
          last: {last.event} → {last.result}
        </p>
      )}
    </div>
  );
}
