"use client";

import { useState, useTransition } from "react";
import { updateThemeConfig } from "@/actions/settings.actions";
import type { ThemeConfigInput } from "@/actions/settings.actions";
import { PreviewShell } from "@/components/admin/PreviewShell";
import type { ThemeOverrides } from "@/components/admin/PreviewShell";

const COLOR_PRESETS = [
  { label: "Cyan", primary: "#00f5ff", secondary: "#00f5ff", accent: "#06b6d4" },
  { label: "Magenta", primary: "#ec4899", secondary: "#ec4899", accent: "#db2777" },
  { label: "Amber", primary: "#f59e0b", secondary: "#f59e0b", accent: "#d97706" },
  { label: "Lime", primary: "#84cc16", secondary: "#84cc16", accent: "#65a30d" },
  { label: "Violet", primary: "#8b5cf6", secondary: "#8b5cf6", accent: "#7c3aed" },
  { label: "Rose", primary: "#f43f5e", secondary: "#f43f5e", accent: "#e11d48" },
  { label: "Emerald", primary: "#10b981", secondary: "#10b981", accent: "#059669" },
  { label: "Sky", primary: "#0ea5e9", secondary: "#0ea5e9", accent: "#0284c7" },
];

const FONTS = [
  { value: "geist", label: "Geist (Default)" },
  { value: "inter", label: "Inter" },
  { value: "plex", label: "IBM Plex" },
  { value: "mono", label: "JetBrains Mono" },
];

interface ThemeState {
  primary: string;
  secondary: string;
  accent: string;
  font: string;
  borderRadius: string;
  layoutDensity: "compact" | "comfortable" | "spacious";
}

export function AppearanceManager({
  tenantId,
  initialTheme,
}: {
  tenantId: string;
  initialTheme: Record<string, unknown>;
}) {
  const [theme, setTheme] = useState<ThemeState>({
    primary: (initialTheme.primary as string) || "#00f5ff",
    secondary: (initialTheme.secondary as string) || "#00f5ff",
    accent: (initialTheme.accent as string) || "#06b6d4",
    font: (initialTheme.font as string) || "geist",
    borderRadius: (initialTheme.borderRadius as string) || "8",
    layoutDensity: (initialTheme.layoutDensity as "compact" | "comfortable" | "spacious") || "comfortable",
  });

  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function applyChange(partial: Partial<ThemeState>) {
    const updated = { ...theme, ...partial };
    setTheme(updated);
    setSaved(false);

    startTransition(async () => {
      await updateThemeConfig(tenantId, partial as ThemeConfigInput);
      setSaved(true);
    });
  }

  const previewTheme: ThemeOverrides = {
    primary: theme.primary,
    secondary: theme.secondary,
    accent: theme.accent,
    font: theme.font,
    borderRadius: `${theme.borderRadius}px`,
    layoutDensity: theme.layoutDensity,
  };

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        {/* ─── Color Presets ─── */}
        <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-zinc-300">Color Presets</h2>
          <p className="mt-1 text-xs text-zinc-500">Pick a preset or customize individual colors below.</p>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {COLOR_PRESETS.map((preset) => {
              const isActive = theme.accent === preset.accent;
              return (
                <button
                  key={preset.label}
                  onClick={() => applyChange({ primary: preset.primary, secondary: preset.secondary, accent: preset.accent })}
                  disabled={pending}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-all ${
                    isActive
                      ? "border-white/20 bg-white/5 ring-1 ring-white/10"
                      : "border-white/5 bg-zinc-900 hover:border-white/10"
                  }`}
                >
                  <span
                    className="h-8 w-8 rounded-full border-2 border-zinc-800 shadow-lg"
                    style={{ backgroundColor: preset.accent }}
                  />
                  <span className="text-[10px] font-medium text-zinc-400">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Custom Colors ─── */}
        <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-zinc-300">Custom Colors</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {(["primary", "secondary", "accent"] as const).map((key) => (
              <div key={key} className="space-y-2">
                <label className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="capitalize">{key}</span>
                  <span className="font-mono text-zinc-600">{theme[key]}</span>
                </label>
                <div className="relative">
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={(e) => applyChange({ [key]: e.target.value })}
                    disabled={pending}
                    className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-zinc-800 p-0.5"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Font ─── */}
        <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-zinc-300">Typography</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {FONTS.map((f) => (
              <button
                key={f.value}
                onClick={() => applyChange({ font: f.value })}
                disabled={pending}
                className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                  theme.font === f.value
                    ? "border-white/20 bg-white/5 text-white"
                    : "border-white/5 bg-zinc-900 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Border Radius ─── */}
        <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-zinc-300">Border Radius ({theme.borderRadius}px)</h2>
          <input
            type="range"
            min="0"
            max="24"
            value={theme.borderRadius}
            onChange={(e) => applyChange({ borderRadius: e.target.value })}
            disabled={pending}
            className="mt-4 w-full accent-s8ul-cyan"
          />
        </div>

        {/* ─── Layout Density ─── */}
        <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-zinc-300">Layout Density</h2>
          <div className="mt-3 flex gap-2">
            {(["compact", "comfortable", "spacious"] as const).map((d) => (
              <button
                key={d}
                onClick={() => applyChange({ layoutDensity: d })}
                disabled={pending}
                className={`rounded-lg border px-4 py-2 text-xs font-medium capitalize transition-all ${
                  theme.layoutDensity === d
                    ? "border-white/20 bg-white/5 text-white"
                    : "border-white/5 bg-zinc-900 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Save Indicator ─── */}
        <div className="text-center">
          {pending ? (
            <span className="text-xs text-zinc-500">Saving...</span>
          ) : saved ? (
            <span className="text-xs text-emerald-400">Saved</span>
          ) : (
            <span className="text-xs text-zinc-600">Auto-saving on change</span>
          )}
        </div>
      </div>

      {/* ─── Live Preview ─── */}
      <PreviewShell theme={previewTheme}>
        <div className="space-y-6 pt-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 h-16 w-16 rounded-full border-2 border-white/10 bg-zinc-800" />
            <h1 className="font-bold text-white" style={{ color: theme.accent }}>Your Brand</h1>
            <p className="mt-1 text-xs text-zinc-500">Your tagline appears here</p>
          </div>
          <div className="space-y-2">
            <div className="h-10 rounded-lg border border-white/10 bg-zinc-900/50" style={{ borderRadius: `${theme.borderRadius}px` }} />
            <div className="h-10 rounded-lg border border-white/10 bg-zinc-900/50" style={{ borderRadius: `${theme.borderRadius}px` }} />
          </div>
          <button
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-black"
            style={{ backgroundColor: theme.accent, borderRadius: `${theme.borderRadius}px` }}
          >
            Accent Button
          </button>
        </div>
      </PreviewShell>
    </div>
  );
}
