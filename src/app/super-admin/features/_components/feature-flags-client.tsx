"use client";

import { useTransition } from "react";
import { togglePlatformFlag } from "@/actions/super-admin.actions";

const LABELS: Record<string, string> = {
  enableYouTubeSync: "Enable YouTube Content Sync",
  enableInstagramSync: "Enable Instagram Content Sync",
  enableTwitchSync: "Enable Twitch Content Sync",
  enableNewRegistrations: "Allow New Tenant Registrations",
  maintenanceMode: "Emergency Maintenance Mode",
};

const DESCRIPTIONS: Record<string, string> = {
  enableYouTubeSync: "Auto-fetch latest videos for all tenants in nightly cron.",
  enableInstagramSync: "Auto-fetch latest posts for all tenants in nightly cron.",
  enableTwitchSync: "Auto-fetch clips for all tenants in nightly cron.",
  enableNewRegistrations: "When disabled, new YouTube Magic Provision is blocked.",
  maintenanceMode: "When enabled, all public storefronts show a maintenance page.",
};

export function FeatureFlagsClient({ flags }: { flags: Record<string, boolean> }) {
  const [pending, startTransition] = useTransition();

  function toggle(key: string) {
    const newValue = !flags[key];
    flags = { ...flags, [key]: newValue };
    startTransition(async () => {
      await togglePlatformFlag(key, newValue);
    });
  }

  return (
    <div className="mt-6 space-y-4">
      {Object.entries(flags).map(([key, enabled]) => {
        const isDanger = key === "maintenanceMode";
        return (
          <div
            key={key}
            className={`flex items-center justify-between rounded-xl border p-5 backdrop-blur-sm transition-all ${
              enabled
                ? isDanger
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-emerald-500/20 bg-emerald-500/5"
                : "border-white/5 bg-zinc-900/50"
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-zinc-300">
                {LABELS[key] || key}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">
                {DESCRIPTIONS[key] || ""}
              </p>
            </div>
            <button
              onClick={() => toggle(key)}
              disabled={pending}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                enabled
                  ? isDanger
                    ? "bg-red-500"
                    : "bg-emerald-500"
                  : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-black transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
