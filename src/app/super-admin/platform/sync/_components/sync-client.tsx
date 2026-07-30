"use client";

import { useState, useCallback } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2, Eye, Play, Download, FileText } from "lucide-react";
import type { SyncReport } from "@/lib/registry-sync";

type SyncResponse = { success: boolean; report?: SyncReport; error?: string };

export function SyncClient({ dryRun: initialDryRun, schemaMissing: initialMissing }: { dryRun?: boolean; schemaMissing?: string[] }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [dryRun, setDryRun] = useState(initialDryRun ?? true);

  const hasMissingSchema = initialMissing && initialMissing.length > 0;

  const run = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/platform/sync?dryRun=${dryRun}`, { method: "POST" });
      const data: SyncResponse = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ success: false, error: String(e) });
    } finally {
      setLoading(false);
    }
  }, [dryRun]);

  if (hasMissingSchema) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <div>
              <h2 className="text-lg font-semibold text-red-400">Runtime Schema Missing</h2>
              <p className="text-sm text-zinc-400 mt-1">Registry Sync cannot execute. Run the supplied SQL in Supabase SQL Editor.</p>
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-2">Missing Tables</h3>
            <ul className="space-y-1">
              {initialMissing.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm">
                  <span className="text-red-400">✕</span>
                  <span className="font-mono text-zinc-300">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/sql/platform-registry-runtime.sql"
              download
              className="inline-flex items-center gap-2 rounded-lg bg-s8ul-cyan/10 border border-s8ul-cyan/30 px-4 py-2 text-sm text-s8ul-cyan hover:bg-s8ul-cyan/20 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download SQL
            </a>
            <a
              href="/docs/platform-registry-sync#sql-installation"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <FileText className="h-4 w-4" />
              View Instructions
            </a>
          </div>
        </div>

        <div className="admin-card p-4 opacity-50 pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Execute Sync</h2>
            <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">Unavailable</span>
          </div>
          <button disabled className="inline-flex items-center gap-2 rounded-lg bg-zinc-800/50 px-4 py-2 text-sm text-zinc-600 cursor-not-allowed">
            <Play className="h-4 w-4" />
            Schema Required
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">Execute Sync</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)}
            className="rounded border-white/20 bg-zinc-800 text-s8ul-cyan focus:ring-s8ul-cyan/50" />
          <span className="text-xs text-zinc-400">Dry Run</span>
        </label>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-s8ul-cyan/10 border border-s8ul-cyan/30 px-4 py-2 text-sm text-s8ul-cyan hover:bg-s8ul-cyan/20 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : dryRun ? <Eye className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {loading ? "Running..." : dryRun ? "Validate Only" : "Apply Changes"}
      </button>

      {result && (
        <div className={`rounded-lg p-3 text-sm ${result.success ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
          <div className="flex items-center gap-2">
            {result.success ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-red-400" />}
            <span className={result.success ? "text-emerald-400" : "text-red-400"}>
              {result.success ? `${dryRun ? "Validation" : "Sync"} completed in ${result.report?.durationMs ?? 0}ms` : result.error}
            </span>
          </div>
          {result.report && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="text-xs text-zinc-400">
                <span className="text-zinc-500">Created: </span>
                <span className="text-emerald-400">{result.report.created.plans.length + result.report.created.pricings.length + result.report.created.revenueConfigs.length + result.report.created.billingConfigs.length + result.report.created.commissionPolicies.length}</span>
              </div>
              <div className="text-xs text-zinc-400">
                <span className="text-zinc-500">Updated: </span>
                <span className="text-blue-400">{result.report.updated.plans.length + result.report.updated.pricings.length + result.report.updated.revenueConfigs.length + result.report.updated.billingConfigs.length + result.report.updated.commissionPolicies.length}</span>
              </div>
              <div className="text-xs text-zinc-400">
                <span className="text-zinc-500">Deleted: </span>
                <span className="text-red-400">{result.report.deleted.plans.length + result.report.deleted.pricings.length}</span>
              </div>
              <div className="text-xs text-zinc-400">
                <span className="text-zinc-500">Errors: </span>
                <span className="text-red-400">{result.report.errors.length}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
