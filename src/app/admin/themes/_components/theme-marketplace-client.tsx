"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { ThemeDefinition, ThemeTier } from "@/lib/theme/types-new";
import { CATEGORY_LABELS, TIER_LABELS } from "@/lib/theme/types-new";
import { isThemeUnlocked } from "@/lib/theme/access";
import { THEME_TIERS } from "@/lib/theme/types-new";
import { experienceRegistry } from "@/modules/theme/runtime/experience";
import { EXPERIENCE_PACKS } from "@/modules/theme/runtime/experience";
import { isExperienceAvailableForPlan } from "@/modules/theme/runtime/experience";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TIER_COLORS: Record<string, string> = {
  free: "bg-emerald-900/60 text-emerald-300",
  starter: "bg-blue-900/60 text-blue-300",
  pro: "bg-amber-900/60 text-amber-300",
  business: "bg-indigo-900/60 text-indigo-300",
  enterprise: "bg-purple-900/60 text-purple-300",
};

// RCCF-BUILDER-05C-R2.1: family grouping — truthful architecture from actual metadata.
// familylabels are presentation-only; grouping key is the raw `theme.family` value
// (or "legacy" for the ~30 pre-05A themes without family). variantGroup is shown
// per card. No invented taxonomy.
const FAMILY_LABELS: Record<string, string> = {
  creator: "Creator",
  minimal: "Minimal",
  luxury: "Luxury",
  "tech-cyber": "Cyber / Gaming",
  midnight: "Midnight",
  glass: "Glass / Studio",
  executive: "Executive",
  editorial: "Editorial",
  "organic-aurora": "Aurora",
  brutalist: "Brutalist",
  legacy: "Other / Legacy",
};

const FAMILY_ORDER: string[] = [
  "creator",
  "minimal",
  "editorial",
  "luxury",
  "executive",
  "tech-cyber",
  "organic-aurora",
  "midnight",
  "glass",
  "brutalist",
  "legacy",
];

function familyLabel(family: string): string {
  return FAMILY_LABELS[family] ?? family.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" / ");
}

