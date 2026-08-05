"use client";

import { IllustrationLayer } from "./decoration-runtime";
import type { SectionVariant } from "./theme-experience";

const VARIANT_ILLUSTRATION_MAP: Partial<Record<SectionVariant, string>> = {
  commerce: "business",
  gallery: "creator",
  timeline: "travel",
  social: "creator",
};

const VARIANT_ICONS: Partial<Record<SectionVariant, string>> = {
  commerce: "📦",
  gallery: "🖼️",
  timeline: "🗓️",
  social: "🔗",
};

/**
 * ThemedPlaceholder (IMPLEMENTATION-48.2) — renders an empty section with a
 * themed illustration pack, glass surface, and gradient border. Used when
 * sections have no content yet (empty products, empty gallery, etc.).
 */
export function ThemedPlaceholder({
  variant = "default",
  label,
}: {
  variant?: SectionVariant;
  label?: string;
}) {
  const packId = VARIANT_ILLUSTRATION_MAP[variant] ?? "creator";
  const displayLabel = label ?? variant.charAt(0).toUpperCase() + variant.slice(1);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-8" data-testid="themed-placeholder">
      <IllustrationLayer packId={packId} />
      <div className="relative z-10 flex flex-col items-center justify-center gap-3 py-8">
        <div className="text-3xl opacity-30">{VARIANT_ICONS[variant] ?? "✨"}</div>
        <p className="text-sm text-zinc-500">{displayLabel} content coming soon</p>
      </div>
    </div>
  );
}
