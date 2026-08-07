"use client";

import { useState } from "react";
import { resyncBillingCatalog } from "@/actions/super-admin-pricing.actions";

export interface PricingRow {
  code: string;
  name: string;
  family: "creator" | "partner";
  price: number | null;
  annualPrice: number | null;
  badge: string | null;
  popular: boolean;
  bestValue: boolean;
  recommended: boolean;
  hidden: boolean;
  enterprise: boolean;
  trialDays: number | null;
  marketingDescription: string;
  targetAudience: string | null;
  highlights: string[];
  dbStatus: { status: string; version: number; syncedPrice: number } | null;
}

interface Props {
  rows: PricingRow[];
}

export function PricingCenterClient({ rows }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const resync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const r = await resyncBillingCatalog();
      if (r.success) {
        setResult("Catalog re-synced from the canonical registry.");
        window.location.reload();
      } else {
        setResult(r.error ?? "Sync failed");
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const creatorRows = rows.filter((r) => r.family === "creator");
  const partnerRows = rows.filter((r) => r.family === "partner");

  const renderFamily = (title: string, family: PricingRow[]) => (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-zinc-500">
            <tr className="border-b border-white/[0.08]">
              <th className="px-4 py-2.5">Plan</th>
              <th className="px-4 py-2.5">Price</th>
              <th className="px-4 py-2.5">Annual</th>
              <th className="px-4 py-2.5">Badge</th>
              <th className="px-4 py-2.5">Trial</th>
              <th className="px-4 py-2.5">Flags</th>
              <th className="px-4 py-2.5">Target audience</th>
              <th className="px-4 py-2.5">Highlights</th>
              <th className="px-4 py-2.5">Catalog</th>
            </tr>
          </thead>
          <tbody>
            {family.map((row) => (
              <tr key={row.code} className="border-b border-white/[0.03] align-top">
                <td className="px-4 py-3">
                  <span className="font-medium text-white">{row.name}</span>
                  <span className="block text-[10px] text-zinc-500 font-mono">{row.code}</span>
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {row.price === null ? "Contact Sales" : row.price === 0 ? "Free" : `₹${row.price.toLocaleString("en-IN")}`}
                </td>
                <td className="px-4 py-3 text-zinc-300">{row.annualPrice ? `₹${row.annualPrice.toLocaleString("en-IN")}/yr` : "—"}</td>
                <td className="px-4 py-3">
                  {row.badge ? <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">{row.badge}</span> : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3 text-zinc-300">{row.trialDays ? `${row.trialDays}-day` : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.popular && <Tag label="Popular" />}
                    {row.bestValue && <Tag label="Best Value" />}
                    {row.recommended && <Tag label="Recommended" />}
                    {row.hidden && <Tag label="Hidden" tone="red" />}
                    {row.enterprise && <Tag label="Enterprise" tone="violet" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">{row.targetAudience ?? "—"}</td>
                <td className="px-4 py-3">
                  <ul className="space-y-0.5 text-xs text-zinc-400">
                    {row.highlights.slice(0, 6).map((h) => <li key={h} className="truncate max-w-56">• {h}</li>)}
                    {row.highlights.length > 6 && <li className="text-zinc-600">+{row.highlights.length - 6} more</li>}
                  </ul>
                </td>
                <td className="px-4 py-3 text-xs">
                  {row.dbStatus ? (
                    <span className="text-zinc-400">
                      v{row.dbStatus.version} · {row.dbStatus.status.toLowerCase()}
                      {row.dbStatus.syncedPrice !== row.price && <span className="block text-amber-400">price drift</span>}
                    </span>
                  ) : (
                    <span className="text-amber-400">not synced</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={resync}
          disabled={syncing}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Re-sync catalog"}
        </button>
        {result && <span className="text-sm text-emerald-400">{result}</span>}
      </div>
      {renderFamily("Creator plans", creatorRows)}
      {renderFamily("Partner plans", partnerRows)}
    </div>
  );
}

function Tag({ label, tone = "cyan" }: { label: string; tone?: "cyan" | "red" | "violet" }) {
  const toneClass =
    tone === "red"
      ? "bg-red-500/10 text-red-300"
      : tone === "violet"
        ? "bg-violet-500/10 text-violet-300"
        : "bg-cyan-500/10 text-cyan-300";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${toneClass}`}>{label}</span>;
}