function familyOrderIndex(family: string): number {
  const i = FAMILY_ORDER.indexOf(family);
  return i === -1 ? 999 : i;
}

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
  unlockedCount,
}: {
  themes: ThemeDefinition[];
  categories: string[];
  plan: string | null;
  planTierName: string;
  unlockedCount: number;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("");
  const [experienceFilter, setExperienceFilter] = useState<string>("");
  const [sort, setSort] = useState<string>("featured");
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeDefinition | null>(null);
  // Favorites/recent are client-only — hydrate after mount to avoid SSR mismatch.
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [favLoaded, setFavLoaded] = useState(false);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const router = useRouter();

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

  const unlocked = useCallback(
    (t: ThemeDefinition) => isThemeUnlocked(t.tier as ThemeTier | undefined, plan),
    [plan],
  );

  const tierOrder = (t: ThemeTier | undefined) => ["free", "starter", "pro", "business", "enterprise"].indexOf(t ?? "free");

  const filtered = useMemo(() => {
    let result = themes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q)));
    }
    if (categoryFilter) result = result.filter((t) => t.category === categoryFilter);
    if (tierFilter) result = result.filter((t) => (t.tier as ThemeTier | undefined) === tierFilter);
    if (experienceFilter) result = result.filter((t) => experienceRegistry.resolve({ id: t.id, category: t.category, premium: t.premium }).id === experienceFilter);
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
  }, [themes, search, categoryFilter, tierFilter, experienceFilter, onlyUnlocked, onlyFavorites, sort, recent, unlocked, favorites]);

  // R2.1 family grouping — derived from already-filtered + sorted result so all
  // existing filters/sort/favorites/unlocked semantics stay intact.
  const grouped = useMemo(() => {
    const map = new Map<string, ThemeDefinition[]>();
    for (const t of filtered) {
      const key = t.family ?? "legacy";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => familyOrderIndex(a[0]) - familyOrderIndex(b[0]));
  }, [filtered]);

  // RCCF-LAUNCH-TRACK-06 (Phase 1): the Marketplace is BROWSE-ONLY. It never
  // mutates a website — "Open in Builder" routes to the Builder with the theme
  // previewed; the Builder is the only place themes are applied and published.
  function openInBuilder(themeId: string) {
    setRecent((prev) => [themeId, ...prev.filter((id) => id !== themeId)].slice(0, 12));
    router.push(`/builder?theme=${encodeURIComponent(themeId)}`);
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  }

  return (
    <div className="space-y-6">
      {/* Plan banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TIER_COLORS[planTierName] ?? "bg-zinc-800 text-zinc-300"}`}>
            {planTierName}
          </span>
          <span className="text-xs text-zinc-400">{unlockedCount} of {themes.length} themes unlocked</span>
        </div>
        <Link href="/admin/billing" className="text-xs text-s8ul-cyan hover:underline">Upgrade plan →</Link>
      </div>

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
          {THEME_TIERS.map((tier) => <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>)}
        </select>
        <select value={experienceFilter} onChange={(e) => setExperienceFilter(e.target.value)} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none">
          <option value="">All experiences</option>
          {Object.values(EXPERIENCE_PACKS).map((exp) => (
            <option key={exp.id} value={exp.id}>{exp.name}{exp.premium ? " ★" : ""}</option>
          ))}
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

      {/* Grouped by Family — R2.1 truthful architecture: 10 families + legacy (no invented taxonomy) */}
      <div className="space-y-8" data-testid="family-grouped-marketplace">
        {grouped.map(([familyKey, familyThemes]) => {
          const label = familyLabel(familyKey);
          const isLegacy = familyKey === "legacy";
          // Variant breakdown for header (restrained metadata, not gradients)
          const variantCounts = new Map<string, number>();
          for (const t of familyThemes) {
            const vg = t.variantGroup ?? "—";
            variantCounts.set(vg, (variantCounts.get(vg) ?? 0) + 1);
          }
          const actualLightCount = familyThemes.filter((t) => t.variants.some((v) => v.mode === "light")).length;
          const familyUnlocked = familyThemes.some((t) => unlocked(t));
          const familyPremium = familyThemes.some((t) => t.premium);
          return (
            <section key={familyKey} data-testid={`family-group-${familyKey}`} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-300">{label}</h2>
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                    {familyThemes.length} theme{familyThemes.length === 1 ? "" : "s"}
                  </span>
                  {actualLightCount > 0 && (
                    <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400" title={`${actualLightCount} theme(s) declare a light variant (source)`}>
                      {actualLightCount} light variant{actualLightCount === 1 ? "" : "s"}
                    </span>
                  )}
                  {familyPremium && !familyUnlocked && (
                    <span className="rounded bg-amber-900/30 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300" title="All variants in this family require an upgrade">
                      Unlock on Grow
                    </span>
                  )}
                  {familyPremium && familyUnlocked && familyThemes.some((t) => !unlocked(t)) && (
                    <span className="rounded bg-emerald-900/30 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300" title="Some variants unlocked, some require upgrade">
                      Partially unlocked
                    </span>
                  )}
                  {!familyPremium && (
                    <span className="rounded bg-emerald-900/30 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">Available</span>
                  )}
                  {isLegacy && (
                    <span className="rounded bg-amber-900/30 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300" title="Pre-05A legacy themes without family/variantGroup — honestly unclassified, behavior preserved">
                      Legacy
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {Array.from(variantCounts.entries()).map(([vg, count]) => (
                    <span key={vg} className="rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-500" title={`variantGroup ${vg}`}>
                      {vg} ×{count}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {familyThemes.map((theme) => {
                  const isUnlocked = unlocked(theme);
                  const tier = (theme.tier as ThemeTier | undefined) ?? "free";
                  const isFav = favorites.includes(theme.id);
                  const cv = theme.variants[0]?.tokens.colors;
                  const exp = experienceRegistry.resolve({ id: theme.id, category: theme.category, premium: theme.premium });
                  const expAvailable = plan ? isExperienceAvailableForPlan(exp.id, plan) : false;
                  const hasLight = theme.variants.some((v) => v.mode === "light");
                  const headingFont = theme.variants[0]?.tokens.typography.headingFont ?? "";
                  const truncatedFont = headingFont.split(",")[0].replace(/['"]/g, "");
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme)}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border text-left transition-all border-white/10 hover:border-white/30`}
                      data-testid={`theme-card-${theme.slug}`}
                    >
                      <div className="h-32 w-full" style={{ background: `linear-gradient(135deg, ${cv?.primary} 0%, ${cv?.secondary} 50%, ${cv?.accent} 100%)` }}>
                        <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1">
                          {theme.featured && <span className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-black">Featured</span>}
                          {hasLight && <span className="rounded bg-white/80 px-1 py-0.5 text-[8px] font-bold text-black" title="Declares a light variant">Light + Dark</span>}
                          {!hasLight && <span className="rounded bg-black/60 px-1 py-0.5 text-[8px] font-semibold text-white/80">Dark only</span>}
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
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[var(--text-primary,#FAFAFA)]">{theme.name}</p>
                          <div className="flex shrink-0 items-center gap-1">
                            {theme.premium && <span className="rounded bg-amber-900/60 px-1 py-0.5 text-[8px] font-bold text-amber-300">PREMIUM</span>}
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${TIER_COLORS[tier] ?? "bg-zinc-800 text-zinc-300"}`}>
                              {TIER_LABELS[tier]}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted,#71717A)]">{CATEGORY_LABELS[theme.category] || theme.category} &middot; v{theme.version}</p>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-300" title={`family ${familyKey}`}>
                            {label}
                          </span>
                          {theme.variantGroup && (
                            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400" title={`variantGroup ${theme.variantGroup}`}>
                              {theme.variantGroup}
                            </span>
                          )}
                          {!theme.variantGroup && isLegacy && (
                            <span className="rounded bg-zinc-900 px-1 py-0.5 text-[9px] text-zinc-600">unclassified</span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-muted,#71717A)]">
                          <span className="text-zinc-500">Exp:</span> {exp.name}
                          {exp.premium && !expAvailable && <span className="ml-1 text-amber-500">(requires upgrade)</span>}
                        </p>
                        <p className="text-[10px] text-zinc-500" title={headingFont}>
                          <span className="text-zinc-600">Font:</span> {truncatedFont || "Inter"}
                        </p>
                        <p className="line-clamp-2 text-[11px] text-[var(--text-secondary,#A1A1AA)]">{theme.description}</p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {theme.variants.map((v) => (
                            <span key={v.mode} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">{v.mode}</span>
                          ))}
                        </div>
                        {isUnlocked && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openInBuilder(theme.id); }}
                            data-testid={`open-in-builder-${theme.slug}`}
                            className="mt-1 w-full rounded-lg bg-s8ul-cyan px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
                          >
                            Open in Builder
                          </button>
                        )}
                        {!isUnlocked && (
                          <Link
                            href="/admin/billing"
                            className="mt-1 block w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-center text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Upgrade to unlock
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-500">No themes found matching your criteria.</p>
          {(search || categoryFilter || tierFilter || experienceFilter || onlyUnlocked || onlyFavorites) && (
            <button
              onClick={() => { setSearch(""); setCategoryFilter(""); setTierFilter(""); setExperienceFilter(""); setOnlyUnlocked(false); setOnlyFavorites(false); }}
              className="mt-2 text-xs text-s8ul-cyan hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {selectedTheme && (
        <ThemeDetailPanel
          theme={selectedTheme}
          unlocked={unlocked(selectedTheme)}
          planTierName={planTierName}
          onOpenInBuilder={() => openInBuilder(selectedTheme.id)}
          onClose={() => setSelectedTheme(null)}
        />
      )}
    </div>
  );
}

function ThemeDetailPanel({ theme, unlocked, planTierName: _planTierName, onOpenInBuilder, onClose }: {
  theme: ThemeDefinition;
  unlocked: boolean;
  planTierName: string;
  onOpenInBuilder: () => void;
  onClose: () => void;
}) {
  const cv = theme.variants[0]?.tokens.colors;
  const tier = (theme.tier as ThemeTier | undefined) ?? "free";
  const familyKey = theme.family ?? "legacy";
  const family = familyLabel(familyKey);
  const exp = (() => {
    try { return experienceRegistry.resolve({ id: theme.id, category: theme.category, premium: theme.premium }); } catch { return { id: "minimal", name: "Minimal" } as { id: string; name: string }; }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6" data-testid="theme-detail">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">{theme.name}</h2>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${TIER_COLORS[tier] ?? "bg-zinc-800 text-zinc-300"}`}>
                {TIER_LABELS[tier]}
              </span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-300" title={`family ${familyKey}`}>{family}</span>
              {theme.variantGroup && <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400">{theme.variantGroup}</span>}
              {!theme.variantGroup && familyKey === "legacy" && <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-600">unclassified legacy</span>}
            </div>
            <p className="text-xs text-zinc-500">by {theme.author.name} &middot; v{theme.version} &middot; {theme.category} &middot; {exp.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="text-zinc-500 hover:text-white text-lg">&times;</button>
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
            <Link href="/admin/billing" className="ml-1 text-s8ul-cyan underline">Upgrade now →</Link>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">Cancel</button>
          {unlocked ? (
            <button
              onClick={onOpenInBuilder}
              data-testid="theme-detail-open-builder"
              className="rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Open in Builder
            </button>
          ) : (
            <Link href="/admin/billing" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
              Upgrade to unlock
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
