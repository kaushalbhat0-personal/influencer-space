"use client";

import Link from "next/link";
import type { PlatformSuccessCenter } from "@/modules/customer-success/application/platform";
import { JOURNEY_STAGE_LABEL } from "@/modules/customer-success/application/journey";

/** RCCF-EPIC-09 Phase 7 — Customer Success Center (read-only, bounded cohort). */
export function SuccessCenterClient({ center }: { center: PlatformSuccessCenter }) {
  const total = center.total || 1;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Customer Success</h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-400">
        Who needs help right now — derived from the canonical runtimes (no manual analysis). Recent-{center.total}-tenant
        cohort snapshot.
      </p>

      {/* Headline */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Headline label="At risk" value={String(center.atRisk.length)} tone="text-red-400" />
        <Headline label="Needing help" value={String(center.needingHelp.length)} tone="text-amber-400" />
        <Headline label="Payment incomplete" value={String(center.paymentIncomplete.length)} tone="text-amber-400" />
        <Headline label="Trial ending" value={String(center.trialEnding.length)} tone="text-violet-400" />
        <Headline label="Inactive 30d" value={String(center.inactive.length)} tone="text-zinc-300" />
        <Headline label="Top performers" value={String(center.topPerformers.length)} tone="text-emerald-400" />
      </div>

      {/* Funnel + buckets */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Journey funnel">
          <div className="space-y-2">
            {center.funnel.map((f) => (
              <div key={f.stage} className="flex items-center gap-3 text-xs">
                <span className="w-40 truncate text-zinc-300">{JOURNEY_STAGE_LABEL[f.stage] ?? f.stage}</span>
                <div className="h-2 flex-1 rounded-full bg-white/5">
                  <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.round((f.count / total) * 100)}%` }} />
                </div>
                <span className="w-10 text-right text-zinc-400">{f.count}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Score & health distribution">
          <div className="space-y-2 text-xs">
            <Row label="Low score (<40)" value={center.scoreBuckets.low} />
            <Row label="Medium score (40-69)" value={center.scoreBuckets.medium} />
            <Row label="High score (70+)" value={center.scoreBuckets.high} />
            <div className="pt-2 border-t border-white/5" />
            <Row label="Healthy websites (70+)" value={center.healthByScore.healthy} />
            <Row label="Moderate (40-69)" value={center.healthByScore.moderate} />
            <Row label="Poor (<40)" value={center.healthByScore.poor} />
          </div>
        </Panel>
      </div>

      {/* At-risk / needing help lists */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Creators at risk">
          {center.atRisk.length === 0 && <p className="text-xs text-zinc-500">No creators at high/critical risk.</p>}
          <div className="space-y-2">
            {center.atRisk.map((c) => (
              <TenantRow key={c.tenantId} tenantId={c.tenantId} score={c.score} risk={c.risk} reasons={c.reasons} />
            ))}
          </div>
        </Panel>
        <Panel title="Creators needing help">
          {center.needingHelp.length === 0 && <p className="text-xs text-zinc-500">No creators at medium risk.</p>}
          <div className="space-y-2">
            {center.needingHelp.map((c) => (
              <TenantRow key={c.tenantId} tenantId={c.tenantId} score={c.score} risk={c.risk} reasons={c.reasons} />
            ))}
          </div>
        </Panel>
      </div>

      {/* Top performers */}
      <div className="mt-6">
        <Panel title="Top performers">
          <div className="space-y-2">
            {center.topPerformers.map((p) => (
              <div key={p.tenantId} className="flex items-center justify-between text-xs text-zinc-400">
                <Link href={`/super-admin/tenants/${p.tenantId}`} className="font-mono hover:text-white">{p.tenantId.slice(0, 12)}</Link>
                <span className="text-emerald-400">{p.score}/100 · {JOURNEY_STAGE_LABEL[p.stage as never] ?? p.stage}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Headline({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className="text-zinc-200">{value}</span>
    </div>
  );
}

function TenantRow({ tenantId, score, risk, reasons }: { tenantId: string; score: number; risk: string; reasons: string[] }) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-zinc-900/50 px-3 py-2">
      <div className="flex items-center justify-between text-xs">
        <Link href={`/super-admin/tenants/${tenantId}`} className="font-mono text-zinc-300 hover:text-white">{tenantId.slice(0, 12)}</Link>
        <span className={risk === "critical" ? "text-red-400" : "text-amber-300"}>{score}/100 · {risk}</span>
      </div>
      <p className="mt-0.5 truncate text-[10px] text-zinc-600">{reasons.join(" · ")}</p>
    </div>
  );
}
