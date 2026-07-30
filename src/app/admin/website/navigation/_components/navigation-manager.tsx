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

export function NavigationManager({ initialItems }: { initialItems: NavigationItem[] }) {
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
    if (items[index].type !== "external") return;
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

  async function handleReset() {
    const result = await resetNavigation();
    if (result.success && result.data) {
      setItems(result.data);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          {saving && <span className="text-xs text-zinc-500">Saving...</span>}
          {saved && <span className="text-xs text-emerald-400">Saved</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to Defaults
          </button>
          <button
            onClick={addExternalLink}
            className="flex items-center gap-1.5 rounded-lg bg-s8ul-cyan px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
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
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-3"
          >
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <MoveUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <MoveDown className="h-3 w-3" />
              </button>
            </div>

            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              item.type === "external"
                ? "bg-amber-900/30 text-amber-400"
                : item.type === "anchor"
                ? "bg-blue-900/30 text-blue-400"
                : "bg-zinc-800 text-zinc-400"
            }`}>
              {TYPE_LABELS[item.type]}
            </span>

            <input
              type="text"
              value={item.label}
              onChange={(e) => updateLabel(index, e.target.value)}
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder-zinc-600"
            />

            {item.type === "external" && (
              <span className="flex items-center gap-1 text-xs text-zinc-600">
                <ExternalLink className="h-3 w-3" />
                {item.href}
              </span>
            )}

            <button
              onClick={() => toggleVisibility(index)}
              className="text-zinc-600 hover:text-zinc-300 transition-colors"
              title={item.visible ? "Visible" : "Hidden"}
            >
              {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>

            {item.type === "external" && (
              <button
                onClick={() => removeItem(index)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-zinc-600">No navigation items yet.</p>
          <button
            onClick={addExternalLink}
            className="mt-3 text-xs text-s8ul-cyan hover:underline"
          >
            Add your first link
          </button>
        </div>
      )}

      <div className="rounded-lg border border-white/5 bg-zinc-900/30 p-4">
        <p className="text-xs text-zinc-600">
          Navigation changes are saved immediately. Publish your website to apply them to the storefront.
        </p>
      </div>
    </div>
  );
}
