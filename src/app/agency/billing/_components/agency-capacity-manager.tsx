"use client";

import { useState, useTransition } from "react";
import { createAdditionalClientCheckoutAction, cancelAgencyCapacityAction } from "@/actions/partner.actions";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { BRAND } from "@/lib/marketing/messaging";

interface AddonView {
  id: string;
  quantity: number;
  unitPriceInr: number;
  createdAt: string;
}

interface Props {
  /** @deprecated — plan's single-period max_clients (for display only). Use paidCapacity for limit. */
  includedLimit: number;
  /** Cumulative paid capacity from AgencyPaidCapacity (SUM quantity). */
  paidCapacity?: number;
  /** Total cumulative capacity (paid + addons), -1 = unlimited. */
  totalCapacity?: number;
  addons: AddonView[];
  used: number;
  unitPriceInr: number;
}

export function AgencyCapacityManager({ includedLimit, paidCapacity: paidCapacityProp, totalCapacity: totalCapacityProp, addons, used, unitPriceInr }: Props) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const addonQty = addons.reduce((s, a) => s + a.quantity, 0);
  // RCCF-AGENCY-CAPACITY-02: cumulative model — total = paid (SUM AgencyPaidCapacity) + addons
  // paidCapacity is passed from the server (SUM quantity); fallback to includedLimit for trial/unmigrated agencies
  const paidCapacity = paidCapacityProp ?? includedLimit;
  const effectiveLimit = totalCapacityProp ?? (paidCapacity === -1 || includedLimit === -1 ? Infinity : paidCapacity + addonQty);
  const totalCapacity = totalCapacityProp ?? (effectiveLimit === Infinity ? -1 : effectiveLimit);
  const remaining = effectiveLimit === Infinity ? null : Math.max(0, (typeof totalCapacity === "number" && totalCapacity !== -1 ? totalCapacity : effectiveLimit) - used);
  const displayPaidCapacity = paidCapacity;
  const displayTotalCapacity = totalCapacity === -1 ? -1 : totalCapacity;

  async function loadRazorpay(): Promise<unknown> {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return (window as unknown as { Razorpay?: unknown }).Razorpay;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Razorpay failed to load"));
      document.body.appendChild(s);
    });
    return (window as unknown as { Razorpay?: unknown }).Razorpay;
  }

  const buy = () => {
    startTransition(async () => {
      // RCCF-73 — payment-gated capacity: the server creates a ONE-TIME order
      // at the canonical unit price; the webhook grants capacity after the
      // capture is verified. Nothing is granted by this request itself.
      const res = await createAdditionalClientCheckoutAction({ quantity });
      if (!res.success || !res.orderId || !res.keyId || !res.amountPaise) {
        setNotice({ ok: false, message: res.error ?? "Failed to start checkout" });
        return;
      }
      try {
        const RazorpayCtor = (await loadRazorpay()) as new (o: unknown) => { open: () => void };
        new RazorpayCtor({
          key: res.keyId,
          order_id: res.orderId,
          amount: res.amountPaise,
          currency: res.currency ?? "INR",
          name: BRAND.name,
          description: `${quantity} additional client website${quantity > 1 ? "s" : ""}`,
          theme: { color: "#6366f1" },
        }).open();
        setNotice({ ok: true, message: `Checkout opened — ${formatCurrency(res.amountPaise / 100)} one-time for ${quantity} additional client website${quantity > 1 ? "s" : ""}. Capacity activates automatically once payment is confirmed.` });
      } catch {
        setNotice({ ok: false, message: "Payment window could not be opened. Try again." });
      }
    });
  };

  const cancel = (id: string) => {
    startTransition(async () => {
      const res = await cancelAgencyCapacityAction(id);
      if (res.success) {
        setNotice({ ok: true, message: "Capacity add-on cancelled." });
        router.refresh();
      } else {
        setNotice({ ok: false, message: res.error ?? "Failed to cancel" });
      }
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 text-sm" data-testid="capacity-manager">
      <h3 className="mb-1 font-semibold text-white">Client Website Capacity</h3>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Each paid Partner period adds client slots — <span className="text-[var(--text-primary)]">{includedLimit === -1 ? "Unlimited" : `${includedLimit} per paid period`}</span>. Additional capacity is <span className="text-[var(--text-primary)]">{formatCurrency(unitPriceInr)} one-time</span> per client website. Unused slots carry forward.
      </p>

      {notice && (
        <p className={`mb-3 rounded-lg p-2 text-xs ${notice.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
          {notice.message}
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Purchased capacity</p>
          <p className="text-sm font-semibold text-white">{displayPaidCapacity === -1 ? "Unlimited" : displayPaidCapacity}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Additional capacity</p>
          <p className="text-sm font-semibold text-white">{addonQty}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Total capacity</p>
          <p className="text-sm font-semibold text-white">{displayTotalCapacity === -1 ? "Unlimited" : displayTotalCapacity}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Active clients</p>
          <p className="text-sm font-semibold text-white">{used}</p>
        </div>
        <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Available slots</p>
          <p className="text-sm font-semibold text-white">{remaining === null ? "—" : remaining}</p>
        </div>
      </div>

      {addons.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {addons.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-800/30 px-3 py-1.5 text-xs">
              <span className="text-[var(--text-primary)]">+{a.quantity} client website(s) · {formatCurrency(a.quantity * a.unitPriceInr)} one-time</span>
              <span className="text-[var(--text-muted)]">added {new Date(a.createdAt).toLocaleDateString()}</span>
              <button onClick={() => cancel(a.id)} disabled={pending} className="text-red-400 hover:text-red-300 disabled:opacity-40">Cancel</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3">
        <label className="flex-1 max-w-[140px]">
          <span className="mb-1 block text-xs text-[var(--text-secondary)]">Additional client websites</span>
          <input
            type="number" min={1} max={100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[var(--border-focus)]"
          />
        </label>
        <button onClick={buy} disabled={pending || quantity < 1} className="rounded-md bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-40">
          {pending ? "Opening checkout…" : `Add another client — ${formatCurrency(quantity * unitPriceInr)} one-time`}
        </button>
      </div>
    </div>
  );
}
