"use client";

import { useCallback, useEffect, useState } from "react";
import { getFulfillmentQueue, updateFulfillmentStatus, generateDownloadLink } from "@/actions/fulfillment.actions";
import { statusLabel } from "@/modules/fulfillment/application/strategies";
import type { FulfillmentStatus } from "@/modules/fulfillment/domain/types";
import { Package, Truck, Download, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Item {
  id: string;
  orderId: string;
  type: string;
  status: string;
  productName: string;
  customer: string | null;
  amount: number;
  trackingNumber: string | null;
  courier: string | null;
}

const inputCls = "rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-white placeholder:text-[var(--text-muted)]";

/** RCCF-TRACK-01 Phase 3/8 — creator fulfillment dashboard. */
export function FulfillmentSection() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [tracking, setTracking] = useState<Record<string, { number: string; courier: string }>>({});

  const load = useCallback(async (status = statusFilter) => {
    const r = await getFulfillmentQueue(status || undefined);
    if (r.ok) setItems(r.items ?? []);
  }, [statusFilter]);
  useEffect(() => { load(""); }, [load]);

  const setStatus = async (id: string, status: FulfillmentStatus) => {
    setBusy(id); setMsg(null);
    const t = tracking[id];
    const r = await updateFulfillmentStatus(id, {
      status,
      ...(status === "shipped" ? { trackingNumber: t?.number || undefined, courier: t?.courier || undefined } : {}),
    });
    setMsg(r.success ? "Updated." : r.error ?? "Failed");
    if (r.success) load();
    setBusy(null);
  };

  const download = async (id: string) => {
    setBusy(id);
    const r = await generateDownloadLink(id);
    setMsg(r.success && r.url ? "Download link generated — share the link with the customer." : r.error ?? "Failed");
    setBusy(null);
    if (r.success) load();
  };

  const physical = items.filter((i) => i.type === "physical");
  const digital = items.filter((i) => i.type === "digital" || i.type === "course");
  const service = items.filter((i) => i.type === "service" || i.type === "booking");

  return (
    <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Package className="h-4 w-4 text-[var(--color-info)]" /> Fulfillment</h2>
        <div className="flex items-center gap-2">
          <select className={inputCls} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); load(e.target.value); }}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="ready">Ready to download</option>
          </select>
          <button onClick={() => load()} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-[var(--text-primary)] hover:bg-white/5"><RefreshCw className="h-3 w-3" /> Refresh</button>
        </div>
      </div>
      {msg && <div className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">{msg}</div>}
      {items.length === 0 && <p className="text-xs text-[var(--text-muted)]">No orders to fulfill yet.</p>}

      {physical.length > 0 && <Queue title="Physical orders" items={physical} statuses={["preparing", "packed", "shipped", "delivered"]} tracking={tracking} setTracking={setTracking} setStatus={setStatus} busy={busy} />}
      {digital.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-white">Digital / courses</h3>
          <div className="mt-2 space-y-2">
            {digital.map((i) => (
              <Row key={i.id} item={i}>
                <button onClick={() => download(i.id)} disabled={busy === i.id} className="flex items-center gap-1 rounded-md bg-[var(--brand-primary)] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"><Download className="h-3 w-3" /> Generate link</button>
              </Row>
            ))}
          </div>
        </div>
      )}
      {service.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-white">Services / bookings</h3>
          <div className="mt-2 space-y-2">
            {service.map((i) => (
              <Row key={i.id} item={i}>
                {i.status === "pending" && <button onClick={() => setStatus(i.id, "accepted" as FulfillmentStatus)} disabled={busy === i.id} className="rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-black hover:bg-emerald-400">Accept</button>}
                {(i.status === "accepted" || i.status === "confirmed") && <button onClick={() => setStatus(i.id, "completed" as FulfillmentStatus)} disabled={busy === i.id} className="rounded-md bg-[var(--brand-primary)] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[var(--primary-hover)]">Complete</button>}
              </Row>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Queue({ title, items, statuses, tracking, setTracking, setStatus, busy }: {
  title: string; items: Item[]; statuses: string[];
  tracking: Record<string, { number: string; courier: string }>;
  setTracking: (fn: (t: Record<string, { number: string; courier: string }>) => Record<string, { number: string; courier: string }>) => void;
  setStatus: (id: string, s: FulfillmentStatus) => void; busy: string | null;
}) {
  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold text-white">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.map((i) => (
          <Row key={i.id} item={i}>
            <input className={inputCls + " w-28"} placeholder="Tracking" value={tracking[i.id]?.number ?? ""} onChange={(e) => setTracking((t) => ({ ...t, [i.id]: { ...(t[i.id] ?? {}), number: e.target.value } }))} />
            <input className={inputCls + " w-24"} placeholder="Courier" value={tracking[i.id]?.courier ?? ""} onChange={(e) => setTracking((t) => ({ ...t, [i.id]: { ...(t[i.id] ?? {}), courier: e.target.value } }))} />
            {statuses.map((s) => (
              <button key={s} onClick={() => setStatus(i.id, s as FulfillmentStatus)} disabled={busy === i.id} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-[var(--text-primary)] hover:bg-white/5 disabled:opacity-50">{s}</button>
            ))}
          </Row>
        ))}
      </div>
    </div>
  );
}

function Row({ item, children }: { item: Item; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.04] bg-zinc-900/50 px-3 py-2 text-xs">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-[var(--text-primary)]">{item.type === "physical" ? <Truck className="h-3.5 w-3.5 text-[var(--color-info)]" /> : <Package className="h-3.5 w-3.5 text-[var(--brand-primary)]" />} {item.productName} <span className="text-[var(--text-muted)]">· {formatCurrency(item.amount)}</span></p>
        <p className="text-[10px] text-[var(--text-muted)]">
          <span className="capitalize">{statusLabel(item.status)}</span>
          {item.trackingNumber && <> · {item.courier} {item.trackingNumber}</>}
          {item.type !== "physical" && <> · {item.customer ?? "guest"}</>}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}
