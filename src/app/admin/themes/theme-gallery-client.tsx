"use client";

import { useState, useMemo } from "react";
import type { ThemeDefinition } from "@/lib/theme/types-new";

export function ThemeGalleryClient({
  themes,
  categories,
}: {
  themes: ThemeDefinition[];
  categories: string[];
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [premiumFilter, setPremiumFilter] = useState<boolean | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeDefinition | null>(null);

  const filtered = useMemo(() => {
    let result = themes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q)));
    }
    if (categoryFilter) result = result.filter((t) => t.category === categoryFilter);
    if (premiumFilter !== null) result = result.filter((t) => t.premium === premiumFilter);
    return result;
  }, [themes, search, categoryFilter, premiumFilter]);

  const variants = selectedTheme?.variants ?? [];
  const currentVariant = variants[0];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search themes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none">
          <option value="">All categories</option>
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select value={premiumFilter === null ? "" : premiumFilter ? "premium" : "free"} onChange={(e) => setPremiumFilter(e.target.value === "" ? null : e.target.value === "premium")} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none">
          <option value="">All themes</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Theme Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setSelectedTheme(theme)}
            className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
              selectedTheme?.id === theme.id ? "border-s8ul-cyan ring-2 ring-s8ul-cyan/50" : "border-white/10 hover:border-white/30"
            }`}
          >
            {/* Preview box with theme colors */}
            <div className="h-32 w-full" style={{ background: `linear-gradient(135deg, ${theme.variants[0]?.tokens.colors.primary} 0%, ${theme.variants[0]?.tokens.colors.secondary} 50%, ${theme.variants[0]?.tokens.colors.accent} 100%)` }} />
            <div className="space-y-1.5 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{theme.name}</p>
                {theme.premium && <span className="rounded bg-amber-900/60 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">PRO</span>}
              </div>
              <p className="text-[10px] text-zinc-500">{theme.category} &middot; v{theme.version}</p>
              <p className="line-clamp-2 text-[11px] text-zinc-400">{theme.description}</p>
              <div className="flex flex-wrap gap-1 pt-1">
                {theme.variants.map((v) => (
                  <span key={v.mode} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">
                    {v.mode}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-500">No themes found matching your criteria.</p>
        </div>
      )}

      {/* Theme Detail Panel */}
      {selectedTheme && (
        <ThemeDetailPanel theme={selectedTheme} onClose={() => setSelectedTheme(null)} />
      )}
    </div>
  );
}

function ThemeDetailPanel({ theme, onClose }: { theme: ThemeDefinition; onClose: () => void }) {
  const cv = theme.variants[0]?.tokens.colors;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-auto max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{theme.name}</h2>
            <p className="text-xs text-zinc-500">by {theme.author.name} &middot; v{theme.version}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg">&times;</button>
        </div>

        <div className="mt-4 h-40 rounded-lg" style={{ background: `linear-gradient(135deg, ${cv?.primary} 0%, ${cv?.secondary} 50%, ${cv?.accent} 100%)` }} />

        <p className="mt-4 text-sm text-zinc-400">{theme.description}</p>

        {/* Color palette */}
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

        {/* Typography */}
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Typography</h3>
          <div className="space-y-1 text-xs text-zinc-500">
            <p>Heading: {theme.variants[0]?.tokens.typography.headingFont}</p>
            <p>Body: {theme.variants[0]?.tokens.typography.bodyFont}</p>
          </div>
        </div>

        {/* Variants */}
        <div className="mt-4 flex gap-2">
          {theme.variants.map((v) => (
            <span key={v.mode} className="rounded-lg bg-zinc-800 px-3 py-1 text-xs text-zinc-400">{v.mode} mode</span>
          ))}
          {theme.premium && <span className="rounded-lg bg-amber-900/30 px-3 py-1 text-xs text-amber-400">Premium</span>}
        </div>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-1">
          {theme.tags.map((tag) => (
            <span key={tag} className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">{tag}</span>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
          >
            Select Theme
          </button>
        </div>
      </div>
    </div>
  );
}
