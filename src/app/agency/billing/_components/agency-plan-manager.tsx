"use client";

import { useState } from "react";
import { changeAgencyPlanAction } from "@/actions/partner.actions";
import { BRAND } from "@/lib/marketing/messaging";
import { PARTNER_RECURRING_PRICES } from "@/config/commerce/agency-commercial";

interface Props {
  currentPlanCode: string;
  currentPlanName: string;
  trialActive: boolean;
  trialEndsAt: string | null;
  clientLimit: number;
  clientUsed: number;
}

export function AgencyPlanManager({ currentPlanCode, currentPlanName, trialActive, trialEndsAt, clientLimit, clientUsed }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function openCheckout(checkout: { orderId?: string; subscriptionId?: string; keyId?: string; amountPaise?: number; currency?: string }) {
    if (!checkout.keyId) return;
    // RCCF-FINANCE-04: manual renewal — always one-time Razorpay ORDER, no subscription.
    if (!checkout.orderId || !checkout.amountPaise) return;
    if (!(window as unknown as { Razorpay?: unknown }).Razorpay) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Razorpay failed to load"));
        document.body.appendChild(s);
      });
    }
    const options = {
      key: checkout.keyId,
      order_id: checkout.orderId,
      amount: checkout.amountPaise,
      currency: checkout.currency ?? "INR",
      name: BRAND.name,
      theme: { color: "#6366f1" },
    };
    new (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }).Razorpay(options).open();
  }

  async function upgrade(planCode: string, cycle: "monthly" | "yearly" = "monthly") {
    setBusy(true);
    setMsg(null);
    const res = await changeAgencyPlanAction(planCode, cycle);
    if (res.success && res.checkout) {
      try {
        await openCheckout(res.checkout);
        setMsg(null);
      } catch {
        setMsg("Checkout window could not be opened. Try again.");
      }
    } else {
      setMsg(res.error ?? "Failed to start checkout");
    }
    setBusy(false);
  }

  const limitLabel = clientLimit === -1 ? "Unlimited" : String(clientLimit);
  const targets: Array<{ code: string; label: string; monthly: number; yearly: number }> = [];
  const soloPrices = PARTNER_RECURRING_PRICES.partner_solo;
  const scalePrices = PARTNER_RECURRING_PRICES.partner_scale;
  if (currentPlanCode !== "partner_scale") targets.push({ code: "partner_scale", label: "Scale", monthly: scalePrices.monthly, yearly: scalePrices.yearly });
  if (currentPlanCode !== "partner_solo" && currentPlanCode !== "partner_scale") targets.push({ code: "partner_solo", label: "Solo", monthly: soloPrices.monthly, yearly: soloPrices.yearly });
  // Renew CTA for current plan (manual renewal after expiry)
  const isCurrentPaid = currentPlanCode === "partner_solo" || currentPlanCode === "partner_scale";
  const currentPrices = currentPlanCode === "partner_scale" ? scalePrices : soloPrices;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold text-white">Your Partner Plan</h2>
      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-secondary)]">Plan</span>
          <span className="font-medium text-white">{currentPlanName}</span>
        </div>
        {trialActive && trialEndsAt && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Trial</span>
            <span className="font-medium text-[var(--brand-primary)]">ends {new Date(trialEndsAt).toISOString().slice(0, 10)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-secondary)]">Clients</span>
          <span className="text-[var(--text-primary)]">{clientUsed} / {limitLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-secondary)]">Remaining</span>
          <span className="text-[var(--text-primary)]">{clientLimit === -1 ? "Unlimited" : Math.max(0, clientLimit - clientUsed)}</span>
        </div>
      </div>
      {msg && <p className="mt-2 text-xs text-red-400">{msg}</p>}
      <div className="mt-4 space-y-3">
        {/* Current plan manual renewal */}
        {isCurrentPaid && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs font-medium text-amber-300">Renew Agency Plan — manual payment required at expiry</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => upgrade(currentPlanCode, "monthly")} disabled={busy} className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
                {busy ? "Starting…" : `Monthly — ₹${currentPrices.monthly.toLocaleString("en-IN")} / month — Renew manually`}
              </button>
              <button onClick={() => upgrade(currentPlanCode, "yearly")} disabled={busy} className="rounded-lg border border-[var(--brand-primary)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 disabled:opacity-50">
                {busy ? "Starting…" : `Yearly — ₹${currentPrices.yearly.toLocaleString("en-IN")} / year — Renew manually`}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">No automatic renewal. Pay again when the selected period ends to extend entitlement.</p>
          </div>
        )}
        {/* Upgrade targets */}
        <div className="flex flex-wrap items-center gap-2">
          {targets.map((t) => (
            <div key={t.code} className="flex gap-2">
              <button onClick={() => upgrade(t.code, "monthly")} disabled={busy} className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
                {busy ? "Starting…" : `${t.label} Monthly — ₹${t.monthly.toLocaleString("en-IN")} / month`}
              </button>
              <button onClick={() => upgrade(t.code, "yearly")} disabled={busy} className="rounded-lg border border-[var(--brand-primary)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 disabled:opacity-50">
                {busy ? "Starting…" : `${t.label} Yearly — ₹${t.yearly.toLocaleString("en-IN")} / year`}
              </button>
            </div>
          ))}
          <span className="text-xs text-[var(--text-muted)]">Enterprise: contact sales</span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">Manual one-time Razorpay payment per period — no Razorpay subscription, no auto-charge. Renew manually.</p>
      </div>
    </div>
  );
}
