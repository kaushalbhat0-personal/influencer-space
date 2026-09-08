"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AddSectionButton } from "./add-section-button";

interface ContentItem {
  label: string;
  href: string;
  iconKey?: string;
}

export function DashboardContentSections() {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/content-nav", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.items)) setItems(data.items);
    } catch {}
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshKey]);

  if (!items) return null;

  // Filter out the Add Section item for display, keep it as button
  const sections = items.filter((i) => i.label !== "Add Section");
  const hasAdd = items.some((i) => i.label === "Add Section");

  return (
    <section aria-labelledby="dashboard-content" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="dashboard-content" className="platform-section-label">Content</h2>
        {hasAdd && <AddSectionButton onAdded={() => setRefreshKey((k) => k + 1)} />}
      </div>
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-card)] p-3">
        {sections.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No sections yet. Add one to get started.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {sections.map((item) => (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2.5 text-xs text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
