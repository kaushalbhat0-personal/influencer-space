"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "pendallo-builder-guidance-dismissed";

export function BuilderGuidance() {
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      setDismissed(v === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  const showAgain = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setDismissed(false);
  };

  if (!mounted) return null;

  if (dismissed) {
    return (
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-[11px]">
        <p className="text-[11px] text-[var(--text-muted)]">
          Need guidance? <Link href="/help#builder" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Help — Builder path</Link>
        </p>
        <button
          onClick={showAgain}
          className="rounded px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          aria-label="Show builder guidance"
        >
          Show path
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Builder guidance"
      className="border-b border-indigo-500/20 bg-indigo-500/[0.04] px-3 py-2 sm:px-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">Recommended path</p>
          <nav aria-label="Builder completion steps" className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] leading-relaxed text-zinc-400">
            <span className="font-medium text-zinc-200">Edit content</span>
            <span aria-hidden="true" className="text-zinc-600">→</span>
            <Link href="/admin/appearance" className="rounded px-1 py-0.5 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Appearance</Link>
            <span aria-hidden="true" className="text-zinc-600">→</span>
            <Link href="/admin/integrations" className="rounded px-1 py-0.5 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Integrations</Link>
            <span aria-hidden="true" className="text-zinc-600">→</span>
            <Link href="/admin/seo" className="rounded px-1 py-0.5 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">SEO</Link>
            <span aria-hidden="true" className="text-zinc-600">→</span>
            <Link href="/admin/settings/domain" className="rounded px-1 py-0.5 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Domain</Link>
            <span aria-hidden="true" className="text-zinc-600">→</span>
            <span className="font-medium text-emerald-400">Publish</span>
          </nav>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
            Edit in the canvas (Sections), save with <span className="text-zinc-300">Save Draft</span>, then <span className="text-emerald-400">Publish</span> below. Need details?{" "}
            <Link href="/help#builder" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Help — Builder</Link>
            {" · "}
            <Link href="/blog/guides/getting-started" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Getting Started</Link>
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded px-2 py-1 text-[11px] text-zinc-500 hover:bg-white/5 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          aria-label="Dismiss builder guidance"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
