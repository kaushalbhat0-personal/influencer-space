"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, RotateCcw, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { themeRegistry } from "@/lib/theme/registry-new";
import { capabilityService } from "@/lib/capabilities/service";
import type { ThemeDefinition } from "@/lib/theme/types-new";

interface Props {
  currentThemeId: string | null;
  planCode?: string | null;
  onThemePreview: (themeId: string) => void;
  previewThemeId: string | null;
  onApplyTheme: () => void;
}

function extractSwatches(theme: ThemeDefinition): string[] {
  if (theme.colorSwatches && theme.colorSwatches.length > 0) return theme.colorSwatches;
  const variant = theme.variants[0];
  if (!variant) return [];
  const c = variant.tokens.colors;
  const order = ["primary", "secondary", "accent", "surface", "background", "textPrimary"] as const;
  return order.map((k) => c[k]).filter((s) => s.startsWith("#")).slice(0, 6);
}

export function ThemeCard({ currentThemeId, planCode, onThemePreview, previewThemeId, onApplyTheme }: Props) {
  const [allThemes, setAllThemes] = useState<ThemeDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const displayId = previewThemeId ?? currentThemeId;

  useEffect(() => {
    setAllThemes(themeRegistry.getAll());
    setLoading(false);
  }, []);

  if (loading || !currentThemeId) return null;

  const hasPreview = previewThemeId !== null && previewThemeId !== currentThemeId;

  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5">
        {allThemes.slice(0, 6).map((theme) => {
          const swatches = extractSwatches(theme);
          const isActive = displayId === theme.id;
          const isPremium = theme.premium;
          const canAccess = !isPremium || (planCode ? capabilityService.can(planCode, "premium_themes").allowed : false);
          const isLight = detectLightness(swatches);

          return (
            <button
              key={theme.id}
              disabled={!canAccess}
              onClick={() => onThemePreview(theme.id)}
              className={cn(
                "group relative rounded-lg border p-1.5 text-left transition-all",
                isActive
                  ? "border-s8ul-cyan/40 bg-s8ul-cyan/5 shadow-[0_0_8px_rgba(0,245,255,0.08)]"
                  : "border-white/5 bg-zinc-900/50 hover:border-white/10 hover:bg-zinc-900",
                !canAccess && "opacity-40 cursor-not-allowed"
              )}
            >
              {isActive && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-s8ul-cyan">
                  <CheckCircle2 className="h-3 w-3 text-black" />
                </div>
              )}

              <div className="flex h-7 overflow-hidden rounded border border-white/5 mb-1">
                {swatches.slice(0, 4).map((color, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                ))}
                {swatches.length === 0 && (
                  <div className="flex-1 bg-zinc-800" />
                )}
              </div>

              <p className="text-[10px] font-medium text-zinc-300 truncate leading-tight">{theme.name}</p>

              <div className="flex items-center gap-1 mt-0.5">
                {isLight !== null && (
                  <span className={cn(
                    "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[7px] font-medium",
                    isLight ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                  )}>
                    {isLight ? <Sun className="h-2 w-2" /> : <Moon className="h-2 w-2" />}
                    {isLight ? "Light" : "Dark"}
                  </span>
                )}
                {isPremium && (
                  <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[7px] text-amber-400">Premium</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {hasPreview && (
        <div className="flex gap-1 mt-2">
          <button onClick={onApplyTheme}
            className="flex-1 rounded-md bg-emerald-500/10 py-1 text-[9px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            Apply Theme
          </button>
          <button onClick={() => onThemePreview(currentThemeId)}
            className="rounded-md bg-zinc-800 px-2 py-1 text-[9px] text-zinc-500 hover:bg-zinc-700 transition-colors">
            <RotateCcw className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function detectLightness(swatches: string[]): boolean | null {
  if (swatches.length === 0) return null;
  const hex = swatches[0]?.replace("#", "") ?? "";
  if (hex.length < 6) return null;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5;
}
