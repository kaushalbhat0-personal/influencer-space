"use client";

import { useState } from "react";
import { savePlanConfig, rollbackPlanVersion, upsertCoupon, upsertLaunchProgram, resyncBillingCatalog } from "@/actions/super-admin-pricing.actions";
import type { PlanRuntimeConfig } from "@/modules/pricing/application/runtime";
import type { TypedCapability } from "@/lib/entitlements/runtime";

export interface CenterPlan {
  code: string;
  name: string;
  family: string;
  price: number | null;
  runtimeConfig: PlanRuntimeConfig | null;
  gracePeriodDays: number;
  hasRow: boolean;
}
export interface CenterVersion { id: string; planCode: string; author: string | null; changeNote: string | null; createdAt: string }
export interface CenterCoupon { id: string; code: string; label: string; scope: string; discountPercent: number | null; discountAmount: number | null; active: boolean; planCodes: string[]; maxUses: number | null; usedCount: number }
export interface CenterProgram { id: string; code: string; name: string; scope: string; discountPercent: number | null; discountAmount: number | null; inviteOnly: boolean; active: boolean; planCodes: string[]; maxEnrollees: number | null; enrolledCount: number }
export interface CenterAnalytics { distribution: Array<{ code: string; name: string; count: number }>; mrr: number; arr: number; trialActive: number; trialConverted: number; churnCount: number }

interface Props {
  plans: CenterPlan[];
  versions: CenterVersion[];
  coupons: CenterCoupon[];
  programs: CenterProgram[];
  analytics: CenterAnalytics;
  capabilityGroups: Array<{ category: string; items: TypedCapability[] }>;
  limitFeatures: Array<{ id: string; label: string }>;
}

type Tab = "editor" | "versions" | "coupons" | "programs" | "analytics";

const num = (v: string | number | null | undefined, fallback: number | null = null): number | null => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function PricingCenterClient({ plans, versions, coupons, programs, analytics, capabilityGroups, limitFeatures }: Props) {
  const [tab, setTab] = useState<Tab>("editor");
  const [selected, setSelected] = useState(plans[0]?.code ?? "");

  const [form, setForm] = useState(() => initForm(plans[0]));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const switchPlan = (code: string) => {
    setSelected(code);
    setForm(initForm(plans.find((x) => x.code === code)));
    setMsg(null);
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const r = await savePlanConfig({
      code: form.code,
      name: form.name,
      family: form.family,
      description: form.description,
      targetAudience: form.targetAudience || null,
      monthlyPrice: num(form.monthlyPrice),
      annualPrice: num(form.annualPrice),
      trialDays: num(form.trialDays),
      gracePeriodDays: num(form.gracePeriodDays, 0) ?? 0,
      badge: form.badge || null,
      ctaLabel: form.ctaLabel,
      ctaType: form.ctaType as "signup" | "checkout" | "contact",
      comparisonOrder: num(form.comparisonOrder, 99) ?? 99,
      hidden: form.hidden,
      enterprise: form.enterprise,
      popular: form.popular,
      bestValue: form.bestValue,
      recommended: form.recommended,
      colorAccent: form.colorAccent || null,
      highlights: form.highlightsText.split("\n").map((s) => s.trim()).filter(Boolean),
      capabilities: Array.from(form.capabilities),
      featureOverrides: form.featureOverrides,
      scheduled: form.scheduled.map((s) => ({ price: num(s.price), annualPrice: num(s.annualPrice), effectiveAt: s.effectiveAt })).filter((s) => s.effectiveAt),
      changeNote: form.changeNote || undefined,
    });
    setMsg(r.success ? "Saved. Marketing, checkout and upgrade dialogs now reflect this plan." : r.error ?? "Save failed");
    setSaving(false);
    if (r.success) setTimeout(() => window.location.reload(), 800);
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "editor", label: "Editor" },
    { id: "versions", label: "Versions" },
    { id: "coupons", label: "Coupons" },
    { id: "programs", label: "Launch Programs" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <select value={selected} onChange={(e) => switchPlan(e.target.value)} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white">
          {plans.map((p) => (
            <option key={p.code} value={p.code}>{p.name} · {p.code}</option>
          ))}
        </select>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === t.id ? "bg-indigo-500 text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "editor" && (
        <Editor
          form={form}
          setForm={setForm}
          save={save}
          saving={saving}
          msg={msg}
          capabilityGroups={capabilityGroups}
          limitFeatures={limitFeatures}
          onReset={async () => {
            const r = await resyncBillingCatalog();
            setMsg(r.success ? "Catalog reset to registry defaults." : r.error ?? "Sync failed");
            if (r.success) setTimeout(() => window.location.reload(), 800);
          }}
        />
      )}
      {tab === "versions" && <Versions versions={versions} planCode={selected} onRollback={async (vid) => { const r = await rollbackPlanVersion(selected, vid); setMsg(r.success ? "Rolled back." : r.error ?? "Rollback failed"); if (r.success) setTimeout(() => window.location.reload(), 800); }} />}
      {tab === "coupons" && <Coupons coupons={coupons} onSave={async (c) => { const r = await upsertCoupon(c); setMsg(r.success ? "Coupon saved." : r.error ?? "Failed"); if (r.success) setTimeout(() => window.location.reload(), 800); }} />}
      {tab === "programs" && <Programs programs={programs} onSave={async (c) => { const r = await upsertLaunchProgram(c); setMsg(r.success ? "Launch program saved." : r.error ?? "Failed"); if (r.success) setTimeout(() => window.location.reload(), 800); }} />}
      {tab === "analytics" && <Analytics analytics={analytics} />}
    </div>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────

