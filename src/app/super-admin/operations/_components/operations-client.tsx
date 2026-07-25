"use client";

import { useState, useCallback } from "react";
import { RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type ActionResult = { success: boolean; results?: Record<string, string>; error?: string; retried?: number; expired?: number };

export function OperationsClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = useCallback(async (action: string) => {
    setLoading(action);
    setResult(null);
    try {
      const m = await import("@/actions/operations.actions");
      let res: ActionResult;
      switch (action) {
        case "rehydrate-all": res = await m.rehydrateEngine("all"); break;
        case "rehydrate-partner": res = await m.rehydrateEngine("partner"); break;
        case "rehydrate-commission": res = await m.rehydrateEngine("commission"); break;
        case "rehydrate-payout": res = await m.rehydrateEngine("payout"); break;
        case "rehydrate-eventbus": res = await m.rehydrateEngine("eventbus"); break;
        case "retry-payouts": res = await m.retryFailedPayouts(); break;
        case "expire-invites": res = await m.expireStaleInvites(); break;
        default: res = { success: false, error: "Unknown action" };
      }
      setResult(res);
    } catch (e) {
      setResult({ success: false, error: String(e) });
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "rehydrate-all", label: "Rehydrate All Engines", icon: RefreshCw },
          { id: "rehydrate-partner", label: "Rehydrate Partner", icon: RefreshCw },
          { id: "rehydrate-commission", label: "Rehydrate Commission", icon: RefreshCw },
          { id: "rehydrate-payout", label: "Rehydrate Payout", icon: RefreshCw },
          { id: "rehydrate-eventbus", label: "Rehydrate Event Bus", icon: RefreshCw },
          { id: "retry-payouts", label: "Retry Failed Payouts", icon: AlertTriangle },
          { id: "expire-invites", label: "Expire Stale Invites", icon: AlertTriangle },
        ].map((action) => (
          <button
            key={action.id}
            onClick={() => run(action.id)}
            disabled={loading === action.id}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {loading === action.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <action.icon className="h-3 w-3" />}
            {action.label}
          </button>
        ))}
      </div>

      {result && (
        <div className={`rounded-lg p-3 text-sm ${result.success ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
          <div className="flex items-center gap-2">
            {result.success ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-red-400" />}
            <span className={result.success ? "text-emerald-400" : "text-red-400"}>
              {result.success ? "Completed" : result.error}
            </span>
          </div>
          {result.results && (
            <div className="mt-2 text-xs text-zinc-400 space-y-1">
              {Object.entries(result.results).map(([key, val]) => (
                <div key={key} className="flex gap-2"><span className="text-zinc-500">{key}:</span><span>{val}</span></div>
              ))}
            </div>
          )}
          {result.retried !== undefined && <p className="mt-1 text-xs text-zinc-400">Retried {result.retried} failed payouts</p>}
          {result.expired !== undefined && <p className="mt-1 text-xs text-zinc-400">Expired {result.expired} stale invites</p>}
        </div>
      )}
    </div>
  );
}
