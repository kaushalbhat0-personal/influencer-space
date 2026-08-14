"use client";

import { useState } from "react";
import { changeAgencyPlanAction } from "@/actions/partner.actions";

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

  async function openCheckout(checkout: { subscriptionId?: string; keyId?: string }) {
    if (!checkout.subscriptionId || !checkout.keyId) return;
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
      subscription_id: checkout.subscriptionId,
      name: "CreatorStore",
      theme: { color: "#6366f1" },
    };
    new (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }).Razorpay(options).open();
  }

  async function upgrade(planCode: string) {
    setBusy(true);
    setMsg(null);
    const res = await changeAgencyPlanAction(planCode);
    if (res.success && res.checkout) {
      await openCheckout(res.checkout).catch(() => setMsg("Checkout window could not be opened. Try again."));
    } else {
      setMsg(res.error ?? "Failed to start checkout");
    }
    setBusy(false);
  }

  const limitLabel = clientLimit === -1 ? "Unlimited" : String(clientLimit);
  const targets: Array<{ code: string; label: string }> = [];
  if (currentPlanCode !== "partner_scale") targets.push({ code: "partner_scale", label: "Upgrade to Scale" });
  if (currentPlanCode !== "partner_solo" && currentPlanCode !== "partner_scale") targets.push({ code: "partner_solo", label: "Upgrade to Solo" });

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold text-white">Your Partner Plan</h2>
      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Plan</span>
          <span className="font-medium text-white">{currentPlanName}</span>
        </div>
        {trialActive && trialEndsAt && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Trial</span>
            <span className="font-medium text-indigo-300">ends {new Date(trialEndsAt).toISOString().slice(0, 10)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Clients</span>
          <span className="text-zinc-300">{clientUsed} / {limitLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Remaining</span>
          <span className="text-zinc-300">{clientLimit === -1 ? "Unlimited" : Math.max(0, clientLimit - clientUsed)}</span>
        </div>
      </div>
      {msg && <p className="mt-2 text-xs text-red-400">{msg}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {targets.map((t) => (
          <button
            key={t.code}
            onClick={() => upgrade(t.code)}
            disabled={busy}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {busy ? "Starting…" : t.label}
          </button>
        ))}
        <span className="text-xs text-zinc-500">Enterprise: contact sales</span>
      </div>
    </div>
  );
}
