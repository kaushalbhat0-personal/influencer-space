"use client";

import { useState, useCallback } from "react";
import { saveNavigation, resetNavigation } from "@/actions/navigation.actions";
import type { NavigationItem, NavItemType } from "@/types/snapshot";
import { ExternalLink, Eye, EyeOff, MoveDown, MoveUp, Plus, RotateCcw, Trash2 } from "lucide-react";

const TYPE_LABELS: Record<NavItemType, string> = {
  page: "Page",
  anchor: "Section",
  external: "External Link",
};

export interface NavPageOption {
  slug: string;
  name: string;
}

export function NavigationManager({
  initialItems,
  availablePages = [],
}: {
  initialItems: NavigationItem[];
  availablePages?: NavPageOption[];
}) {
  const [items, setItems] = useState<NavigationItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const persist = useCallback(async (updated: NavigationItem[]) => {
    setSaving(true);
    await saveNavigation(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const updated = [...items];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    updated.forEach((item, i) => { item.order = i; });
    setItems(updated);
    persist(updated);
  }

  function toggleVisibility(index: number) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, visible: !item.visible } : item,
    );
    setItems(updated);
    persist(updated);
  }

  function updateLabel(index: number, label: string) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, label } : item,
    );
    setItems(updated);
    persist(updated);
  }

  function removeItem(index: number) {
    if (items[index].type === "anchor") return;
    const updated = items.filter((_, i) => i !== index);
    updated.forEach((item, i) => { item.order = i; });
    setItems(updated);
    persist(updated);
  }

  function addExternalLink() {
    const newItem: NavigationItem = {
      id: `nav_ext_${Date.now()}`,
      label: "New Link",
      href: "https://",
      type: "external",
      order: items.length,
      visible: true,
      target: "_blank",
    };
    const updated = [...items, newItem];
    setItems(updated);
    persist(updated);
  }

  function addPageLink(slug: string, name: string) {
    const already = items.some((i) => i.type === "page" && i.href === slug);
    if (already) return;
    const newItem: NavigationItem = {
      id: `nav_page_${Date.now()}`,
      label: name || slug,
      href: slug,
      type: "page",
      order: items.length,
      visible: true,
    };
    const updated = [...items, newItem];
    setItems(updated);
    persist(updated);
  }

  async function handleReset() {
    const result = await resetNavigation();
    if (result.success && result.data) {
      setItems(result.data);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)]">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          {saving && <span className="text-xs text-[var(--text-muted)]">Saving...</span>}
          {saved && <span className="text-xs text-emerald-400">Saved</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to Defaults
          </button>
          {availablePages.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const slug = e.target.value;
                const page = availablePages.find((p) => p.slug === slug);
                if (slug && page) addPageLink(slug, page.name);
              }}
              className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-[var(--text-primary)]"
            >
              <option value="">Add Page…</option>
              {availablePages.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={addExternalLink}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3 w-3" />
            Add External Link
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${item.label} up`}
                className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <MoveUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                aria-label={`Move ${item.label} down`}
                className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <MoveDown className="h-3 w-3" />
              </button>
            </div>

            <span className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              item.type === "external"
                ? "bg-amber-900/30 text-amber-400"
                : item.type === "anchor"
                ? "bg-blue-900/30 text-blue-400"
                : "bg-zinc-800 text-[var(--text-secondary)]"
            }`}>
              {TYPE_LABELS[item.type]}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateLabel(index, e.target.value)}
                aria-label={`Label for ${item.label}`}
                className="w-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)] sm:max-w-[12rem]"
              />

              {item.type === "external" && (
                <span className="flex min-w-0 items-center gap-1 truncate text-xs text-[var(--text-muted)]" title={item.href}>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.href}</span>
                </span>
              )}
              {item.type === "page" && (
                <span className="flex min-w-0 items-center gap-1 truncate text-xs text-[var(--text-muted)]" title={`/${item.href.replace(/^\/+/, "")}`}>
                  <span className="truncate">/{item.href.replace(/^\/+/, "")}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleVisibility(index)}
                aria-label={item.visible ? `Hide ${item.label}` : `Show ${item.label}`}
                className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title={item.visible ? "Visible" : "Hidden"}
              >
                {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>

              {item.type !== "anchor" && (
                <button
                  onClick={() => removeItem(index)}
                  aria-label={`Remove ${item.label}`}
                  className="rounded p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">No navigation items yet.</p>
          <button
            onClick={addExternalLink}
            className="mt-3 text-xs text-[var(--brand-primary)] hover:underline"
          >
            Add your first link
          </button>
        </div>
      )}

      <div className="rounded-lg border border-white/5 bg-zinc-900/30 p-4">
        <p className="text-xs text-[var(--text-muted)]">
          Navigation changes are saved immediately. Publish your website to apply them to the storefront.
        </p>
      </div>
    </div>
  );
}