interface EditorState {
  code: string;
  name: string;
  family: "creator" | "partner";
  description: string;
  targetAudience: string;
  monthlyPrice: string;
  annualPrice: string;
  trialDays: string;
  gracePeriodDays: string;
  badge: string;
  ctaLabel: string;
  ctaType: string;
  comparisonOrder: string;
  hidden: boolean;
  enterprise: boolean;
  popular: boolean;
  bestValue: boolean;
  recommended: boolean;
  colorAccent: string;
  highlightsText: string;
  capabilities: Set<string>;
  featureOverrides: Record<string, number | boolean | string>;
  scheduled: Array<{ price: string; annualPrice: string; effectiveAt: string }>;
  changeNote: string;
}

function initForm(plan: CenterPlan | undefined): EditorState {
  const rc = plan?.runtimeConfig;
  const m = rc?.marketing;
  const p = rc?.pricing;
  return {
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    family: (plan?.family as "creator" | "partner") ?? "creator",
    description: m?.description ?? "",
    targetAudience: m?.targetAudience ?? "",
    monthlyPrice: p?.price !== undefined && p.price !== null ? String(p.price) : plan?.price !== null && plan?.price !== undefined ? String(plan.price) : "",
    annualPrice: p?.annualPrice !== undefined && p.annualPrice !== null ? String(p.annualPrice) : "",
    trialDays: m?.trialDays !== undefined ? String(m.trialDays) : "",
    gracePeriodDays: String(plan?.gracePeriodDays ?? 0),
    badge: m?.badge ?? "",
    ctaLabel: m?.ctaLabel ?? "Get Started",
    ctaType: m?.ctaType ?? "signup",
    comparisonOrder: String(m?.comparisonOrder ?? 99),
    hidden: m?.hidden ?? false,
    enterprise: m?.enterprise ?? false,
    popular: m?.popular ?? false,
    bestValue: m?.bestValue ?? false,
    recommended: m?.recommended ?? false,
    colorAccent: m?.colorAccent ?? "",
    highlightsText: (m?.highlights ?? []).join("\n"),
    capabilities: new Set(rc?.capabilities ?? []),
    featureOverrides: { ...(rc?.featureOverrides ?? {}) },
    scheduled: (p?.schedule ?? []).map((s) => ({ price: s.price !== null && s.price !== undefined ? String(s.price) : "", annualPrice: s.annualPrice !== null && s.annualPrice !== undefined ? String(s.annualPrice) : "", effectiveAt: s.effectiveAt })),
    changeNote: "",
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600";
const checkCls = "h-4 w-4 rounded border-white/20 bg-zinc-900";

function Editor({ form, setForm, save, saving, msg, capabilityGroups, limitFeatures, onReset }: {
  form: EditorState;
  setForm: React.Dispatch<React.SetStateAction<EditorState>>;
  save: () => void;
  saving: boolean;
  msg: string | null;
  capabilityGroups: Array<{ category: string; items: TypedCapability[] }>;
  limitFeatures: Array<{ id: string; label: string }>;
  onReset: () => Promise<void>;
}) {
  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleCap = (cap: string) => {
    const next = new Set(form.capabilities);
    if (next.has(cap)) next.delete(cap); else next.add(cap);
    set("capabilities", next);
  };
  const setLimit = (key: string, raw: string) => {
    const value = raw.trim() === "" ? 0 : raw.trim() === "-1" ? -1 : (Number(raw) || 0);
    set("featureOverrides", { ...form.featureOverrides, [key]: value });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {/* Left: marketing + pricing */}
      <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white">Marketing & Pricing</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plan name"><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Badge"><input className={inputCls} value={form.badge} onChange={(e) => set("badge", e.target.value)} placeholder="Most Popular" /></Field>
        </div>
        <Field label="Description"><textarea className={inputCls} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Target audience"><input className={inputCls} value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monthly price (₹)"><input className={inputCls} value={form.monthlyPrice} onChange={(e) => set("monthlyPrice", e.target.value)} placeholder="699" /></Field>
          <Field label="Annual price (₹/yr)"><input className={inputCls} value={form.annualPrice} onChange={(e) => set("annualPrice", e.target.value)} placeholder="6990" /></Field>
          <Field label="Trial days"><input className={inputCls} value={form.trialDays} onChange={(e) => set("trialDays", e.target.value)} placeholder="15" /></Field>
          <Field label="Grace period (days)"><input className={inputCls} value={form.gracePeriodDays} onChange={(e) => set("gracePeriodDays", e.target.value)} /></Field>
          <Field label="CTA label"><input className={inputCls} value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} /></Field>
          <Field label="CTA type">
            <select className={inputCls} value={form.ctaType} onChange={(e) => set("ctaType", e.target.value)}>
              <option value="signup">Signup</option><option value="checkout">Checkout</option><option value="contact">Contact Sales</option>
            </select>
          </Field>
          <Field label="Comparison order"><input className={inputCls} value={form.comparisonOrder} onChange={(e) => set("comparisonOrder", e.target.value)} /></Field>
          <Field label="Color accent"><input className={inputCls} value={form.colorAccent} onChange={(e) => set("colorAccent", e.target.value)} placeholder="#6366f1" /></Field>
        </div>
        <Field label="Marketing highlights (one per line)"><textarea className={inputCls} rows={8} value={form.highlightsText} onChange={(e) => set("highlightsText", e.target.value)} /></Field>
        <div className="flex flex-wrap gap-3">
          {(["hidden", "enterprise", "popular", "bestValue", "recommended"] as const).map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" className={checkCls} checked={form[f]} onChange={(e) => set(f, e.target.checked)} />
              {f}
            </label>
          ))}
        </div>
      </div>

      {/* Right: capabilities + limits + schedule + preview */}
      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Capabilities</h2>
          <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
            {capabilityGroups.map((g) => (
              <div key={g.category}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{g.category}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {g.items.map((cap) => (
                    <label key={cap.key} className="flex items-center gap-1.5 text-xs text-zinc-300">
                      <input type="checkbox" className={checkCls} checked={form.capabilities.has(cap.key)} onChange={() => toggleCap(cap.key)} />
                      {cap.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Limits <span className="text-[10px] font-normal text-zinc-500">(-1 = unlimited, 0 = off)</span></h2>
          <div className="grid grid-cols-3 gap-2">
            {limitFeatures.map((f) => (
              <Field key={f.id} label={f.label}>
                <input className={inputCls} value={String(form.featureOverrides[f.id] ?? 0)} onChange={(e) => setLimit(f.id, e.target.value)} />
              </Field>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Scheduled pricing</h2>
          {form.scheduled.length === 0 && <p className="text-xs text-zinc-500">No scheduled changes.</p>}
          <div className="space-y-2">
            {form.scheduled.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={inputCls} value={s.price} onChange={(e) => { const next = [...form.scheduled]; next[i] = { ...next[i], price: e.target.value }; set("scheduled", next); }} placeholder="Price" />
                <input className={inputCls} value={s.annualPrice} onChange={(e) => { const next = [...form.scheduled]; next[i] = { ...next[i], annualPrice: e.target.value }; set("scheduled", next); }} placeholder="Annual" />
                <input type="datetime-local" className={inputCls} value={s.effectiveAt} onChange={(e) => { const next = [...form.scheduled]; next[i] = { ...next[i], effectiveAt: e.target.value }; set("scheduled", next); }} />
                <button onClick={() => set("scheduled", form.scheduled.filter((_, j) => j !== i))} className="text-xs text-red-400">✕</button>
              </div>
            ))}
          </div>
          <button onClick={() => set("scheduled", [...form.scheduled, { price: "", annualPrice: "", effectiveAt: "" }])} className="mt-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">+ Add schedule</button>
        </div>

        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-5">
          <h2 className="mb-2 text-sm font-semibold text-white">Preview</h2>
          <div className="rounded-xl border border-white/10 bg-zinc-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{form.name || "Plan name"}</span>
              {form.badge && <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-semibold text-white">{form.badge}</span>}
            </div>
            {form.targetAudience && <p className="mt-0.5 text-[10px] font-medium text-indigo-400">{form.targetAudience}</p>}
            <div className="mt-3 text-2xl font-bold text-white">
              {num(form.monthlyPrice) === 0 ? (num(form.trialDays) ? `${form.trialDays}-Day Free Trial` : "Free") : num(form.monthlyPrice) ? `₹${Number(form.monthlyPrice).toLocaleString("en-IN")}/mo` : "Custom"}
            </div>
            <ul className="mt-3 space-y-1">
              {form.highlightsText.split("\n").filter(Boolean).slice(0, 5).map((h) => (
                <li key={h} className="flex items-start gap-1.5 text-xs text-zinc-300"><span className="text-emerald-400">✓</span>{h}</li>
              ))}
              {form.highlightsText.split("\n").filter(Boolean).length > 5 && <li className="text-[10px] text-zinc-500">+ more…</li>}
            </ul>
          </div>
        </div>

        <Field label="Change note (audit)"><input className={inputCls} value={form.changeNote} onChange={(e) => set("changeNote", e.target.value)} placeholder="e.g. Price increase for Sept" /></Field>
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50">
            {saving ? "Saving…" : "Save plan"}
          </button>
          <button onClick={onReset} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            Reset to defaults
          </button>
          {msg && <span className="text-sm text-emerald-400">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Versions ─────────────────────────────────────────────────────────────────

function Versions({ versions, planCode, onRollback }: { versions: CenterVersion[]; planCode: string; onRollback: (vid: string) => void }) {
  const filtered = versions.filter((v) => v.planCode === planCode);
  return (
    <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="mb-3 text-sm font-semibold text-white">Version history — {planCode}</h2>
      {filtered.length === 0 && <p className="text-xs text-zinc-500">No versions yet. Every save is versioned.</p>}
      <div className="space-y-2">
        {filtered.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-zinc-900/50 px-3 py-2 text-xs">
            <div>
              <p className="text-zinc-200">{v.changeNote ?? "No note"}</p>
              <p className="text-zinc-500">{new Date(v.createdAt).toLocaleString()} · by {v.author ?? "unknown"} · {v.id.slice(0, 8)}</p>
            </div>
            <button onClick={() => onRollback(v.id)} className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-amber-300 hover:bg-white/5">Rollback</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Coupons & Launch Programs ────────────────────────────────────────────────

function Coupons({ coupons, onSave }: { coupons: CenterCoupon[]; onSave: (c: Parameters<typeof upsertCoupon>[0]) => void }) {
  const [draft, setDraft] = useState({ code: "", label: "", scope: "creator", discountPercent: "", active: true, planCodes: "" });
  const submit = () => onSave({
    code: draft.code, label: draft.label, scope: draft.scope,
    discountPercent: draft.discountPercent ? Number(draft.discountPercent) : null,
    discountAmount: null, active: draft.active,
    planCodes: draft.planCodes.split(",").map((s) => s.trim()).filter(Boolean),
  });
  return (
    <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="mb-3 text-sm font-semibold text-white">Coupons <span className="text-[10px] font-normal text-zinc-500">(foundation — checkout wiring is future)</span></h2>
      <div className="flex flex-wrap gap-2">
        <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
        <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Discount %" value={draft.discountPercent} onChange={(e) => setDraft({ ...draft, discountPercent: e.target.value })} />
        <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Plan codes (comma)" value={draft.planCodes} onChange={(e) => setDraft({ ...draft, planCodes: e.target.value })} />
        <button onClick={submit} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Add coupon</button>
      </div>
      <div className="mt-4 space-y-2">
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-zinc-900/50 px-3 py-2 text-xs">
            <span className="text-zinc-200 font-mono">{c.code}</span>
            <span className="text-zinc-400">{c.label}</span>
            <span className="text-zinc-500">{c.discountPercent ?? c.discountAmount}% off · {c.scope} · {c.usedCount}/{c.maxUses ?? "∞"} used</span>
            <span className={c.active ? "text-emerald-400" : "text-zinc-600"}>{c.active ? "active" : "inactive"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Programs({ programs, onSave }: { programs: CenterProgram[]; onSave: (c: Parameters<typeof upsertLaunchProgram>[0]) => void }) {
  const [draft, setDraft] = useState({ code: "", name: "", scope: "platform", discountPercent: "", inviteOnly: false, active: true, planCodes: "" });
  const submit = () => onSave({
    code: draft.code, name: draft.name, scope: draft.scope,
    discountPercent: draft.discountPercent ? Number(draft.discountPercent) : null,
    discountAmount: null, inviteOnly: draft.inviteOnly, active: draft.active,
    planCodes: draft.planCodes.split(",").map((s) => s.trim()).filter(Boolean),
  });
  return (
    <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="mb-3 text-sm font-semibold text-white">Launch Programs <span className="text-[10px] font-normal text-zinc-500">(Early Adopter, Founding Creator/Agency, Lifetime, Invite-only)</span></h2>
      <div className="flex flex-wrap gap-2">
        <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Code" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
        <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Discount %" value={draft.discountPercent} onChange={(e) => setDraft({ ...draft, discountPercent: e.target.value })} />
        <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" placeholder="Plan codes (comma)" value={draft.planCodes} onChange={(e) => setDraft({ ...draft, planCodes: e.target.value })} />
        <button onClick={submit} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Add program</button>
      </div>
      <div className="mt-4 space-y-2">
        {programs.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-zinc-900/50 px-3 py-2 text-xs">
            <span className="text-zinc-200 font-mono">{c.code}</span>
            <span className="text-zinc-400">{c.name}</span>
            <span className="text-zinc-500">{c.discountPercent ?? c.discountAmount}% off · {c.scope} · {c.enrolledCount}/{c.maxEnrollees ?? "∞"} enrolled</span>
            <span className="flex items-center gap-2"><span className={c.active ? "text-emerald-400" : "text-zinc-600"}>{c.active ? "active" : "inactive"}</span>{c.inviteOnly && <span className="text-violet-300">invite-only</span>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analytics ────────────────────────────────────────────────────────────────

function Analytics({ analytics }: { analytics: CenterAnalytics }) {
  const total = analytics.distribution.reduce((s, d) => s + d.count, 0);
  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card label="MRR" value={`₹${analytics.mrr.toLocaleString("en-IN")}`} />
        <Card label="ARR" value={`₹${analytics.arr.toLocaleString("en-IN")}`} />
        <Card label="Trial active" value={String(analytics.trialActive)} />
        <Card label="Trial → paid" value={String(analytics.trialConverted)} />
        <Card label="Cancelled" value={String(analytics.churnCount)} />
        <Card label="Subscriptions" value={String(total)} />
      </div>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Plan distribution</h2>
        <div className="space-y-2">
          {analytics.distribution.map((d) => (
            <div key={d.code} className="flex items-center gap-3 text-xs">
              <span className="w-40 truncate text-zinc-300">{d.name} <span className="text-zinc-600 font-mono">· {d.code}</span></span>
              <div className="h-2 flex-1 rounded-full bg-white/5">
                <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${total ? Math.round((d.count / total) * 100) : 0}%` }} />
              </div>
              <span className="w-10 text-right text-zinc-400">{d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}
