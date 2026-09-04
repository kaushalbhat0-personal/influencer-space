"use client";

import { useState } from "react";
import { HeroRenderer } from "@/lib/registry/components/renderers";
import { resolveHeroMediaForRuntime } from "@/lib/media/hero-media";

type Alignment = "top" | "center" | "bottom";

interface SettingsLivePreviewProps {
  videoUrl: string;
  posterUrl: string;
  backgroundUrl: string;
  videoDesktopAlignment: Alignment;
  videoMobileAlignment: Alignment;
  imageDesktopAlignment: Alignment;
  imageMobileAlignment: Alignment;
  profileUrl: string | null;
  name: string;
  title: string;
  subtitle: string;
  tagline: string;
  bio: string;
  ctaText: string;
  ctaLink: string;
  ctaSecondaryText: string;
  ctaSecondaryLink: string;
  liveBadgeText: string;
  showLiveBadge: boolean;
  socialLinks?: Array<{ platform: string; url: string; label?: string }>;
  /**
   * RCCF-71.3: persisted HERO PRESENTATION (text alignment / content width /
   * overlay strength) from Website.themeConfig, threaded from the settings
   * server page so the preview renders the exact presets publish + Builder use.
   * Optional — when absent the canonical HeroRenderer falls back to today's look.
   */
  textAlign?: string;
  contentWidth?: string;
  overlay?: string;
}

/**
 * RCCF-70.5.2 — the settings preview is the CANONICAL Hero, not a mock.
 *
 * Media decision: the same pure resolver the runtime pipeline uses
 * (video → poster → background → placeholder), applied to the form's raw
 * state — so the preview's media semantics always match live + Builder.
 *
 * Rendering: the actual HeroRenderer (the single renderer the storefront and
 * Builder use), mounted inside a named `@container/main` boundary whose width
 * follows the device toggle (320px mobile / 1024px desktop). This is the exact
 * mechanism the Builder device frame uses, so the container-query variants
 * (@sm/main: / @lg/main:) flip identically to a live site at that width.
 *
 * Non-actionable: `previewMode` renders CTAs and social links as inert spans —
 * the preview can never navigate, open checkout/WhatsApp/booking, submit forms
 * or mutate anything.
 */
export function SettingsLivePreview({
  videoUrl,
  posterUrl,
  backgroundUrl,
  videoDesktopAlignment,
  videoMobileAlignment,
  imageDesktopAlignment,
  imageMobileAlignment,
  profileUrl,
  name,
  title,
  subtitle,
  tagline,
  bio,
  ctaText,
  ctaLink,
  ctaSecondaryText,
  ctaSecondaryLink,
  liveBadgeText,
  showLiveBadge,
  socialLinks,
  textAlign,
  contentWidth,
  overlay,
}: SettingsLivePreviewProps) {
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const isMobile = previewDevice === "mobile";
  const frameWidth = isMobile ? 320 : 1024;

  // RCCF-70.5.2: canonical decision — same precedence as the aggregate
  // (resolveHeroMediaForRuntime on the server at build time).
  const resolved = resolveHeroMediaForRuntime({
    videoUrl,
    posterUrl,
    backgroundUrl,
  });

  // Mirror of content.hero as composed by LayoutEngine for hero.* sections
  // (Object.assign(config, content.hero) + ctaText→cta, ctaSecondaryText→ctaSecondary).
  const heroProps: Record<string, unknown> = {
    title,
    name,
    subtitle,
    tagline,
    bio,
    cta: ctaText,
    ctaLink,
    ctaSecondaryText,
    ctaSecondaryLink,
    liveBadgeText,
    showLiveBadge,
    profilePictureUrl: profileUrl,
    videoDesktopAlignment,
    videoMobileAlignment,
    imageDesktopAlignment,
    imageMobileAlignment,
    socialLinks: socialLinks ?? [],
    // RCCF-71.3: HERO PRESENTATION values flow straight into the canonical
    // HeroRenderer (which resolves them via the shared registry helpers).
    textAlign,
    contentWidth,
    overlay,
    resolvedMedia: resolved.resolvedMedia,
    mediaType: resolved.mediaType,
    mediaUrl: resolved.mediaUrl,
    mediaPoster: resolved.mediaPoster,
    rendererDecision: resolved.rendererDecision,
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex justify-center gap-1 rounded-lg bg-zinc-800/50 p-1">
        <button
          type="button"
          onClick={() => setPreviewDevice("mobile")}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            isMobile
              ? "bg-[var(--color-info-surface)] text-[var(--color-info)] ring-1 ring-[var(--color-info-border)]"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Mobile
        </button>
        <button
          type="button"
          onClick={() => setPreviewDevice("desktop")}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            !isMobile
              ? "bg-[var(--color-info-surface)] text-[var(--color-info)] ring-1 ring-[var(--color-info-border)]"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Desktop
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0f0f13] shadow-2xl shadow-black/50">
        {/* RCCF-70.5.2: named container boundary — width drives the responsive
            variants exactly like the live <main> / Builder device frame. */}
        <div className="@container/main overflow-hidden" style={{ width: frameWidth, margin: "0 auto" }}>
          <HeroRenderer key={resolved.mediaUrl ?? "empty"} props={heroProps} previewMode />
        </div>
      </div>

      <p className="text-center text-[10px] uppercase tracking-widest text-zinc-600">
        Preview is non-interactive — buttons and links are inert.
      </p>
    </div>
  );
}