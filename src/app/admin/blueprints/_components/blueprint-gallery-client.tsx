"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { BlueprintDefinition } from "@/lib/blueprint/types";
import { themeRegistry } from "@/lib/theme/registry-new";

export function BlueprintGalleryClient({
  blueprints,
  categories,
}: {
  blueprints: BlueprintDefinition[];
  categories: string[];
}) {
  const router = useRouter();
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
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-focus)]"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-secondary)] outline-none">
          <option value="">All categories</option>
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bp) => (
          <button
            key={bp.id}
            onClick={() => setSelectedBp(bp)}
            className={`group rounded-[var(--radius-card)] border p-5 text-left transition-all ${
              selectedBp?.id === bp.id ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/50" : "border-[var(--border)] hover:border-[var(--border-strong)]"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{bp.name}</p>
              {bp.requiredCapabilities.length > 0 && (
                <span className="rounded bg-blue-900/60 px-1.5 py-0.5 text-[9px] text-blue-300">{bp.requiredCapabilities[0]}</span>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">{bp.category} &middot; {bp.pages.length} pages &middot; {bp.pages.reduce((s, p) => s + p.sections.length, 0)} sections</p>
            <p className="mt-2 line-clamp-2 text-xs text-[var(--text-secondary)]">{bp.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {bp.pages.slice(0, 4).map((page) => (
                <span key={page.id} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-[var(--text-muted)]">{page.name}</span>
              ))}
              {bp.pages.length > 4 && <span className="text-[9px] text-[var(--text-muted)]">+{bp.pages.length - 4}</span>}
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-[var(--text-muted)]">No templates found matching your criteria.</p>
        </div>
      )}

      {selectedBp && <BlueprintDetailPanel blueprint={selectedBp} onClose={() => setSelectedBp(null)} />}
    </div>
  );
}

function BlueprintDetailPanel({ blueprint, onClose }: { blueprint: BlueprintDefinition; onClose: () => void }) {
  const router = useRouter();
  const allRecommended = [...blueprint.recommendedThemes, ...blueprint.compatibleThemes].slice(0, 5);
  const totalSections = blueprint.pages.reduce((s, p) => s + p.sections.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-auto max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card-elevated)] border border-[var(--border)] bg-[var(--surface-card)] p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{blueprint.name}</h2>
            <p className="text-xs text-[var(--text-muted)]">by {blueprint.author.name} &middot; v{blueprint.version}</p>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg">&times;</button>
        </div>

        <p className="mt-4 text-sm text-[var(--text-secondary)]">{blueprint.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-[var(--radius-card)] bg-[var(--surface-hover)] p-3 text-center">
            <p className="text-lg font-bold text-white">{blueprint.pages.length}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Pages</p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-[var(--surface-hover)] p-3 text-center">
            <p className="text-lg font-bold text-white">{totalSections}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Sections</p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-[var(--surface-hover)] p-3 text-center">
            <p className="text-lg font-bold text-white">{blueprint.navigation.length}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Nav Items</p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Pages</h3>
          <div className="space-y-1">
            {blueprint.pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between rounded-[var(--radius-card)] bg-[var(--surface-hover)] px-3 py-2">
                <div>
                  <p className="text-xs text-[var(--text-primary)]">{page.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{page.sections.length} sections &middot; /{page.slug}</p>
                </div>
                {page.isHome && <span className="rounded bg-[var(--brand-primary)]/20 px-1.5 py-0.5 text-[9px] text-[var(--brand-primary)]">Home</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Navigation</h3>
          <div className="flex flex-wrap gap-1">
            {blueprint.navigation.filter((n) => n.visible).map((item) => (
              <span key={item.id} className="rounded bg-[var(--surface-hover)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">{item.label}</span>
            ))}
          </div>
        </div>

        {allRecommended.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Compatible Themes</h3>
            <div className="flex flex-wrap gap-1">
              {allRecommended.map((themeId) => {
                const theme = themeRegistry.getById(themeId);
                return <span key={themeId} className="rounded bg-[var(--surface-hover)] px-2 py-1 text-[10px] text-[var(--text-secondary)]">{theme?.name ?? themeId}</span>;
              })}
            </div>
          </div>
        )}

        {blueprint.requiredCapabilities.length > 0 && (
          <div className="mt-4 rounded-[var(--radius-card)] bg-amber-900/20 p-3">
            <p className="text-[10px] text-amber-400">Requires: {blueprint.requiredCapabilities.join(", ")}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={() => { router.push(`/admin/create?blueprint=${encodeURIComponent(blueprint.id)}`); }} className="rounded-[var(--radius-control)] bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity">
            Select Template
          </button>
        </div>
      </div>
    </div>
  );
}
