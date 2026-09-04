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
    <div className="mt-8 text-center">
      <a
        href={url}
        className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary,#A1A1AA)] transition-colors hover:text-[var(--text-primary,#FAFAFA)]"
      >
        {label}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </a>
    </div>
  );
}
