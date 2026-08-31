"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { CheckCircle2, RotateCcw, Lock, Star, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { themeRegistry } from "@/lib/theme/registry-new";
import { getThemeTier, themeUnlockedForPlan } from "@/lib/theme/tiers";
import { TIER_LABELS, type ThemeTier } from "@/lib/theme/types-new";
import { CATEGORY_LABELS } from "@/lib/theme/types-new";
import type { ThemeDefinition } from "@/lib/theme/types-new";

const FAV_KEY = "theme_favorites";
const RECENT_KEY = "theme_recent";

interface Props {
  currentThemeId: string | null;
  planCode?: string | null;
  onThemePreview: (themeId: string) => void;
  previewThemeId: string | null;
  onApplyTheme: (themeId: string) => void;
}

function extractSwatches(theme: ThemeDefinition): string[] {
  if (theme.colorSwatches && theme.colorSwatches.length > 0) return theme.colorSwatches;
  const variant = theme.variants[0];
  if (!variant) return [];
  const c = variant.tokens.colors;
  const order = ["primary", "secondary", "accent", "surface", "background", "textPrimary"] as const;
  return order.map((k) => c[k]).filter((s) => s.startsWith("#")).slice(0, 6);
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const TIER_ORDER: ThemeTier[] = ["free", "starter", "pro", "business", "enterprise"];

export function ThemeCard({ currentThemeId, planCode, onThemePreview, previewThemeId, onApplyTheme }: Props) {
  const [allThemes, setAllThemes] = useState<ThemeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showUpgrade, setShowUpgrade] = useState<string | null>(null);

  useEffect(() => {
    const themes = themeRegistry.getAll();
    // Stable sort: current first, then tier (free→business), then name.
    setAllThemes(themes);
    setLoading(false);
  }, []);

  useEffect(() => {
    setFavorites(loadJson(FAV_KEY, []));
  }, []);

  useEffect(() => {
    if (favorites.length === 0) return;
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch { /* noop */ }
  }, [favorites]);

  const isUnlocked = useCallback((t: ThemeDefinition) => themeUnlockedForPlan(t, planCode), [planCode]);

  const filtered = useMemo(() => {
    let result = allThemes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q)));
    }
    if (favoritesOnly) result = result.filter((t) => favorites.includes(t.id));
    if (category) result = result.filter((t) => t.category === category);
    const currentFirst = (a: ThemeDefinition, b: ThemeDefinition) => Number(b.id === currentThemeId) - Number(a.id === currentThemeId);
    const tierSort = (a: ThemeDefinition, b: ThemeDefinition) => TIER_ORDER.indexOf(getThemeTier(a)) - TIER_ORDER.indexOf(getThemeTier(b));
    return [...result].sort((a, b) => currentFirst(a, b) || tierSort(a, b) || a.name.localeCompare(b.name));
  }, [allThemes, search, category, favoritesOnly, favorites, currentThemeId]);

  const categories = useMemo(() => [...Array.from(new Set(allThemes.map((t) => t.category)))].sort(), [allThemes]);

  const displayId = previewThemeId ?? currentThemeId;
  const previewing = previewThemeId !== null && previewThemeId !== currentThemeId;
  const previewingTheme = allThemes.find((t) => t.id === previewThemeId);
  const previewingLocked = previewingTheme ? !isUnlocked(previewingTheme) : false;

  if (loading || !currentThemeId) return null;

  function handleCardClick(theme: ThemeDefinition) {
    onThemePreview(theme.id);
    if (previewThemeId === theme.id) return;
  }

  function handleApply(theme: ThemeDefinition) {
    if (!isUnlocked(theme)) {
      setShowUpgrade(theme.id);
      return;
    }
    onApplyTheme(theme.id);
  }

  function toggleFav(id: string) {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  }

  return (
    <div className="space-y-2">
      {/* Preview banner */}
      {previewing && previewingTheme && (
        <div
          className={cn(
            "rounded-lg border px-2 py-1.5 text-[9px] font-medium",
            previewingLocked ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-indigo-400/40 bg-indigo-500/10 text-indigo-300",
          )}
          data-testid="preview-banner"
        >
          {previewingLocked
            ? `Previewing ${previewingTheme.name} (${TIER_LABELS[getThemeTier(previewingTheme)]}) — Upgrade to apply permanently.`
            : `Previewing ${previewingTheme.name}.`}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search themes..."
          className="admin-input py-1.5 pl-6 pr-2 text-[10px]"
        />
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="admin-select px-2 py-1 text-[9px]"
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] || c}</option>)}
        </select>
        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          className={cn("rounded-md border px-2 py-1 text-[9px]", favoritesOnly ? "border-amber-500/40 text-amber-300" : "border-white/10 text-zinc-500 hover:text-zinc-300")}
          title="Favorites"
          aria-pressed={favoritesOnly}
          aria-label="Toggle favorites only"
        >
          <Star className={cn("h-3 w-3", favorites.length > 0 && "fill-amber-400 text-amber-400")} />
        </button>
      </div>

      <p className="text-[9px] text-zinc-600">{filtered.length} of {allThemes.length} themes</p>

      {/* Theme grid — ALL themes (no subset) */}
      <div className="grid grid-cols-2 gap-1.5 max-h-[420px] overflow-y-auto pr-0.5">
        {filtered.map((theme) => {
          const swatches = extractSwatches(theme);
          const tier = getThemeTier(theme);
          const unlocked = isUnlocked(theme);
          const isActive = displayId === theme.id;
          const isCurrent = currentThemeId === theme.id;
          const isPreview = previewThemeId === theme.id && !isCurrent;
          const isFav = favorites.includes(theme.id);

          return (
            <div
              key={theme.id}
              onClick={() => handleCardClick(theme)}
              className={cn(
                "group relative cursor-pointer rounded-lg border p-1.5 text-left transition-all",
                isActive
                  ? "border-indigo-400/40 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                  : "border-white/5 bg-zinc-900/50 hover:border-white/10 hover:bg-zinc-900",
              )}
              data-testid={`builder-theme-${theme.slug}`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggleFav(theme.id); }}
                className={cn("absolute right-1 top-1 z-10 rounded-full p-0.5", isFav ? "text-amber-300" : "text-white/40 hover:text-white")}
                aria-label="Toggle favorite"
              >
                <Star className={cn("h-2.5 w-2.5", isFav && "fill-amber-400")} />
              </button>

              <div className="flex h-7 overflow-hidden rounded border border-white/5 mb-1">
                {swatches.slice(0, 4).map((color, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                ))}
                {swatches.length === 0 && <div className="flex-1 bg-zinc-800" />}
              </div>

              <div className="flex items-center gap-1">
                <p className="flex-1 truncate text-[10px] font-medium text-zinc-300">{theme.name}</p>
                {isCurrent && <span className="rounded bg-indigo-500 px-1 py-0.5 text-[7px] font-bold text-white">Current</span>}
                {isPreview && <span className="rounded bg-purple-500/20 px-1 py-0.5 text-[7px] font-bold text-purple-300">Preview</span>}
              </div>

              <div className="mt-0.5 flex items-center gap-1">
                <span className={cn(
                  "rounded px-1 py-0.5 text-[7px] font-semibold",
                  tier === "free" ? "bg-emerald-900/60 text-emerald-300"
                    : tier === "starter" ? "bg-blue-900/60 text-blue-300"
                    : tier === "pro" ? "bg-amber-900/60 text-amber-300"
                    : "bg-purple-900/60 text-purple-300",
                )}>
                  {TIER_LABELS[tier]}
                </span>
                {!unlocked && <Lock className="h-2.5 w-2.5 text-zinc-500" />}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="py-4 text-center text-[10px] text-zinc-600">No themes match.</p>}

      {/* Apply / restore bar */}
      {previewing && previewingTheme && (
        <div className="flex gap-1 pt-1">
          {previewingLocked ? (
            <button
              onClick={() => setShowUpgrade(previewingTheme.id)}
              data-testid="builder-upgrade"
              className="flex-1 rounded-md bg-amber-500/10 py-1 text-[9px] font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              Upgrade to Apply
            </button>
          ) : (
            <button
              onClick={() => handleApply(previewingTheme)}
              data-testid="builder-apply-theme"
              className="flex-1 rounded-md bg-emerald-500/10 py-1 text-[9px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Apply Theme
            </button>
          )}
          <button
            onClick={() => onThemePreview(currentThemeId)}
            className="rounded-md bg-zinc-800 px-2 py-1 text-[9px] text-zinc-500 hover:bg-zinc-700 transition-colors"
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      {/* Upgrade dialog */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="upgrade-dialog">
          <div className="w-full max-w-xs rounded-xl border border-white/10 bg-zinc-900 p-4">
            <h4 className="text-sm font-semibold text-white">Upgrade to apply this theme</h4>
            <p className="mt-1 text-[10px] text-zinc-400">
              {allThemes.find((t) => t.id === showUpgrade)?.name} requires the <b>{TIER_LABELS[getThemeTier(allThemes.find((t) => t.id === showUpgrade)!)]}</b> plan. You can keep previewing it, then upgrade to apply permanently.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setShowUpgrade(null)} className="rounded-md border border-white/10 px-3 py-1 text-[10px] text-zinc-300 hover:bg-white/5">Keep Previewing</button>
              <a href="/admin/billing" className="rounded-md bg-amber-500 px-3 py-1 text-[10px] font-semibold text-black hover:opacity-90">Upgrade</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
