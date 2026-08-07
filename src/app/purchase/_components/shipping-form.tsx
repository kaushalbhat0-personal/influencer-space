"use client";

import { useState } from "react";
import { submitShippingAddress } from "@/actions/customer-orders.actions";
import type { ShippingAddressInput } from "@/modules/fulfillment";

const inputCls = "rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600";

export function ShippingForm({ orderId, existing }: { orderId: string; existing?: Partial<ShippingAddressInput> }) {
  const [form, setForm] = useState({
    name: existing?.name ?? "", phone: existing?.phone ?? "", email: existing?.email ?? "",
    line1: existing?.line1 ?? "", line2: existing?.line2 ?? "", city: existing?.city ?? "",
    state: existing?.state ?? "", pin: existing?.pin ?? "", country: existing?.country ?? "India",
    instructions: existing?.instructions ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    const r = await submitShippingAddress(orderId, { ...form, name: form.name || undefined, phone: form.phone || undefined, email: form.email || undefined, line1: form.line1 || undefined, line2: form.line2 || undefined, city: form.city || undefined, state: form.state || undefined, pin: form.pin || undefined, country: form.country || "India", instructions: form.instructions || undefined });
    setSaved(r.success);
    setBusy(false);
  };

  return (
    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-xs font-semibold text-white">Shipping address</p>
      <p className="mt-0.5 text-[11px] text-zinc-500">The creator ships to this address.</p>
      {saved && <p className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">Address saved.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Full name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        <input className={inputCls} placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        <input className={inputCls + " col-span-2"} placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        <input className={inputCls + " col-span-2"} placeholder="Address line 1" value={form.line1} onChange={(e) => set("line1", e.target.value)} />
        <input className={inputCls + " col-span-2"} placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => set("line2", e.target.value)} />
        <input className={inputCls} placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
        <input className={inputCls} placeholder="State" value={form.state} onChange={(e) => set("state", e.target.value)} />
        <input className={inputCls} placeholder="PIN / postal code" value={form.pin} onChange={(e) => set("pin", e.target.value)} />
        <input className={inputCls} placeholder="Country" value={form.country} onChange={(e) => set("country", e.target.value)} />
        <input className={inputCls + " col-span-2"} placeholder="Delivery instructions (optional)" value={form.instructions} onChange={(e) => set("instructions", e.target.value)} />
      </div>
      <button onClick={submit} disabled={busy} className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50">
        {busy ? "Saving…" : existing?.line1 ? "Update address" : "Save address"}
      </button>
    </div>
  );
}
