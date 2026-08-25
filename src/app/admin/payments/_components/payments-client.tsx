"use client";

import { useState } from "react";
import { saveMyPaymentAccount, verifyMyPaymentAccount, disconnectMyPaymentAccount } from "@/actions/payment-account.actions";
import { PAYMENT_PROVIDERS } from "@/modules/payment-account/providers/meta";
import { CommerceStrategyBadge } from "@/modules/commerce-strategy/presentation/strategy-badge";
import type { PaymentAccountData, PaymentReadinessReport } from "@/modules/payment-account/domain/types";
import { CheckCircle2, ShieldCheck } from "lucide-react";

interface Props {
  account: PaymentAccountData | null;
  readiness: PaymentReadinessReport | null;
  error?: string;
}

const inputCls = "rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600";

export function PaymentsClient({ account, readiness, error }: Props) {
  const [form, setForm] = useState(() => ({
    provider: "razorpay",
    accountHolderName: account?.accountHolderName ?? "",
    merchantName: account?.merchantName ?? "",
    upiId: account?.upiId ?? "",
    bankAccountName: account?.bankAccountName ?? "",
    bankAccountNumber: "",
    ifsc: account?.ifsc ?? "",
    settlementMode: account?.settlementMode ?? "upi",
    providerKeyId: "",
    providerKeySecret: "",
  }));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(!account?.hasProviderKeys);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy("save"); setMsg(null);
    const r = await saveMyPaymentAccount({
      provider: form.provider as never,
      accountHolderName: form.accountHolderName || undefined,
      merchantName: form.merchantName || undefined,
      upiId: form.settlementMode === "upi" ? form.upiId || undefined : undefined,
      bankAccountName: form.settlementMode === "bank" ? form.bankAccountName || undefined : undefined,
      bankAccountNumber: form.settlementMode === "bank" ? form.bankAccountNumber || undefined : undefined,
      ifsc: form.settlementMode === "bank" ? form.ifsc || undefined : undefined,
      settlementMode: form.settlementMode as never,
      providerKeyId: showKeys ? form.providerKeyId || undefined : undefined,
      providerKeySecret: showKeys ? form.providerKeySecret || undefined : undefined,
      capabilities: { products: true, services: true, courses: true, bookings: true, donations: true },
    });
    setMsg(r.success ? "Saved. Your payment account is being configured." : r.error ?? "Save failed");
    if (r.success) setTimeout(() => window.location.reload(), 700);
    setBusy(null);
  };

  const verify = async () => {
    setBusy("verify"); setMsg(null);
    const r = await verifyMyPaymentAccount();
    // RCCF-72.18D.6.2 — verification is a REAL provider probe now: success
    // means Razorpay authenticated the stored key pair. Failure messages are
    // the safe, provider-derived strings from the runtime (never credentials).
    // RCCF-72.18D.7.5 — "verified" and "ready" are DIFFERENT states. The
    // message must never imply storefront payments work when the canonical
    // readiness report still lists unmet requirements; the missing labels come
    // from computePaymentReadiness itself, so the next action is always the
    // actual requirement (e.g. holder identity / settlement detail).
    if (!r.success) {
      setMsg(r.error ?? "Verification failed");
    } else if (r.readiness?.readiness === "ready") {
      setMsg("Provider credentials verified. Your payment account is ready to accept storefront payments.");
    } else {
      const remaining = r.readiness?.missing?.length ? r.readiness.missing.join(", ") : "the remaining setup steps";
      setMsg(`Provider credentials verified. Storefront payments stay unavailable until you complete: ${remaining}.`);
    }
    if (r.success) setTimeout(() => window.location.reload(), 700);
    setBusy(null);
  };

  const disconnect = async () => {
    setBusy("disconnect"); setMsg(null);
    const r = await disconnectMyPaymentAccount();
    setMsg(r.success ? "Payment account disconnected." : r.error ?? "Failed");
    if (r.success) setTimeout(() => window.location.reload(), 700);
    setBusy(null);
  };

  if (error) return <p className="text-sm text-red-400">{error}</p>;

  const readinessBadge = readiness?.readiness;

  return (
    <div className="mt-6 space-y-6">
      {msg && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm text-emerald-300">{msg}</div>}

      {/* Readiness */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Payment readiness</p>
            <p className="mt-1 text-sm text-zinc-300">You keep <span className="font-semibold text-emerald-400">100% of every sale</span>. CreatorStore never takes a transaction fee.</p>
          </div>
          <div className="flex items-center gap-2">
            {readiness && <CommerceStrategyBadge strategy={readiness.strategy as never} />}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${readinessBadge === "ready" ? "bg-emerald-500/10 text-emerald-300" : readinessBadge === "warning" ? "bg-amber-500/10 text-amber-300" : "bg-red-500/10 text-red-300"}`}>
              {readinessBadge}
            </span>
          </div>
        </div>
        {readiness?.missing && readiness.missing.length > 0 && (
          <ul className="mt-3 space-y-1">
            {readiness.missing.map((m) => (
              <li key={m} className="flex items-center gap-2 text-xs text-amber-300">• {m}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Status */}
      {account && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatusCard label="Provider" value={PAYMENT_PROVIDERS.find((p) => p.id === account.provider)?.label ?? account.provider} />
            <StatusCard label="Status" value={account.status} />
            <StatusCard label="Verification" value={account.verificationStatus} />
            <StatusCard label="Settlement" value={account.settlementMode} />
          </div>
          {/* RCCF-72.18D.6.3 — operational visibility only. Safe timestamp of
              the last successful provider probe; never credentials/responses. */}
          {account.lastVerifiedAt && (
            <p className="text-[11px] text-zinc-500">
              Last verified: {new Date(account.lastVerifiedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">{account ? "Edit payment account" : "Connect your payment account"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Provider
            <select className={inputCls} value={form.provider} onChange={(e) => set("provider", e.target.value)}>
              {PAYMENT_PROVIDERS.filter((p) => p.status === "active").map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Account holder name
            <input className={inputCls} value={form.accountHolderName} onChange={(e) => set("accountHolderName", e.target.value)} placeholder="Your legal name" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Merchant name (shown on payments)
            <input className={inputCls} value={form.merchantName} onChange={(e) => set("merchantName", e.target.value)} placeholder="Your brand" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Settlement mode
            <select className={inputCls} value={form.settlementMode} onChange={(e) => set("settlementMode", e.target.value)}>
              <option value="upi">UPI</option>
              <option value="bank">Bank transfer</option>
            </select>
          </label>
          {form.settlementMode === "upi" ? (
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              UPI ID
              <input className={inputCls} value={form.upiId} onChange={(e) => set("upiId", e.target.value)} placeholder="name@upi" />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Bank account name
                <input className={inputCls} value={form.bankAccountName} onChange={(e) => set("bankAccountName", e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Bank account number
                <input className={inputCls} value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} placeholder="encrypted at rest" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                IFSC
                <input className={inputCls} value={form.ifsc} onChange={(e) => set("ifsc", e.target.value)} />
              </label>
            </>
          )}
        </div>

        {form.provider === "razorpay" && (
          <div className="mt-4 rounded-lg border border-white/10 bg-zinc-900/50 p-4">
            <button type="button" onClick={() => setShowKeys(!showKeys)} className="text-xs font-medium text-cyan-300 hover:underline">
              {showKeys ? "Hide" : account?.hasProviderKeys ? "Replace" : "Show"} your Razorpay API keys
            </button>
            <p className="mt-1 text-[11px] text-zinc-600">Use keys from a Razorpay account you own. Customers pay YOUR account directly; funds settle to your bank. Keys are encrypted.</p>
            {showKeys && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  Key ID
                  <input className={inputCls} value={form.providerKeyId} onChange={(e) => set("providerKeyId", e.target.value)} placeholder="rzp_live_..." />
                </label>
                <label className="flex flex-col gap-1 text-xs text-zinc-400">
                  Key Secret
                  <input type="password" className={inputCls} value={form.providerKeySecret} onChange={(e) => set("providerKeySecret", e.target.value)} placeholder="••••••••" />
                </label>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={save} disabled={busy === "save"} className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50">
            {busy === "save" ? "Saving…" : account ? "Save changes" : "Connect account"}
          </button>
          {account?.status === "active" && (
            <button onClick={verify} disabled={busy === "verify"} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Verify
            </button>
          )}
          {account?.status !== "disconnected" && (
            <button onClick={disconnect} disabled={busy === "disconnect"} className="rounded-lg border border-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/5 disabled:opacity-50">
              Disconnect
            </button>
          )}
        </div>
      </div>

      {account && (
        <p className="flex items-center gap-2 text-[11px] text-zinc-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          Sensitive fields (bank number, Razorpay secret) are encrypted at rest. Every change is audited.
        </p>
      )}
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white capitalize">{value}</p>
    </div>
  );
}
