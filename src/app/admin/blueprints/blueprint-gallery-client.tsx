"use client";

import { useState, useMemo } from "react";
import type { BlueprintDefinition } from "@/lib/blueprint/types";
import { themeRegistry } from "@/lib/theme/registry-new";

export function BlueprintGalleryClient({
  blueprints,
  categories,
}: {
  blueprints: BlueprintDefinition[];
  categories: string[];
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedBp, setSelectedBp] = useState<BlueprintDefinition | null>(null);

  const filtered = useMemo(() => {
    let result = blueprints;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.tags.some((t) => t.toLowerCase().includes(q)));
    }
    if (categoryFilter) result = result.filter((b) => b.category === categoryFilter);
    return result;
  }, [blueprints, search, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search blueprints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-zinc-600"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 outline-none">
          <option value="">All categories</option>
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bp) => (
          <button
            key={bp.id}
            onClick={() => setSelectedBp(bp)}
            className={`group rounded-xl border p-5 text-left transition-all ${
              selectedBp?.id === bp.id ? "border-s8ul-cyan ring-2 ring-s8ul-cyan/50" : "border-white/10 hover:border-white/30"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{bp.name}</p>
              {bp.requiredCapabilities.length > 0 && (
                <span className="rounded bg-blue-900/60 px-1.5 py-0.5 text-[9px] text-blue-300">{bp.requiredCapabilities[0]}</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">{bp.category} &middot; {bp.pages.length} pages &middot; {bp.pages.reduce((s, p) => s + p.sections.length, 0)} sections</p>
            <p className="mt-2 line-clamp-2 text-xs text-zinc-400">{bp.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {bp.pages.slice(0, 4).map((page) => (
                <span key={page.id} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">{page.name}</span>
              ))}
              {bp.pages.length > 4 && <span className="text-[9px] text-zinc-600">+{bp.pages.length - 4}</span>}
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-500">No blueprints found matching your criteria.</p>
        </div>
      )}

      {selectedBp && <BlueprintDetailPanel blueprint={selectedBp} onClose={() => setSelectedBp(null)} />}
    </div>
  );
}

function BlueprintDetailPanel({ blueprint, onClose }: { blueprint: BlueprintDefinition; onClose: () => void }) {
  const allRecommended = [...blueprint.recommendedThemes, ...blueprint.compatibleThemes].slice(0, 5);
  const totalSections = blueprint.pages.reduce((s, p) => s + p.sections.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-auto max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{blueprint.name}</h2>
            <p className="text-xs text-zinc-500">by {blueprint.author.name} &middot; v{blueprint.version}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-lg">&times;</button>
        </div>

        <p className="mt-4 text-sm text-zinc-400">{blueprint.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
            <p className="text-lg font-bold text-white">{blueprint.pages.length}</p>
            <p className="text-[10px] text-zinc-500">Pages</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
            <p className="text-lg font-bold text-white">{totalSections}</p>
            <p className="text-[10px] text-zinc-500">Sections</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-3 text-center">
            <p className="text-lg font-bold text-white">{blueprint.navigation.length}</p>
            <p className="text-[10px] text-zinc-500">Nav Items</p>
          </div>
        </div>

        {/* Pages */}
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pages</h3>
          <div className="space-y-1">
            {blueprint.pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between rounded-lg bg-zinc-800/30 px-3 py-2">
                <div>
                  <p className="text-xs text-zinc-300">{page.name}</p>
                  <p className="text-[10px] text-zinc-600">{page.sections.length} sections &middot; /{page.slug}</p>
                </div>
                {page.isHome && <span className="rounded bg-s8ul-cyan/20 px-1.5 py-0.5 text-[9px] text-s8ul-300">Home</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Navigation</h3>
          <div className="flex flex-wrap gap-1">
            {blueprint.navigation.filter((n) => n.visible).map((item) => (
              <span key={item.id} className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">{item.label}</span>
            ))}
          </div>
        </div>

        {/* Recommended Themes */}
        {allRecommended.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Compatible Themes</h3>
            <div className="flex flex-wrap gap-1">
              {allRecommended.map((themeId) => {
                const theme = themeRegistry.getById(themeId);
                return <span key={themeId} className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400">{theme?.name ?? themeId}</span>;
              })}
            </div>
          </div>
        )}

        {/* Capabilities */}
        {blueprint.requiredCapabilities.length > 0 && (
          <div className="mt-4 rounded-lg bg-amber-900/20 p-3">
            <p className="text-[10px] text-amber-400">Requires: {blueprint.requiredCapabilities.join(", ")}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity">
            Select Blueprint
          </button>
        </div>
      </div>
    </div>
  );
}
