"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { ThemeDefinition, ThemeTier } from "@/lib/theme/types-new";
import { CATEGORY_LABELS, TIER_LABELS } from "@/lib/theme/types-new";
import { applyThemePackage } from "@/actions/theme.actions";

const FAV_KEY = "theme_favorites";
const RECENT_KEY = "theme_recent";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ThemeMarketplaceClient({
  themes,
  categories,
  plan,
  planTierName,
  currentThemeId,
  tenantId,
  unlockedCount,
}: {
  themes: ThemeDefinition[];
  categories: string[];
  plan: string | null;
  planTierName: string;
  currentThemeId: string | null;
  tenantId: string;
  unlockedCount: number;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("");
  const [sort, setSort] = useState<string>("featured");
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeDefinition | null>(null);
  // Favorites/recent are client-only — hydrate after mount to avoid SSR mismatch.
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [favLoaded, setFavLoaded] = useState(false);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [current, setCurrent] = useState<string | null>(currentThemeId);

  useEffect(() => {
    setFavorites(loadJson(FAV_KEY, []));
    setRecent(loadJson(RECENT_KEY, []));
    setFavLoaded(true);
    setRecentLoaded(true);
  }, []);

  useEffect(() => {
    if (!favLoaded) return;
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch { /* noop */ }
  }, [favorites, favLoaded]);
  useEffect(() => {
    if (!recentLoaded) return;
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch { /* noop */ }
  }, [recent, recentLoaded]);

  const unlocked = useCallback((t: ThemeDefinition) => {
    const tier = (t.tier as ThemeTier | undefined) ?? "free";
    const order = ["free", "starter", "pro", "business", "enterprise"];
    return order.indexOf(tier) <= order.indexOf(planTierName as ThemeTier);
  }, [planTierName]);

  const filtered = useMemo(() => {
    let result = themes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q)));
    }
    if (categoryFilter) result = result.filter((t) => t.category === categoryFilter);
    if (tierFilter) result = result.filter((t) => (t.tier as ThemeTier | undefined) === tierFilter);
    if (onlyUnlocked) result = result.filter(unlocked);
    if (onlyFavorites) result = result.filter((t) => favorites.includes(t.id));

    switch (sort) {
      case "name": result = [...result].sort((a, b) => a.name.localeCompare(b.name)); break;
      case "tier": result = [...result].sort((a, b) => tierOrder(a.tier as ThemeTier | undefined) - tierOrder(b.tier as ThemeTier | undefined)); break;
      case "recent": {
        const r = new Map(recent.map((id, i) => [id, i]));
        result = [...result].sort((a, b) => (r.get(b.id) ?? 999) - (r.get(a.id) ?? 999));
        break;
      }
      case "featured": result = [...result].sort((a, b) => Number(b.featured || false) - Number(a.featured || false)); break;
    }
    return result;
  }, [themes, search, categoryFilter, tierFilter, onlyUnlocked, onlyFavorites, sort, recent, unlocked, favorites]);

  async function handleApply(theme: ThemeDefinition) {
    if (!tenantId || !unlocked(theme)) return;
    setApplying(theme.id);
    setNotice(null);
    const res = await applyThemePackage(tenantId, theme.id);
    setApplying(null);
    if (res.success) {
      setNotice({ kind: "ok", text: `Applied ${theme.name}. Publish to go live.` });
      setCurrent(res.themeId ?? theme.id);
      setRecent((prev) => [theme.id, ...prev.filter((id) => id !== theme.id)].slice(0, 12));
    } else {
      setNotice({ kind: "err", text: res.error ?? "Apply failed" });
    }
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  }

  const tierOrder = (t: ThemeTier | undefined) => ["free", "starter", "pro", "business", "enterprise"].indexOf(t ?? "free");

  return (
    <div className="space-y-6">
      {/* Plan banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${planTierName === "enterprise" ? "bg-purple-900/60 text-purple-300" : planTierName === "business" ? "bg-blue-900/60 text-blue-300" : planTierName === "pro" ? "bg-indigo-900/60 text-indigo-300" : "bg-zinc-800 text-zinc-300"}`}>
            {planTierName}
          </span>
          <span className="text-xs text-zinc-400">{unlockedCount} of {themes.length} themes unlocked</span>
        </div>
        <a href="/admin/billing" className="text-xs text-s8ul-cyan hover:underline">Upgrade plan →</a>
      </div>

      {notice && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${notice.kind === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {notice.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search themes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none">
          <option value="">All categories</option>
          {categories.map((cat) => <option key={cat} value={cat}>{CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}</option>)}
        </select>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none">
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none">
          <option value="featured">Featured</option>
          <option value="tier">Tier</option>
          <option value="name">Name A–Z</option>
          <option value="recent">Recently Used</option>
        </select>
        <button
          onClick={() => setOnlyUnlocked((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-xs transition-colors ${onlyUnlocked ? "border-s8ul-cyan/50 text-s8ul-cyan" : "border-white/10 text-zinc-400 hover:text-zinc-200"}`}
        >
          {onlyUnlocked ? "Unlocked only ✓" : "Unlocked only"}
        </button>
        {favorites.length > 0 && (
          <button
            onClick={() => setOnlyFavorites((v) => !v)}
            className={`rounded-lg border px-3 py-2 text-xs transition-colors ${onlyFavorites ? "border-amber-500/50 text-amber-300" : "border-white/10 text-zinc-400 hover:text-zinc-200"}`}
          >
            ⭐ Favorites {onlyFavorites ? "✓" : ""}
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((theme) => {
          const isUnlocked = unlocked(theme);
          const tier = (theme.tier as ThemeTier | undefined) ?? "free";
          const isCurrent = current === theme.id;
          const isFav = favorites.includes(theme.id);
          const cv = theme.variants[0]?.tokens.colors;
          return (
            <div
              key={theme.id}
              onClick={() => setSelectedTheme(theme)}
              className={`group relative cursor-pointer overflow-hidden rounded-xl border text-left transition-all ${isCurrent ? "border-s8ul-cyan ring-2 ring-s8ul-cyan/50" : "border-white/10 hover:border-white/30"}`}
              data-testid={`theme-card-${theme.slug}`}
            >
              <div className="h-32 w-full" style={{ background: `linear-gradient(135deg, ${cv?.primary} 0%, ${cv?.secondary} 50%, ${cv?.accent} 100%)` }}>
                <div className="absolute left-2 top-2 z-10 flex gap-1">
                  {theme.featured && <span className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-black">Featured</span>}
                  {isCurrent && <span className="rounded bg-s8ul-cyan px-1.5 py-0.5 text-[9px] font-bold text-black">Current</span>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(theme.id); }}
                  className={`absolute right-2 top-2 z-10 rounded-full bg-black/40 p-1 backdrop-blur-sm transition-colors ${isFav ? "text-amber-300" : "text-white/60 hover:text-white"}`}
                  aria-label="Toggle favorite"
                >
                  {isFav ? "★" : "☆"}
                </button>
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]" data-testid={`lock-badge-${theme.slug}`}>
                    <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold text-white">
                      Locked · {TIER_LABELS[tier]}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--text-primary,#FAFAFA)]">{theme.name}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${tier === "free" ? "bg-emerald-900/60 text-emerald-300" : tier === "starter" ? "bg-blue-900/60 text-blue-300" : tier === "pro" ? "bg-amber-900/60 text-amber-300" : "bg-purple-900/60 text-purple-300"}`}>
                    {TIER_LABELS[tier]}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-muted,#71717A)]">{CATEGORY_LABELS[theme.category] || theme.category} &middot; v{theme.version}</p>
                <p className="line-clamp-2 text-[11px] text-[var(--text-secondary,#A1A1AA)]">{theme.description}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {theme.variants.map((v) => (
                    <span key={v.mode} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">{v.mode}</span>
                  ))}
                </div>
                {isUnlocked && !isCurrent && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleApply(theme); }}
                    disabled={applying === theme.id}
                    data-testid={`apply-theme-${theme.slug}`}
                    className="mt-1 w-full rounded-lg bg-s8ul-cyan px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50"
                  >
                    {applying === theme.id ? "Applying…" : "Apply Theme"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-500">No themes found matching your criteria.</p>
        </div>
      )}

      {selectedTheme && (
        <ThemeDetailPanel
          theme={selectedTheme}
          unlocked={unlocked(selectedTheme)}
          planTierName={planTierName}
          onApply={() => handleApply(selectedTheme)}
          applying={applying === selectedTheme.id}
          onClose={() => setSelectedTheme(null)}
        />
      )}
    </div>
  );
}

function ThemeDetailPanel({ theme, unlocked, planTierName, onApply, applying, onClose }: {
  theme: ThemeDefinition;
  unlocked: boolean;
  planTierName: string;
  onApply: () => void;
  applying: boolean;
  onClose: () => void;
}) {
  const cv = theme.variants[0]?.tokens.colors;
  const tier = (theme.tier as ThemeTier | undefined) ?? "free";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6" data-testid="theme-detail">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{theme.name}</h2>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${tier === "free" ? "bg-emerald-900/60 text-emerald-300" : tier === "starter" ? "bg-blue-900/60 text-blue-300" : tier === "pro" ? "bg-amber-900/60 text-amber-300" : "bg-purple-900/60 text-purple-300"}`}>
                {TIER_LABELS[tier]}
              </span>
            </div>
            <p className="text-xs text-zinc-500">by {theme.author.name} &middot; v{theme.version} &middot; {theme.category}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg">&times;</button>
        </div>

        <div className="mt-4 h-40 rounded-lg" style={{ background: `linear-gradient(135deg, ${cv?.primary} 0%, ${cv?.secondary} 50%, ${cv?.accent} 100%)` }} />

        <p className="mt-4 text-sm text-zinc-400">{theme.description}</p>

        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Colors</h3>
          <div className="flex flex-wrap gap-2">
            {cv && Object.entries(cv).filter(([k]) => ["primary", "secondary", "accent", "background", "surface"].includes(k)).map(([name, hex]) => (
              <div key={name} className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2 py-1">
                <span className="h-3 w-3 rounded-full border border-white/10" style={{ backgroundColor: hex }} />
                <span className="text-[10px] text-zinc-400">{name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Typography</h3>
          <div className="space-y-1 text-xs text-zinc-500">
            <p>Heading: {theme.variants[0]?.tokens.typography.headingFont}</p>
            <p>Body: {theme.variants[0]?.tokens.typography.bodyFont}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1">
          {theme.tags.map((tag) => (
            <span key={tag} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">{tag}</span>
          ))}
        </div>

        {!unlocked && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400">
            This theme requires the <b>{TIER_LABELS[tier]}</b> plan. Upgrade to unlock its full color system, typography and preview.
            <a href="/admin/billing" className="ml-1 text-s8ul-cyan underline">Upgrade now →</a>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">Cancel</button>
          {unlocked ? (
            <button
              onClick={onApply}
              disabled={applying}
              data-testid="theme-detail-apply"
              className="rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              {applying ? "Applying…" : "Apply Theme"}
            </button>
          ) : (
            <a href="/admin/billing" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
              Upgrade to unlock
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
