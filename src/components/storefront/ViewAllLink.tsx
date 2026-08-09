import { ArrowRight } from "lucide-react";

/**
 * RCCF-IMPLEMENTATION-09B (Phase 3) — "View all → /{collection}" CTA.
 * Rendered by collection renderers on the homepage when the creator has an
 * independent full-collection page. `href` is injected by StorefrontPage when
 * a matching non-home page exists; absent → nothing renders.
 */
export function ViewAllLink({ href, label = "View all" }: { href?: unknown; label?: string }) {
  const url = typeof href === "string" && href.length > 0 ? href : null;
  if (!url) return null;
  return (
    <div className="mt-6 text-center">
      <a
        href={url}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--button-secondary-border,rgba(255,255,255,0.15))] px-4 py-2 text-xs font-semibold text-[var(--text-secondary,#A1A1AA)] transition-colors hover:border-[var(--button-secondary-hover-fg,#FAFAFA)] hover:text-[var(--text-primary,#FAFAFA)]"
      >
        {label}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
