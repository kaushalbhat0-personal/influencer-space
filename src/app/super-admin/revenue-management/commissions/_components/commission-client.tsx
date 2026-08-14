"use client";

import { useState } from "react";
import { adminUpdateCommissionConfig, adminScheduleCommissionRule, listGlobalCommissionRulesAction } from "@/actions/super-admin-billing.actions";
import { useRouter } from "next/navigation";

type Commission = { agencyClientPercent: number; platformPercent: number; referralPercent: number; creatorDefaultShare: number; agencyDefaultShare: number };

type CommissionRuleView = {
  id: string;
  partnerSharePercent: number;
  platformSharePercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  priority: number;
  status: "ACTIVE" | "SCHEDULED" | "EXPIRED";
};

const STATUS_LABEL: Record<CommissionRuleView["status"], string> = {
  ACTIVE: "Current",
  SCHEDULED: "Scheduled",
  EXPIRED: "Expired",
};

function utcLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

function RuleCard({ rule }: { rule: CommissionRuleView }) {
  const accent = rule.status === "ACTIVE" ? "border-emerald-500/40 bg-emerald-500/5" : rule.status === "SCHEDULED" ? "border-sky-500/40 bg-sky-500/5" : "border-zinc-700 bg-zinc-900/30";
  const text = rule.status === "ACTIVE" ? "text-emerald-400" : rule.status === "SCHEDULED" ? "text-sky-400" : "text-zinc-500";
  return (
    <div className={`rounded-lg border p-4 ${accent}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wide ${text}`}>{STATUS_LABEL[rule.status]}</span>
        <span className="text-sm font-bold text-white">{rule.partnerSharePercent}%</span>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Effective {utcLabel(rule.effectiveFrom)}
        {rule.effectiveTo ? ` → ${utcLabel(rule.effectiveTo)}` : " → open-ended"}
      </p>
      <p className="mt-1 text-[11px] text-zinc-500">Priority {rule.priority}</p>
    </div>
  );
}

