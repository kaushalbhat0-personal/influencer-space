"use client";

import { useEffect, useState } from "react";
import { getMyCustomerSuccess } from "@/actions/customer-success.actions";
import type { CustomerSuccess, TimelineEvent } from "@/modules/customer-success";
import { TrendingUp, AlertTriangle, Sparkles, Clock, CheckCircle2 } from "lucide-react";

/** RCCF-EPIC-09 Phase 6 — Success Journey on the creator dashboard. */
export function SuccessJourneyCard({ initialData }: { initialData?: { success: CustomerSuccess; timeline: TimelineEvent[] } }) {
  const [data, setData] = useState<{ success: CustomerSuccess; timeline: TimelineEvent[] } | null>(
    initialData ?? null,
  );

  useEffect(() => {
    // Checkin side-effect: fire getMyCustomerSuccess with the prebuilt data
    // (if the caller didn't provide it, a full load/signals+timeline round-trip
    // will happen inside the action to preserve the behavior).
    if (!initialData) {
      getMyCustomerSuccess().then((r) => { if (r.ok && r.success) setData({ success: r.success, timeline: r.timeline ?? [] }); });
    }
  }, [initialData]);

  if (!data) return null;
  const { success: s, timeline } = data;

  const riskTone = s.risk === "low" ? "text-emerald-400" : s.risk === "medium" ? "text-amber-400" : "text-red-400";

  return (
    <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            Your Success Journey
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Current stage: <span className="font-semibold text-white">{s.stageLabel}</span>
            {s.nextMilestone && <span className="text-zinc-400"> · Next: <span className="text-indigo-300">{s.nextMilestone.label}</span></span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.score >= 70 ? "bg-emerald-500/10 text-emerald-300" : s.score >= 40 ? "bg-amber-500/10 text-amber-300" : "bg-zinc-500/10 text-zinc-300"}`}>
            {s.score}/100
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.risk === "low" ? "bg-emerald-500/10" : s.risk === "medium" ? "bg-amber-500/10" : "bg-red-500/10"} ${riskTone}`}>
            {s.risk} risk
          </span>
        </div>
      </div>

      {/* Journey progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>{s.completionPercent}% of your journey</span>
          {s.estimatedTimeToNext !== null && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{s.estimatedTimeToNext} day(s) to next milestone</span>
          )}
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-400" style={{ width: `${s.completionPercent}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.milestones.map((m) => (
            <span key={m.stage} className={`rounded-full px-2 py-0.5 text-[10px] ${m.reached ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-zinc-600"}`}>
              {m.reached ? "✓ " : ""}{m.label}
            </span>
          ))}
        </div>
      </div>

      {/* Risks + opportunities */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Needs attention</p>
          <ul className="mt-1.5 space-y-1">
            {s.riskFindings.length === 0 && <li className="text-xs text-emerald-400">Nothing blocking — you&apos;re on track!</li>}
            {s.riskFindings.slice(0, 4).map((f) => (
              <li key={f.key} className="text-xs text-zinc-400">• <span className="text-zinc-300">{f.label}</span>: {f.description}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Opportunities</p>
          <ul className="mt-1.5 space-y-1">
            {s.opportunities.length === 0 && <li className="text-xs text-zinc-500">No opportunities detected yet.</li>}
            {s.opportunities.slice(0, 4).map((o) => (
              <li key={o.type} className="text-xs text-zinc-400">• <span className="text-indigo-300">{o.label}</span>: {o.description}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Recent activity</p>
          <div className="mt-1.5 space-y-1">
            {timeline.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs text-zinc-500">
                <span>{e.label}</span>
                <span className="text-zinc-600">{new Date(e.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
