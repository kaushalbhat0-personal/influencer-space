"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAgencySuccessData } from "@/actions/customer-success.actions";
import { AlertTriangle, TrendingUp } from "lucide-react";

/** RCCF-EPIC-09 Phase 8 — agency clients needing attention. */
export function AgencySuccessSection({ agencyId }: { agencyId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAgencySuccessData>> | null>(null);

  useEffect(() => {
    getAgencySuccessData(agencyId).then(setData);
  }, [agencyId]);

  const clients = data?.clients ?? [];
  const atRisk = clients.filter((c) => c.risk === "high" || c.risk === "critical");
  const needsHelp = clients.filter((c) => c.risk === "medium");
  const top = [...clients].sort((a, b) => b.score - a.score).slice(0, 5);

  if (clients.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
        <TrendingUp className="h-4 w-4 text-indigo-400" />
        Client Success
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Needing attention" value={String(atRisk.length)} tone="text-red-400" />
        <Stat label="Could improve" value={String(needsHelp.length)} tone="text-amber-400" />
        <Stat label="Healthy" value={String(clients.filter((c) => c.risk === "low").length)} tone="text-emerald-400" />
        <Stat label="Total clients" value={String(clients.length)} />
      </div>

      {atRisk.length > 0 && (
        <div className="mt-3 rounded-xl border border-red-500/10 bg-red-500/5 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-red-400"><AlertTriangle className="h-3.5 w-3.5" /> Clients needing attention</p>
          <div className="mt-2 space-y-1.5">
            {atRisk.map((c) => (
              <Link key={c.tenantId} href={`/agency/clients/${c.tenantId}`} className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900/70">
                <span className="font-mono">{c.tenantId.slice(0, 12)}</span>
                <span className="text-zinc-400">{c.reasons.slice(0, 2).join(" · ")} · {c.score}/100</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {top.length > 0 && (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs font-semibold text-white">Top-performing clients</p>
          <div className="mt-2 space-y-1.5">
            {top.map((c) => (
              <div key={c.tenantId} className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-mono">{c.tenantId.slice(0, 12)}</span>
                <span className="text-emerald-400">{c.score}/100</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}