export function CommissionClient({ initial, initialRules }: { initial: Commission; initialRules: CommissionRuleView[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Commission>(initial);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  // RCCF-56 schedule form
  const [rules, setRules] = useState<CommissionRuleView[]>(initialRules);
  const [schedule, setSchedule] = useState({ partnerSharePercent: 40, effectiveFrom: "", effectiveTo: "", priority: "" });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState<{ ok: boolean; message: string } | null>(null);

  function set<K extends keyof Commission>(key: K, value: number) {
    setForm((f) => ({ ...f, [key]: Math.max(0, Math.min(100, value)) }));
  }

  async function save() {
    setSaving(true);
    const result = await adminUpdateCommissionConfig(form);
    if (result.success) {
      setNotice({ ok: true, message: "Commission settings saved." });
      router.refresh();
    } else {
      setNotice({ ok: false, message: result.error ?? "Failed to save" });
    }
    setSaving(false);
  }

  async function refreshRules() {
    const res = await listGlobalCommissionRulesAction();
    if (res.success) setRules(res.rules);
  }

  async function scheduleRule() {
    setScheduling(true);
    setScheduleNotice(null);
    // datetime-local is local time — normalize to UTC ISO server-side by sending
    // the raw value and converting here to an explicit UTC instant.
    const effectiveFrom = schedule.effectiveFrom ? new Date(schedule.effectiveFrom).toISOString() : "";
    const effectiveTo = schedule.effectiveTo ? new Date(schedule.effectiveTo).toISOString() : null;
    const result = await adminScheduleCommissionRule({
      partnerSharePercent: schedule.partnerSharePercent,
      effectiveFrom,
      effectiveTo,
      priority: schedule.priority ? Number(schedule.priority) : undefined,
    });
    if (result.success) {
      setScheduleNotice({ ok: true, message: result.status === "SCHEDULED" ? "Rule scheduled." : "Current rule updated." });
      setSchedule({ partnerSharePercent: 40, effectiveFrom: "", effectiveTo: "", priority: "" });
      await refreshRules();
    } else {
      setScheduleNotice({ ok: false, message: result.error ?? "Failed to schedule rule" });
    }
    setScheduling(false);
  }

  const input = "rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 w-20";
  const row = "flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3";

  return (
    <div className="space-y-4">
      <div data-testid="commission-authority-note" className="rounded-lg border border-white/10 bg-zinc-900/50 p-3 text-xs text-zinc-500">
        <span className="text-zinc-300">Agency Default Share</span> is the global Partner subscription commission rate.
        Saving creates/updates the canonical <span className="text-zinc-300">CommissionRule</span>, which overrides the automatic
        loyalty tier (30/40/50%) for future transactions. Without saving an explicit rule, the loyalty tier continues to apply.
        Changes affect <span className="text-zinc-300">future transactions only</span> — historical commissions are never recalculated.
        A partner-specific or plan-specific rule, once configured, takes precedence over the global rule.
      </div>
      {notice && (
        <p data-testid="commission-notice" className={`rounded-lg p-2 text-xs ${notice.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
          {notice.message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue Sharing</h3>
          <div className={row}><span className="text-sm text-zinc-300">Agency Client Revenue Share</span>
            <input className={input} type="number" min={0} max={100} value={form.agencyClientPercent} onChange={(e) => set("agencyClientPercent", Number(e.target.value))} aria-label="Agency client share" data-testid="com-agency" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Platform Fee</span>
            <input className={input} type="number" min={0} max={100} value={form.platformPercent} onChange={(e) => set("platformPercent", Number(e.target.value))} aria-label="Platform fee" data-testid="com-platform" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Referral Commission</span>
            <input className={input} type="number" min={0} max={100} value={form.referralPercent} onChange={(e) => set("referralPercent", Number(e.target.value))} aria-label="Referral commission" data-testid="com-referral" /></div>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-4">Default Splits</h3>
          <div className={row}><span className="text-sm text-zinc-300">Creator Default Share</span>
            <input className={input} type="number" min={0} max={100} value={form.creatorDefaultShare} onChange={(e) => set("creatorDefaultShare", Number(e.target.value))} aria-label="Creator share" data-testid="com-creator" /></div>
          <div className={row}><span className="text-sm text-zinc-300">Agency Default Share</span>
            <input className={input} type="number" min={0} max={100} value={form.agencyDefaultShare} onChange={(e) => set("agencyDefaultShare", Number(e.target.value))} aria-label="Agency share" data-testid="com-agencyshare" /></div>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="rounded-md bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-600 disabled:opacity-50" data-testid="com-save">
        {saving ? "Saving…" : "Save Commission Settings"}
      </button>

      {/* RCCF-56 — Commission Rule lifecycle (effective-dating control) */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <h3 className="text-sm font-semibold text-white">Commission Rules</h3>
        <p className="mt-1 mb-4 text-xs text-zinc-500">
          Global rule windows over time. Exactly one window is effective at any moment — a rule is active while{" "}
          <span className="text-zinc-300">effectiveFrom ≤ now ≤ effectiveTo</span> (open-ended when effectiveTo is empty).
          Scheduling a future rule closes the current window automatically; overlapping windows are rejected.
          Historical commissions are never recalculated.
        </p>

        {scheduleNotice && (
          <p className={`mb-3 rounded-lg p-2 text-xs ${scheduleNotice.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`} data-testid="schedule-notice">
            {scheduleNotice.message}
          </p>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-zinc-400">
            <span className="mb-1 block">Partner Share %</span>
            <input className="w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white" type="number" min={0} max={100} value={schedule.partnerSharePercent} onChange={(e) => setSchedule((s) => ({ ...s, partnerSharePercent: Number(e.target.value) }))} data-testid="schedule-share" />
          </label>
          <label className="text-xs text-zinc-400">
            <span className="mb-1 block">Effective From (local)</span>
            <input className="w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white" type="datetime-local" value={schedule.effectiveFrom} onChange={(e) => setSchedule((s) => ({ ...s, effectiveFrom: e.target.value }))} data-testid="schedule-from" />
          </label>
          <label className="text-xs text-zinc-400">
            <span className="mb-1 block">Effective To (local, optional)</span>
            <input className="w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white" type="datetime-local" value={schedule.effectiveTo} onChange={(e) => setSchedule((s) => ({ ...s, effectiveTo: e.target.value }))} data-testid="schedule-to" />
          </label>
          <label className="text-xs text-zinc-400">
            <span className="mb-1 block">Priority (optional)</span>
            <input className="w-full rounded-md border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white" type="number" min={0} value={schedule.priority} onChange={(e) => setSchedule((s) => ({ ...s, priority: e.target.value }))} data-testid="schedule-priority" />
          </label>
        </div>

        <button onClick={scheduleRule} disabled={scheduling || !schedule.effectiveFrom} className="rounded-md bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50" data-testid="schedule-submit">
          {scheduling ? "Scheduling…" : "Schedule / Apply Rule"}
        </button>

        <div className="mt-5">
          {rules.length === 0 ? (
            <p className="rounded-lg bg-zinc-900/50 p-3 text-center text-xs text-zinc-500" data-testid="rules-empty">
              No global CommissionRules yet — loyalty tiers (30/40/50%) apply.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rules.map((rule) => <RuleCard key={rule.id} rule={rule} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
