"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { SECTION_CATALOG, FEATURED_SECTIONS, REMAINING_SECTIONS } from "@/lib/builder/catalog";
import { addSectionFromDashboard } from "@/actions/dashboard-section.actions";
import { useRouter } from "next/navigation";

export function AddSectionButton({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleSelect = (componentId: string) => {
    startTransition(async () => {
      const res = await addSectionFromDashboard(componentId);
      if (res.success) {
        setOpen(false);
        router.refresh();
        onAdded?.();
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="dashboard-add-section"
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Add Section
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-hidden className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add Section</h3>
              <button onClick={() => setOpen(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Close</button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-3">Choose a section to add. A new empty section will be created.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FEATURED_SECTIONS.map((entry) => (
                <button
                  key={entry.componentId}
                  onClick={() => handleSelect(entry.componentId)}
                  disabled={pending}
                  data-testid={`dashboard-add-${entry.componentId}`}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-base)] px-3 py-2.5 text-left text-xs text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary)]/5 hover:text-[var(--brand-primary)] disabled:opacity-50"
                >
                  <Plus className="h-3 w-3 shrink-0" /> {entry.name}
                </button>
              ))}
            </div>
            {REMAINING_SECTIONS.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Show all ({REMAINING_SECTIONS.length} more)</summary>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {REMAINING_SECTIONS.map((entry) => (
                    <button
                      key={entry.componentId}
                      onClick={() => handleSelect(entry.componentId)}
                      disabled={pending}
                      data-testid={`dashboard-add-${entry.componentId}`}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-base)] px-3 py-2.5 text-left text-xs text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary)]/5 hover:text-[var(--brand-primary)] disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3 shrink-0" /> {entry.name}
                    </button>
                  ))}
                </div>
              </details>
            )}
            {pending && <p className="mt-3 text-xs text-[var(--text-muted)]">Creating section…</p>}
          </div>
        </div>
      )}
    </>
  );
}
