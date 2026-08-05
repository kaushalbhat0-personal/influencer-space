"use client";

import { useState, useTransition } from "react";
import { runIntegrityScanAction, runSafeCleanupAction } from "@/actions/integrity.actions";
import { useRouter } from "next/navigation";

export function IntegrityDashboardClient() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  async function handleScan() {
    startTransition(async () => {
      const result = await runIntegrityScanAction();
      setScanResult(`${result.totalIssues} issues found across ${result.issues.length} categories. Status: ${result.status}.`);
      router.refresh();
    });
  }

  async function handleCleanup() {
    startTransition(async () => {
      const result = await runSafeCleanupAction();
      setCleanupResult(result.details.length > 0 ? result.details.join(". ") : "No cleanup needed.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button onClick={handleScan} className="rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-4 py-2 text-sm text-indigo-400 hover:bg-indigo-500/30 transition-colors">
          Run Integrity Scan
        </button>
        <button onClick={handleCleanup} className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/30 transition-colors">
          Run Safe Cleanup
        </button>
      </div>

      {scanResult && <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-400">{scanResult}</div>}
      {cleanupResult && <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">{cleanupResult}</div>}

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 text-xs text-zinc-500 space-y-2">
        <p><strong className="text-zinc-400">Delete Policy:</strong></p>
        <p><span className="text-red-400">Hard delete</span> — Website, Products, Orders, Bookings, Gallery, Media, Timeline, Messages, Offerings, Legacy Subscriptions</p>
        <p><span className="text-amber-400">Archive</span> — Orders, Purchases, Audit Log, Billing Events, Billing Subscriptions</p>
        <p><span className="text-red-500 font-bold">Never delete</span> — Invoices (financial history must be preserved)</p>
        <p><span className="text-blue-400">Soft delete</span> — User accounts (30-day recovery window)</p>
      </div>
    </div>
  );
}
