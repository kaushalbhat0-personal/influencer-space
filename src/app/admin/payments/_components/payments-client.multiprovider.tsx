"use client";
import { useState } from "react";
import { saveMyPaymentAccount, verifyMyPaymentAccount, disconnectMyPaymentAccount, getMyPaymentAccounts, setMyActiveProvider } from "@/actions/payment-account.actions";
import { PAYMENT_PROVIDERS } from "@/modules/payment-account/providers/meta";
import type { PaymentAccountData, PaymentReadinessReport } from "@/modules/payment-account/domain/types";
import { CheckCircle2, ShieldCheck, CreditCard, Globe } from "lucide-react";

export function PaymentsMultiproviderClient({ initialAccounts, initialActive, initialReadiness }: { initialAccounts: PaymentAccountData[]; initialActive: string | null; initialReadiness: PaymentReadinessReport | null }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [active, setActive] = useState(initialActive);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { accountHolderName: string; upiId: string; providerKeyId: string; providerKeySecret: string; providerAccountId: string }>>({});

  const getForm = (provider: string) => forms[provider] ?? { accountHolderName: "", upiId: "", providerKeyId: "", providerKeySecret: "", providerAccountId: "" };
  const setForm = (provider: string, k: string, v: string) => setForms((s)=> ({...s, [provider]: {...getForm(provider), [k]: v}}));

  const refresh = async () => {
    const r = await getMyPaymentAccounts();
    if (r.ok && r.accounts) { setAccounts(r.accounts); setActive(r.activeProvider ?? null); setReadiness(r.readiness ?? null); }
  };

  const save = async (provider: string) => {
    setBusy(provider); setMsg(null);
    const f = getForm(provider);
    const res = await saveMyPaymentAccount({
      provider: provider as never,
      accountHolderName: f.accountHolderName || undefined,
      upiId: f.upiId || undefined,
      providerKeyId: f.providerKeyId || undefined,
      providerKeySecret: f.providerKeySecret || undefined,
      providerAccountId: f.providerAccountId || undefined,
      settlementMode: "upi" as never,
      capabilities: { products: true } as never,
    });
    setMsg(res.success ? `Connected ${provider}. Verify to enable payments.` : res.error ?? "Save failed");
    if (res.success) await refresh();
    setBusy(null);
  };
  const verify = async (provider: string) => {
    setBusy(provider+"-verify"); setMsg(null);
    const r = await verifyMyPaymentAccount(provider);
    setMsg(r.success ? `✓ ${provider} verified and ready` : r.error ?? "Verification failed");
    if (r.success) await refresh();
    setBusy(null);
  };
  const activate = async (provider: string) => {
    setBusy(provider+"-active");
    const r = await setMyActiveProvider(provider);
    setMsg(r.success ? `Now receiving payments through ${provider}` : r.error ?? "Failed");
    if (r.success) await refresh();
    setBusy(null);
  };
  const disconnect = async (provider: string) => {
    setBusy(provider+"-disc");
    const r = await disconnectMyPaymentAccount(provider);
    setMsg(r.success ? `${provider} disconnected` : r.error ?? "Failed");
    if (r.success) await refresh();
    setBusy(null);
  };

  return (
    <div className="mt-6 space-y-6">
      {msg && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-sm text-emerald-300">{msg}</div>}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-sm font-semibold text-white">Get Paid</p>
        <p className="text-sm text-zinc-400">Choose how customers will pay you. Funds land directly in your account — CreatorStore never takes a fee.</p>
        {active && <p className="mt-2 text-sm text-emerald-300">You&apos;re receiving payments through: <span className="font-semibold">{active}</span> ✓</p>}
        {!active && <p className="mt-2 text-sm text-amber-300">No active payment method — connect and verify a provider below.</p>}
        {readiness?.missing && readiness.missing.length>0 && <ul className="mt-2 text-xs text-amber-300">{readiness.missing.map((m)=><li key={m}>• {m}</li>)}</ul>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PAYMENT_PROVIDERS.filter(p=>p.status==="active").map((p)=>{
          const acct = accounts.find((a)=>a.provider===p.id);
          const state = !acct ? "Not connected" : acct.verificationStatus==="verified" && acct.isActive ? "Ready" : acct.verificationStatus==="verified" ? "Verified" : acct.verificationStatus==="failed" ? "Failed" : acct.verificationStatus==="pending" ? "Verifying" : "Not connected";
          return (
            <div key={p.id} className={`rounded-xl border p-4 ${acct?.isActive ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/[0.06] bg-white/[0.02]"}`}>
              <div className="flex items-center gap-2">
                {p.id==="razorpay" ? <CreditCard className="h-4 w-4 text-zinc-400"/> : <Globe className="h-4 w-4 text-zinc-400"/>}
                <p className="font-semibold text-white">{p.label}</p>
                <span className={`ml-auto rounded px-2 py-0.5 text-[10px] ${state==="Ready"?"bg-emerald-500/20 text-emerald-300":state==="Failed"?"bg-red-500/20 text-red-300":"bg-zinc-700 text-zinc-300"}`}>{state}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{p.description}</p>
              <p className="mt-1 text-[11px] text-zinc-600">Currency: {p.id==="stripe"?"INR, USD, EUR, GBP":"INR"} • Available in your region</p>
              {!acct ? (
                <div className="mt-3 space-y-2">
                  <input placeholder={p.id==="stripe"?"Stripe secret sk_test_...":"Razorpay Key ID"} value={getForm(p.id).providerKeyId} onChange={(e)=>setForm(p.id,"providerKeyId",e.target.value)} className="w-full rounded bg-zinc-900 border border-white/10 px-2 py-1.5 text-xs text-white"/>
                  <input placeholder={p.id==="stripe"?"Stripe account acct_... (optional)":"Razorpay Key Secret"} type="password" value={getForm(p.id).providerKeySecret} onChange={(e)=>setForm(p.id,"providerKeySecret",e.target.value)} className="w-full rounded bg-zinc-900 border border-white/10 px-2 py-1.5 text-xs text-white"/>
                  {p.id==="stripe" && <input placeholder="Stripe connected account acct_... (optional)" value={getForm(p.id).providerAccountId} onChange={(e)=>setForm(p.id,"providerAccountId",e.target.value)} className="w-full rounded bg-zinc-900 border border-white/10 px-2 py-1.5 text-xs text-white"/>}
                  <input placeholder="Account holder name" value={getForm(p.id).accountHolderName} onChange={(e)=>setForm(p.id,"accountHolderName",e.target.value)} className="w-full rounded bg-zinc-900 border border-white/10 px-2 py-1.5 text-xs text-white"/>
                  <input placeholder="UPI ID or leave blank" value={getForm(p.id).upiId} onChange={(e)=>setForm(p.id,"upiId",e.target.value)} className="w-full rounded bg-zinc-900 border border-white/10 px-2 py-1.5 text-xs text-white"/>
                  <button disabled={busy===p.id} onClick={()=>save(p.id)} className="rounded bg-indigo-500 px-3 py-1.5 text-xs text-white disabled:opacity-50">Connect {p.label}</button>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-zinc-400">Holder: {acct.accountHolderName ?? "—"} • {acct.hasProviderKeys?"Keys set":"No keys"}</p>
                  {acct.lastVerifiedAt && <p className="text-[11px] text-zinc-500">Last verified: {new Date(acct.lastVerifiedAt).toLocaleString()}</p>}
                  <div className="flex flex-wrap gap-2">
                    {!acct.isActive && acct.verificationStatus==="verified" && <button disabled={busy===p.id+"-active"} onClick={()=>activate(p.id)} className="rounded bg-emerald-500 px-3 py-1 text-xs text-white">Use {p.label}</button>}
                    {acct.verificationStatus!=="verified" && <button disabled={busy===p.id+"-verify"} onClick={()=>verify(p.id)} className="flex items-center gap-1 rounded border border-white/10 px-3 py-1 text-xs text-zinc-300"><ShieldCheck className="h-3 w-3"/> Verify</button>}
                    <button disabled={busy===p.id+"-disc"} onClick={()=>disconnect(p.id)} className="rounded border border-red-500/20 px-3 py-1 text-xs text-red-400">Disconnect</button>
                  </div>
                  {acct.isActive && <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Active • Future sales will use {p.label}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {active && <p className="text-center"><button onClick={()=>setMsg("Choose another provider above and click Use to change")} className="text-xs text-cyan-300 hover:underline">Change payment method</button></p>}
    </div>
  );
}
