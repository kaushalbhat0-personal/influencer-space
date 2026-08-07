"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";

const inputCls = "rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600";

/** RCCF-TRACK-01 Phase 5 — guest order lookup. */
export function OrderLookup() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    const q = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
    router.push(`/purchase/${orderId.trim()}${q}`);
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <PackageSearch className="h-4 w-4 text-cyan-400" />
        Track your order
      </div>
      <label className="mt-4 block text-xs text-zinc-400">
        Order ID
        <input className={inputCls + " mt-1 w-full"} value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Paste your order ID" required />
      </label>
      <label className="mt-3 block text-xs text-zinc-400">
        Email used at checkout
        <input className={inputCls + " mt-1 w-full"} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </label>
      <button type="submit" className="mt-5 w-full rounded-lg bg-indigo-500 py-2 text-sm font-semibold text-white hover:bg-indigo-400">
        View order
      </button>
    </form>
  );
}
