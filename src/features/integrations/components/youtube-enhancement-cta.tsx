import Link from "next/link";
import { Play, CheckCircle2, Sparkles } from "lucide-react";
import { BRAND } from "@/lib/marketing/messaging";

// Pure presentation — no data fetching, no API keys, no credentials.
// Receives isConnected from server wrapper; keeps copy Pendallo-branded via BRAND.
export interface YouTubeEnhancementCtaProps {
  isConnected: boolean;
  isUnavailable?: boolean;
}

export function YouTubeEnhancementCta({ isConnected, isUnavailable }: YouTubeEnhancementCtaProps) {
  // Graceful non-blocking: if integration service is unavailable, render
  // the disconnected CTA (still links to integrations surface) rather than crashing.
  // This keeps generation/publishing/storefront unblocked.
  if (isUnavailable) {
    return (
      <section
        aria-labelledby="youtube-enhancement-heading"
        data-testid="youtube-enhancement-cta"
        className="rounded-[var(--radius-card-elevated,16px)] border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <Play className="h-4 w-4 text-red-500" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 id="youtube-enhancement-heading" className="text-sm font-semibold text-[var(--text-primary)]">
                Make your website even better
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
                Connect YouTube to automatically bring in your latest videos, channel stats, and content.
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">By {BRAND.name}</p>
            </div>
          </div>
          <Link
            href="/admin/integrations"
            data-testid="youtube-connect-cta"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--brand-primary,#6366F1)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--button-primary-hover)] sm:w-auto w-full"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Connect YouTube
          </Link>
        </div>
      </section>
    );
  }

  if (isConnected) {
    return (
      <section
        aria-labelledby="youtube-enhancement-heading-connected"
        data-testid="youtube-enhancement-connected"
        className="rounded-[var(--radius-card-elevated,16px)] border border-emerald-500/20 bg-emerald-500/[0.04] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 id="youtube-enhancement-heading-connected" className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                YouTube connected
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Active</span>
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
                Your latest videos and channel stats are syncing automatically.
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">By {BRAND.name}</p>
            </div>
          </div>
          <Link
            href="/admin/integrations"
            data-testid="youtube-manage-cta"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-card)] px-5 py-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:w-auto w-full"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Manage YouTube
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="youtube-enhancement-heading"
      data-testid="youtube-enhancement-cta"
      className="rounded-[var(--radius-card-elevated,16px)] border border-[var(--border)] bg-[var(--surface-card)] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <Play className="h-4 w-4 text-red-500" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 id="youtube-enhancement-heading" className="text-sm font-semibold text-[var(--text-primary)]">
              Make your website even better
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
              Connect YouTube to automatically bring in your latest videos, channel stats, and content.
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">By {BRAND.name}</p>
          </div>
        </div>
        <Link
          href="/admin/integrations"
          data-testid="youtube-connect-cta"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--brand-primary,#6366F1)] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--button-primary-hover)] sm:w-auto w-full"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          Connect YouTube
        </Link>
      </div>
    </section>
  );
}
