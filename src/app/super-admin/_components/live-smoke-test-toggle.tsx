"use client";

import { useState, useTransition } from "react";
import { getLiveSmokeTestStatus, setLiveSmokeTestEnabled } from "@/actions/live-smoke-test.actions";
import { SMOKE_TEST_WARNING } from "@/modules/billing/domain/live-smoke-test";

interface Props {
  initialEnabled: boolean;
  initialEnabledBy?: string | null;
  initialEnabledAt?: string | null;
}

export function LiveSmokeTestToggle({ initialEnabled, initialEnabledBy, initialEnabledAt }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [enabledBy, setEnabledBy] = useState(initialEnabledBy ?? null);
  const [enabledAt, setEnabledAt] = useState(initialEnabledAt ?? null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = (next: boolean) => {
    if (next) {
      if (!confirm(`Enable LIVE SMOKE TEST pricing? All eligible checkouts for SUPER_ADMIN will be ₹1.\n\n${SMOKE_TEST_WARNING}\n\nThis is REAL MONEY on LIVE Razorpay. Confirm enable?`)) return;
    }
    startTransition(async () => {
      setMsg(null);
      const res = await setLiveSmokeTestEnabled(next);
      if (res.success) {
        setEnabled(!!res.enabled);
        setMsg(next ? "Enabled — ₹1 for eligible plans (SUPER_ADMIN only). Disable immediately after test." : "Disabled — canonical pricing restored.");
        // Refresh status to get by/at
        getLiveSmokeTestStatus()
          .then((s) => {
            setEnabled(s.enabled);
            setEnabledBy(s.enabledBy);
            setEnabledAt(s.enabledAt ? new Date(s.enabledAt).toISOString() : null);
          })
          .catch(() => {});
      } else {
        setMsg(res.error ?? "Failed");
      }
    });
  };

  return (
    <div className="rounded-xl border border-amber-500/20 bg-zinc-900/50 p-5" data-testid="live-smoke-test-toggle">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">LIVE Smoke Test Pricing</h3>
          <p className="mt-1 max-w-2xl text-xs text-zinc-400">
            Temporary SUPER_ADMIN-only override. When enabled, eligible paid plans checkout at <span className="font-mono text-white">₹1</span> (
            <span className="font-mono">creator_grow, creator_scale, partner_solo, partner_scale, additional capacity → ₹1/unit</span>). Canonical
            registry pricing stays unchanged; only checkout amount is overridden server-side. Royalty, capacity, renewal and entitlements unchanged.
          </p>
          <p className="mt-2 text-[11px] text-zinc-500">
            Default OFF. Normal customers never see this when OFF. When ON, <span className="text-amber-400">{SMOKE_TEST_WARNING}</span> — disable
            immediately after smoke test. No query param can set the amount.
          </p>
          {enabled && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300" data-testid="smoke-test-warning">
              ⚠️ {SMOKE_TEST_WARNING} — Eligible checkouts are ₹1 REAL MONEY. Disable immediately after test.
            </div>
          )}
          <div className="mt-2 text-[11px] text-zinc-500">
            Status: <span className={enabled ? "text-amber-400 font-semibold" : "text-zinc-300"}>{enabled ? "ENABLED — ₹1" : "DISABLED — canonical"}</span>
            {enabled && enabledAt && <span className="ml-2">since {new Date(enabledAt).toLocaleString()} {enabledBy ? `by ${enabledBy.slice(0, 8)}` : ""}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <button
            onClick={() => toggle(true)}
            disabled={pending || enabled}
            className={`rounded-lg px-4 py-2 text-xs font-semibold ${enabled ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-amber-500 text-zinc-900 hover:bg-amber-400"}`}
            data-testid="enable-smoke-test"
          >
            {pending ? "…" : "Enable ₹1"}
          </button>
          <button
            onClick={() => toggle(false)}
            disabled={pending || !enabled}
            className={`rounded-lg border px-4 py-2 text-xs font-semibold ${!enabled ? "border-zinc-700 text-zinc-500 cursor-not-allowed" : "border-white/10 text-white hover:bg-white/5"}`}
            data-testid="disable-smoke-test"
          >
            {pending ? "…" : "Disable"}
          </button>
        </div>
      </div>
      {msg && <p className="mt-3 text-xs text-emerald-400">{msg}</p>}
      <div className="mt-3 rounded bg-zinc-800/50 px-3 py-2 text-[11px] text-zinc-400">
        <p className="font-medium text-zinc-300">Eligible:</p>
        <ul className="ml-4 list-disc">
          <li>creator_grow (₹999 → ₹1) and creator_scale (₹1999 → ₹1)</li>
          <li>partner_solo (₹4999 / ₹49990 → ₹1) and partner_scale (₹14999 / ₹149990 → ₹1)</li>
          <li>additional client capacity (₹2000/unit → ₹1/unit)</li>
        </ul>
        <p className="mt-1">Checkout notes + invoice metadata will be tagged <span className="font-mono">liveSmokeTest:true</span> for audit.</p>
      </div>
    </div>
  );
}
