"use client";

import type { ComponentDefinition } from "./types";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useFormState } from "react-dom";
import {
  submitStorefrontContact,
  subscribeNewsletter,
  type ContactActionResult,
} from "@/actions/storefront.actions";
import { CreatorImage, CreatorVideo } from "@/components/shared";
import { AffiliateGrid, type AffiliateGridItem } from "@/components/public/AffiliateGrid";
import { HeroMedia, responsiveAlignmentClass } from "@/components/shared/HeroMedia";
import type { HeroMediaKind } from "@/lib/media/hero-media";
import { heroTextAlignClass, heroContentWidthClass, heroOverlayClass } from "@/lib/hero/presentation-options";
import { BuyNowButton } from "@/app/[domain]/_components/buy-now-button";
import { Star, Quote, ChevronDown, ArrowRight, Search, Eye, X } from "lucide-react";
import { shouldRenderSection } from "@/modules/section-presentation";
import { formatCurrency } from "@/lib/utils";
import { ViewAllLink } from "@/components/storefront/ViewAllLink";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { safeUrl } from "./safe-url";
import { normalizeCommerceMode } from "@/config/commerce/commerce-mode";
import { buildWhatsAppMessage, buildWaMeLink } from "@/lib/commerce/whatsapp";
// getPlatformConfig no longer needed for creator legal (tenant-relative)


interface RendererProps {
  props: Record<string, unknown>;
  elementId?: string;
  definition?: ComponentDefinition;
  /** RCCF-LAUNCH-TRACK-06: true when rendered inside the Builder preview —
   * renderers must never initiate production commerce in preview mode. */
  previewMode?: boolean;
}

// RCCF-LAUNCH-TRACK-04B (Phase 5): the single visibility decision. Reads the
// config the LayoutEngine composed (visibilityMode + hasContent). No per-renderer
// visibility logic — the engine computed hasContent via sectionHasContent once.
function useVisibility(props: Record<string, unknown>): boolean {
  return shouldRenderSection(props);
}

// RCCF-LAUNCH-TRACK-04B (Phase 5/10): empty-placeholder boxes are a BUILDER
// hint only. On LIVE storefronts (production builds) an empty section that is
// forced visible renders nothing — never a placeholder — and hidden sections are
// already removed by the page/renderer before reaching here.
function EmptyState({ label = "No content yet" }: { label?: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 text-center">
      <div className="rounded-[var(--radius-lg,0.5rem)] border border-dashed border-[var(--border,rgba(0,0,0,0.08))] p-6 text-sm text-[var(--text-muted,#71717A)]">
        {label}
      </div>
    </div>
  );
}

// RCCF-LAUNCH-TRACK-04: shared section heading — honors presentation
// (hideTitle, descriptionOverride). Every data-driven renderer uses it; no
// duplicated title logic.
function SectionHeading({ p, title, elementId, previewMode }: { p: Record<string, unknown>; title: string; elementId?: string; previewMode?: boolean }) {
  if (p.hideTitle) return null;
  const description = p.description ? String(p.description) : null;
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto mb-3 h-0.5 w-8 rounded-full bg-[var(--brand-primary,#6366F1)] opacity-60" aria-hidden />
      <h2 className="text-2xl font-[var(--brand-font-weight-heading,700)] tracking-tight text-[var(--text-primary,#FAFAFA)] md:text-3xl">{title}</h2>
      {description && <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary,#A1A1AA)]">{description}</p>}
    </div>
  );
}

// RCCF-68.3.2 — responsive container-aware grids. The storefront renders inside
// the named `@container/main` boundary (defined on <main> in StorefrontPage and
// on the Builder device frame), so `@sm/main:` / `@lg/main:` respond to the
// CONTAINER width — not the browser viewport — making the Builder preview match
// the published storefront exactly.
//
// The configured desktop column count stays authoritative. Mobile is always 1
// column (no cramming), a small/medium container gets 2 columns, and the
// configured density is restored at the large container breakpoint. All class
// strings are literal so Tailwind's JIT emits every variant.
const RESPONSIVE_GRID: Record<number, string> = {
  1: "grid grid-cols-1 gap-4",
  2: "grid grid-cols-1 gap-4 @sm/main:grid-cols-2",
  3: "grid grid-cols-1 gap-4 @sm/main:grid-cols-2 @lg/main:grid-cols-3",
  4: "grid grid-cols-1 gap-4 @sm/main:grid-cols-2 @lg/main:grid-cols-4",
  5: "grid grid-cols-1 gap-4 @sm/main:grid-cols-2 @lg/main:grid-cols-5",
  6: "grid grid-cols-1 gap-4 @sm/main:grid-cols-2 @lg/main:grid-cols-6",
};

function responsiveGridClass(columns: unknown): string {
  const count = Math.min(Math.max(Number(columns) || 3, 1), 6);
  return RESPONSIVE_GRID[count] ?? RESPONSIVE_GRID[3];
}

/* â”€â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function HeroRenderer({ props, elementId: _elementId, previewMode }: RendererProps) {
  const p = props as Record<string, unknown>;
  const title = String(p.title || "");
  const name = String(p.name || p.title || "");
  const tagline = String(p.tagline || "");
  const bio = String(p.bio || "");
  const subtitle = String(p.subtitle || "");
  const cta = String(p.cta || "");
  const ctaLink = String(p.ctaLink || "");
  const ctaSecondaryText = String(p.ctaSecondaryText || "");
  const ctaSecondaryLink = String(p.ctaSecondaryLink || "");
  const liveBadgeText = String(p.liveBadgeText || "Live");
  const showLiveBadge = Boolean(p.showLiveBadge);
  const profilePictureUrl = String(p.profilePictureUrl || "");
  const videoAlign = responsiveAlignmentClass(
    String(p.videoDesktopAlignment || "center"),
    String(p.videoMobileAlignment || "center"),
  );
  const imageAlign = responsiveAlignmentClass(
    String(p.imageDesktopAlignment || "center"),
    String(p.imageMobileAlignment || "center"),
  );
  const socialLinks = (p.socialLinks as Array<{ url: string; platform?: string; label?: string }>) ?? [];
  const platformLabel = (platform: string) => platform.charAt(0).toUpperCase() + platform.slice(1);

  // IMPLEMENTATION-21 (BUG 3): consume ONLY the resolved media decision that
  // the runtime pipeline attached to content.hero. This renderer NEVER reads
  // raw videoUrl / posterUrl / backgroundUrl / *_AssetId fields.
  const resolvedMedia = String(p.resolvedMedia || "placeholder") as HeroMediaKind;
  const mediaUrl = String(p.mediaUrl || "");
  const mediaPoster = String(p.mediaPoster || "");

  // IMPLEMENTATION-23: hero video plays ONCE per page load, then the poster
  // image stays. No loop. onEnded swaps the <video> for the poster <img>.
  const [videoEnded, setVideoEnded] = useState(false);
  const showVideo = resolvedMedia === "video" && !videoEnded;

  // RCCF-71.3: HERO PRESENTATION — controlled text alignment, content width and
  // overlay strength from Website.themeConfig (merged onto content.hero by
  // buildRuntimeSnapshot / the canvas). Each helper falls back to the EXACT
  // current look when the value is absent or unknown, so old snapshots render
  // unchanged.
  const textAlignClass = heroTextAlignClass(String(p.textAlign || "center"));
  const contentWidthClass = heroContentWidthClass(String(p.contentWidth || "medium"));
  const overlayClass = heroOverlayClass(String(p.overlay || "medium"));

  // RCCF-71.3 (B→A fix): the background fallback media uses the SAVED image
  // focal point (imageDesktopAlignment/imageMobileAlignment) instead of the old
  // hardcoded object-center, so video/poster/background all honor the creator's
  // image positioning.
  const alignment = resolvedMedia === "video" ? videoAlign : imageAlign;

  return (
    <div suppressHydrationWarning className="relative overflow-hidden bg-[var(--surface-root,#09090B)]" data-resolved-media={resolvedMedia} data-renderer-decision={String(p.rendererDecision || "")}>
      {/* â”€â”€ Hero media â€” ALWAYS renders first; avatar never replaces it â”€â”€ */}
      {/* RCCF-RESPONSIVE-02: breakpoints are CONTAINER-query variants (@sm/@lg)
          so the Builder device frame (a 375px-scaled div inside a wide window)
          renders the same base classes as the live storefront at 375px. The
          base (mobile) contract uses aspect-[16/9] + a fixed -mt-[100px]
          overlap (avatar 112px + 8px pt - 20px bridge) so the avatar bridges
          the hero media bottom across the whole 320-480px range; the old
          percentage overlap (-mt-[35%]) only bridged below ~343px. */}
      <div className="relative aspect-[16/8] w-full @sm/main:aspect-[16/7]">
        {showVideo && mediaUrl ? (
          <HeroMedia
            type="video"
            url={mediaUrl}
            poster={mediaPoster || undefined}
            alignmentClass={alignment}
            className="absolute inset-0"
            autoPlay
            muted
            loop={false}
            playsInline
            controls
            preload="metadata"
            onEnded={() => setVideoEnded(true)}
          />
        ) : resolvedMedia === "video" && mediaPoster ? (
          <HeroMedia
            type="image"
            url={mediaPoster}
            alignmentClass={imageAlign}
            className="absolute inset-0"
          />
        ) : (resolvedMedia === "image" || resolvedMedia === "background") && mediaUrl ? (
          <HeroMedia
            type="image"
            url={mediaUrl}
            alignmentClass={alignment}
            className="absolute inset-0"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-card,#18181B)]">
            {process.env.NODE_ENV !== "production" && (
              <div className="flex flex-col items-center gap-2 text-[var(--text-muted,#71717A)]">
                <span className="text-2xl">✦</span>
                <span className="text-xs tracking-wide">Your hero goes here</span>
              </div>
            )}
          </div>
        )}
        {/* RCCF-71.3: controlled overlay strength (default = the current
            gradient). "none" renders no overlay. */}
        {overlayClass && <div className={`absolute inset-0 ${overlayClass}`} />}
      </div>

      {/* â”€â”€ Overlapping profile picture + identity (never above the media) â”€â”€ */}
      <div className="-mt-[72px] @sm/main:-mt-[18%] relative z-10">
        <div className={`${contentWidthClass} ${textAlignClass} px-4 pb-10 pt-4 @sm/main:pb-16 @sm/main:pt-6`}>
          {profilePictureUrl && (
            <div className="relative mx-auto mb-5 h-32 w-32 overflow-hidden rounded-full border-4 border-[var(--surface-root,#09090B)] shadow-2xl shadow-black/50 ring-2 ring-white/10 @sm/main:h-36 @sm/main:w-36">
              <CreatorImage src={profilePictureUrl} alt={name || "Profile"} variant="avatar" className="h-full w-full" />
            </div>
          )}

          {showLiveBadge && (
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-sm font-semibold uppercase tracking-wider text-red-400">{liveBadgeText}</span>
            </div>
          )}

          {name || title ? (
            // RCCF-71.4.1 P3: `break-words` keeps a long creator identity/title
            // wrapping inside the canvas on narrow screens instead of extending
            // past the 390px frame and being clipped on both sides.
            <h1 className="text-3xl font-[var(--brand-font-weight-heading,700)] tracking-tight text-[var(--text-primary,#FAFAFA)] break-words @sm/main:text-4xl @lg/main:text-5xl">{name || title}</h1>
          ) : null}

          {title && title !== name && (
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary,#FAFAFA)] break-words @sm/main:text-2xl">{title}</h2>
          )}
          {tagline && <p className="mt-2 text-base font-medium text-[var(--text-secondary,#A1A1AA)]">{tagline}</p>}
          {bio && <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-muted,#71717A)]">{bio}</p>}
          {!bio && subtitle && <p className="mt-1.5 text-sm text-[var(--text-secondary,#A1A1AA)]">{subtitle}</p>}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {cta && (
              ctaLink && !previewMode ? (
                <a suppressHydrationWarning href={ctaLink} className="group inline-flex items-center gap-2 rounded-full bg-[var(--button-primary-bg,#6366F1)] px-6 py-2.5 text-sm font-semibold text-[var(--button-primary-fg,#FAFAFA)] shadow-md transition-all hover:bg-[var(--button-primary-hover)] hover:shadow-lg hover:-translate-y-0.5">
                  {cta}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#00f5ff)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-fg,#09090b)]">
                  {cta}
                </span>
              )
            )}
            {ctaSecondaryText && (
              ctaSecondaryLink && !previewMode ? (
                <a suppressHydrationWarning href={ctaSecondaryLink} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border,rgba(255,255,255,0.14))] bg-[var(--surface-card,#18181B)]/60 px-4 py-2 text-xs font-medium text-[var(--text-secondary,#A1A1AA)] transition-colors hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  {ctaSecondaryText}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-[var(--radius-lg,0.5rem)] border border-[var(--button-secondary-border,rgba(255,255,255,0.2))] px-5 py-2.5 text-sm font-semibold text-[var(--button-secondary-fg,#D4D4D8)]">
                  {ctaSecondaryText}
                </span>
              )
            )}
          </div>

          {socialLinks.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 text-xs">
              {socialLinks.map((l, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span className="text-[var(--text-muted)] opacity-40" aria-hidden>·</span>}
                  {previewMode ? (
                    <span className="text-[var(--text-muted,#71717A)]">{l.label || platformLabel(l.platform || "Link")}</span>
                  ) : (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--text-muted,#71717A)] underline-offset-2 hover:text-[var(--text-secondary)] hover:underline"
                    >
                      {l.label || platformLabel(l.platform || "Link")}
                    </a>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Gallery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function GalleryRenderer({ props, elementId, previewMode }: RendererProps) {
  const p = props as Record<string, unknown>;
  const images = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || "Gallery";
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props)) return null;

  const [lightbox, setLightbox] = useState<number | null>(null);
  const hasFeatured = Boolean(images[0]?.isFeatured);
  const featuredClass = hasFeatured && images.length >= 3 ? " @sm/main:col-span-2 @sm/main:row-span-2 @sm/main:aspect-auto aspect-square" : " aspect-square";

  if (images.length > 0) {
    return (
      <div suppressHydrationWarning className="mx-auto max-w-5xl px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={p} title={title} elementId={elementId} previewMode={previewMode} />
        <div className={responsiveGridClass(columns)}>
          {images.map((img: Record<string, unknown>, i: number) => {
            const isFeaturedFirst = hasFeatured && i === 0;
            return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => setLightbox(i)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightbox(i); } }}
              className={`group relative overflow-hidden rounded-[var(--radius-xl,0.75rem)] border bg-[var(--surface-card,#18181B)]/60 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] cursor-pointer ${isFeaturedFirst ? "border-[var(--brand-primary)]/20 shadow-md" + featuredClass : "border-[var(--border,rgba(255,255,255,0.08))] hover:border-[var(--border)] aspect-square"}`}>
              {Boolean(img.isVideo) && img.videoUrl ? (
                <video
                  src={img.videoUrl as string}
                  poster={(img.url as string) || undefined}
                  muted
                  loop
                  playsInline
                  controls={false}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                />
              ) : img.url ? (
                <CreatorImage
                  src={img.url as string}
                  alt={String(img.altText || img.caption || "")}
                  variant="gallery"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--text-muted,#71717A)]">
                  {Boolean(img.isVideo) ? "Video" : "Image"}
                </div>
              )}
              {Boolean(img.isVideo) && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm ring-1 ring-white/20 transition-transform group-hover:scale-105 motion-reduce:transition-none">
                    <svg suppressHydrationWarning className="ml-0.5 h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z"/></svg>
                  </span>
                </span>
              )}
              {Boolean(String(img.caption || img.description || "").trim()) && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-3 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                  <span className="line-clamp-1 text-xs font-medium text-white">{String(img.caption || img.description)}</span>
                </span>
              )}
              <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">View</span>
            </div>
          )})}
        </div>
        {lightbox !== null && images[lightbox] && (
          <Sheet open={lightbox !== null} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
            <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto bg-[var(--surface-card)]">
              <SheetHeader>
                <SheetTitle className="pr-8 text-left">{String((images[lightbox] as any).caption || (images[lightbox] as any).title || "Gallery image")}</SheetTitle>
                {Boolean((images[lightbox] as any).isVideo) && <span className="inline-flex w-fit rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">Video</span>}
              </SheetHeader>
              <div className="mt-4">
                {Boolean((images[lightbox] as any).isVideo) && (images[lightbox] as any).videoUrl ? (
                  <video src={(images[lightbox] as any).videoUrl as string} poster={(images[lightbox] as any).url as string || undefined} controls autoPlay className="max-h-[60vh] w-full rounded-xl object-contain bg-black" />
                ) : (images[lightbox] as any).url ? (
                  <img src={(images[lightbox] as any).url as string} alt={String((images[lightbox] as any).altText || (images[lightbox] as any).caption || "")} className="max-h-[60vh] w-full rounded-xl object-contain bg-black" />
                ) : null}
                {String((images[lightbox] as any).caption || (images[lightbox] as any).description || "").trim() && (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{String((images[lightbox] as any).caption || (images[lightbox] as any).description)}</p>
                )}
                {(images[lightbox] as any).altText && String((images[lightbox] as any).altText).trim() && String((images[lightbox] as any).caption) !== String((images[lightbox] as any).altText) && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{String((images[lightbox] as any).altText)}</p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}
        <ViewAllLink href={p.viewAllHref} />
      </div>
    );
  }

  return <EmptyState label="Add images to your gallery" />;
}

/* ─── Gallery Bento ─────────────────────────────────────────────── */

export function GalleryBentoRenderer({ props, elementId, previewMode }: RendererProps) {
  const p = props as Record<string, unknown>;
  const images = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || "Gallery";
  if (!useVisibility(props)) return null;
  if (images.length === 0) return <EmptyState label="Add images to your gallery" />;
  const featured = images[0]!;
  const rest = images.slice(1);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const lb = lightbox !== null ? images[lightbox] : null;
  return (
    <div className="mx-auto max-w-5xl px-4 py-[var(--section-spacing,3rem)]">
      <SectionHeading p={p} title={title} elementId={elementId} previewMode={previewMode} />
      <div className="grid gap-4 @sm/main:grid-cols-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setLightbox(0)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightbox(0); } }}
          className="group relative overflow-hidden rounded-[var(--radius-xl,0.75rem)] border border-[var(--brand-primary)]/15 bg-[var(--surface-card)]/60 shadow-sm transition-all duration-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] @sm/main:col-span-2 @sm/main:row-span-2 @sm/main:aspect-auto aspect-square cursor-pointer text-left">
          {Boolean(featured.isVideo) && featured.videoUrl ? (
            <video src={featured.videoUrl as string} poster={(featured.url as string) || undefined} muted loop playsInline controls={false} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />
          ) : featured.url ? (
            <CreatorImage src={featured.url as string} alt={String(featured.altText || featured.caption || "")} variant="gallery" className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--text-muted)]">Image</div>
          )}
          {Boolean(featured.isVideo) && <span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm ring-1 ring-white/20"><svg suppressHydrationWarning className="ml-0.5 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></span>}
          {Boolean(String(featured.caption || featured.description || "").trim()) && (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none">
              <span className="line-clamp-1 text-xs font-medium text-white">{String(featured.caption || featured.description)}</span>
            </span>
          )}
          <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-sm">Featured</span>
        </div>
        {rest.map((img: Record<string, unknown>, i: number) => (
          <div
            key={i}
            role="button"
            tabIndex={0}
            onClick={() => setLightbox(i+1)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightbox(i+1); } }}
            className="group relative aspect-square overflow-hidden rounded-[var(--radius-xl,0.75rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card)]/60 shadow-sm transition-all duration-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] cursor-pointer text-left">
            {Boolean(img.isVideo) && img.videoUrl ? (
              <video src={img.videoUrl as string} poster={(img.url as string) || undefined} muted loop playsInline controls={false} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />
            ) : img.url ? (
              <CreatorImage src={img.url as string} alt={String(img.altText || img.caption || "")} variant="gallery" className="h-full w-full transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none" />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--text-muted)]">{Boolean(img.isVideo) ? "Video" : "Image"}</div>
            )}
            {Boolean(img.isVideo) && <span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm ring-1 ring-white/20"><svg suppressHydrationWarning className="ml-0.5 h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></span>}
          </div>
        ))}
      </div>
      {lb && (
        <Sheet open={lightbox !== null} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
          <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto bg-[var(--surface-card)]">
            <SheetHeader>
              <SheetTitle className="pr-8 text-left">{String((lb as any).caption || (lb as any).title || "Gallery image")}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {Boolean((lb as any).isVideo) && (lb as any).videoUrl ? <video src={(lb as any).videoUrl as string} poster={(lb as any).url as string || undefined} controls autoPlay className="max-h-[60vh] w-full rounded-xl object-contain bg-black" /> : (lb as any).url ? <img src={(lb as any).url as string} alt={String((lb as any).altText || (lb as any).caption || "")} className="max-h-[60vh] w-full rounded-xl object-contain bg-black" /> : null}
              {String((lb as any).caption || (lb as any).description || "").trim() && <p className="mt-3 text-sm text-[var(--text-secondary)]">{String((lb as any).caption || (lb as any).description)}</p>}
            </div>
          </SheetContent>
        </Sheet>
      )}
      <ViewAllLink href={p.viewAllHref} />
    </div>
  );
}

/* ─── Products ─────────────────────────────────────────────── */

// RCCF-66.2 — per-product commerce-mode CTA. ONLINE → Buy Now only; WHATSAPP →
// Order on WhatsApp only; BOTH → both. The WhatsApp destination is the
// server-resolved value from the snapshot (hero socialLinks platform="whatsapp");
// a missing/invalid destination degrades: WHATSAPP renders no broken link, BOTH
// keeps Buy Now. In preview the WhatsApp CTA is inert (mirrors BuyNowButton).
function ProductCardCtas({ prod, previewMode }: { prod: Record<string, unknown>; previewMode?: boolean }) {
  const mode = normalizeCommerceMode(prod.commerceMode);
  const showOnline = mode === "ONLINE" || mode === "BOTH";
  const showWhatsApp = mode === "WHATSAPP" || mode === "BOTH";

  const productName = String(prod.name || "");
  const displayPrice = typeof prod.price === "number" && prod.price ? formatCurrency(prod.price) : "";
  const productUrl = prod.productUrl ? String(prod.productUrl) : "";
  const message = buildWhatsAppMessage({ productName, price: displayPrice, productUrl });
  const waHref = buildWaMeLink(String(prod.whatsappUrl || ""), message);

  return (
    <div className="mt-1.5 space-y-2">
      {showOnline && (
        <BuyNowButton
          productId={String(prod.id)}
          productName={productName}
          imageUrl={prod.imageUrl ? String(prod.imageUrl) : undefined}
          previewMode={previewMode}
        />
      )}
      {showWhatsApp &&
        (previewMode ? (
          <button
            type="button"
            disabled
            title="Ordering available on your live website"
            className="w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--surface-card-hover,#27272A)] py-2 text-center text-xs font-semibold text-[var(--text-muted,#71717A)] disabled:cursor-not-allowed"
          >
            Order on WhatsApp
          </button>
        ) : waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.12))] bg-[var(--surface-card-hover,#27272A)] py-2 text-center text-xs font-semibold text-[var(--text-secondary,#A1A1AA)] transition-colors hover:border-[var(--brand-secondary,#00f5ff)] hover:text-[var(--brand-secondary,#00f5ff)]"
          >
            Order on WhatsApp
          </a>
        ) : (
          <p className="w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--surface-card-hover,#27272A)] py-2 text-center text-xs font-semibold text-[var(--text-muted,#71717A)]">
            Order on WhatsApp
          </p>
        ))}
    </div>
  );
}

export function ProductsRenderer({ props, previewMode }: RendererProps) {
  const p = props as Record<string, unknown>;
  const products = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Products");
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props)) return null;

  if (products.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={p} title={title} />
        {/* RCCF-68.3.2: container-aware grid — mobile 1 col, medium 2, desktop = configured columns. */}
        <div className={responsiveGridClass(columns)}>
          {products.map((prod: Record<string, unknown>, idx: number) => (
            <div key={idx} className="group rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-4 transition-colors hover:border-[var(--brand-primary,#6366F1)] hover:bg-[var(--surface-card,#18181B)]">
              <div className="relative mb-2 overflow-hidden rounded">
                {prod.imageUrl ? (
                  <CreatorImage
                    src={String(prod.imageUrl)}
                    alt={String(prod.name || "")}
                    variant="product"
                    className="w-full transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded bg-[var(--surface-card-hover,#27272A)]">
                    <span className="text-xs text-[var(--text-muted,#71717A)]">{String((prod.name as string)?.[0] ?? "P")}</span>
                  </div>
                )}
                {Boolean(prod.isFeatured) && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-black">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-[var(--text-primary,#FAFAFA)]">{String(prod.name || "")}</p>
              {prod.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted,#71717A)]">{String(prod.description)}</p>
              ) : null}
              <p className="mt-1 text-xs text-[var(--text-muted,#71717A)]">{typeof prod.price === "number" && prod.price ? formatCurrency(prod.price) : ""}</p>
              {prod.id ? (
                <ProductCardCtas
                  prod={prod as Record<string, unknown>}
                  previewMode={previewMode}
                />
              ) : (
                <p className="mt-1.5 w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--surface-card-hover,#27272A)] py-2 text-center text-xs font-semibold text-[var(--text-muted,#71717A)]">
                  Buy Now
                </p>
              )}
            </div>
          ))}
        </div>
        <ViewAllLink href={p.viewAllHref} />
      </div>
    );
  }

  return <EmptyState label="Add products in Dashboard" />;
}

/* â”€â”€â”€ Timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function TimelineRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const milestones = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Timeline");
  if (!useVisibility(props)) return null;

  if (milestones.length > 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={p} title={title} />
        <div className="space-y-6">
          {milestones.map((m: Record<string, string>, i: number) => (
            <div key={i} className="relative border-l-2 border-zinc-800 pl-6">
              <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full border-2 border-zinc-800 bg-[var(--surface-root,#0A0A0B)]" />
              {m.imageUrl && (
                <div className="mb-2 w-full max-w-xs overflow-hidden rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card-hover,#27272A)]">
                  <CreatorImage
                    src={m.imageUrl}
                    alt={m.title || m.name || "Milestone"}
                    variant="gallery"
                    className="h-full w-full"
                  />
                </div>
              )}
              <p className="text-xs font-semibold text-[var(--brand-secondary,#00f5ff)]">{m.year}</p>
              <p className="mt-1 text-sm font-medium text-[var(--text-primary,#FAFAFA)]">{m.title || m.name}</p>
              <p className="text-xs text-[var(--text-muted,#71717A)]">{m.description || ""}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add milestones to your timeline" />;
}

/* â”€â”€â”€ Social Links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function LinksRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const links = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Connect With Me");
  if (!useVisibility(props)) return null;

  if (links.length > 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-[var(--section-spacing,3rem)] text-center">
        <SectionHeading p={p} title={title} />
        <div className="space-y-3">
          {links.map((link: Record<string, string>, i: number) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[var(--radius-lg,0.5rem)] bg-[var(--surface-card-hover,#27272A)] px-4 py-3 text-sm font-medium text-[var(--text-primary,#FAFAFA)] hover:bg-[var(--surface-card-hover,#27272A)] transition-colors">
              <span>{link.platform || link.label || "Link"}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add your social links" />;
}

/* â”€â”€â”€ Affiliate Links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

// RCCF-65.2: the Affiliate Links section renders the persisted AffiliateLink
// aggregate (active-only, deterministic order) via the public AffiliateGrid.
// It is DISTINCT from `links.default`, which stays Hero's social links.
// Only http(s) URLs are ever opened (see safe-url.ts) — non-web schemes are
// dropped at render time so the storefront never navigates to javascript:/data:.

export function AffiliateLinksRenderer({ props, previewMode }: RendererProps) {
  const p = props as Record<string, unknown>;
  const resolved = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Affiliate Links");
  if (!useVisibility(props)) return null;

  const affiliates: AffiliateGridItem[] = resolved
    .map((l) => ({
      id: String(l.id || ""),
      title: String(l.title || ""),
      url: safeUrl(String(l.url || "")),
      imageUrl: l.imageUrl ? String(l.imageUrl) : null,
      clicks: typeof l.clicks === "number" ? l.clicks : 0,
    }))
    .filter((a) => a.id && a.url);

  if (affiliates.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={p} title={title} />
        <AffiliateGrid affiliates={affiliates} previewMode={previewMode} />
      </div>
    );
  }

  return <EmptyState label="Add affiliate links in Dashboard" />;
}

/* â”€â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function FooterRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const socialLinks = (p.socialLinks as Array<{ url: string; platform?: string; label?: string }>) ?? [];
  const platformLabel = (platform: string) => platform.charAt(0).toUpperCase() + platform.slice(1);
  const brandName = String(p.brandName || "Northstar Studio");
  const footerDescription = String(p.footerDescription || p.bio || p.tagline || "Design that moves your business forward. Digital experiences, visual systems, and products for ambitious modern brands.");
  const copyright = String(p.copyright || `© ${new Date().getFullYear()} ${brandName} — All rights reserved.`);

  // RCCF-LAUNCH-04 + RCCF-LAUNCH-18: creator legal links are tenant-relative (same host) so they
  // resolve to the creator's own legal pages ( /testcreator/privacy → tenant privacy).
  // When tenantDomain is provided (StorefrontPage injects it), prefix; otherwise use relative path.
  const tenantDomain = typeof p.tenantDomain === "string" && p.tenantDomain ? String(p.tenantDomain) : "";
  const creatorLegal = (path: string) => (tenantDomain ? `${tenantDomain}${path}` : path);

  // RCCF-07: realistic footer columns — navigation-consistent anchors + legal.
  // Admin can override via section config `footerColumns` (array of {title, links:[{label,href}]}).
  // When absent, we render curated defaults that mirror the Northstar navigation.
  const defaultColumns: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
    { title: "Products", links: [{ label: "Templates", href: "#products" }, { label: "Design Assets", href: "#products" }, { label: "Brand Kits", href: "#products" }, { label: "All Products", href: "#products" }] },
    { title: "Services", links: [{ label: "Brand Strategy", href: "#services" }, { label: "Web Design", href: "#services" }, { label: "Product Design", href: "#services" }, { label: "Creative Direction", href: "#services" }] },
    { title: "Company", links: [{ label: "About", href: "#timeline" }, { label: "Gallery / Work", href: "#gallery" }, { label: "Testimonials", href: "#testimonials" }, { label: "Contact", href: "#contact" }] },
    { title: "Support", links: [{ label: "FAQ", href: "#faq" }, { label: "Privacy", href: creatorLegal("/privacy") }, { label: "Terms", href: creatorLegal("/terms") }, { label: "Refunds", href: creatorLegal("/refund") }] },
  ];
  const columns = (p.footerColumns as typeof defaultColumns) ?? defaultColumns;

  // Render as <div> — StorefrontPage already provides the semantic outer <footer data-testid="storefront-footer">.
  return (
    <div className="text-sm text-[var(--text-muted,#71717A)]">
      <div className="grid gap-8 md:grid-cols-12">
        {/* Brand column */}
        <div className="md:col-span-4">
          <p className="text-base font-semibold tracking-tight text-[var(--text-primary,#FAFAFA)]">{brandName}</p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--text-secondary,#A1A1AA)]">{footerDescription}</p>
          {socialLinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socialLinks.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[var(--border,rgba(255,255,255,0.08))] px-2.5 py-1 text-[11px] text-[var(--text-muted,#71717A)] transition-colors hover:border-[var(--border,rgba(0,0,0,0.12))] hover:text-[var(--text-primary,#FAFAFA)]"
                >
                  {l.label || platformLabel(l.platform || "Link")}
                </a>
              ))}
            </div>
          )}
        </div>
        {/* Link columns */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 md:col-span-8 md:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-primary,#FAFAFA)]">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={`${col.title}-${l.label}`}>
                    <a href={l.href} className="text-xs text-[var(--text-muted,#71717A)] transition-colors hover:text-[var(--text-primary,#FAFAFA)]">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {/* Bottom bar — creator legal (tenant-relative) */}
      <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-[var(--border,rgba(255,255,255,0.08))] pt-6 text-[11px] sm:flex-row">
        <span>{copyright}</span>
        <div className="flex items-center gap-4">
          <a href={creatorLegal("/privacy")} className="transition-colors hover:text-[var(--text-primary,#FAFAFA)]">Privacy</a>
          <a href={creatorLegal("/terms")} className="transition-colors hover:text-[var(--text-primary,#FAFAFA)]">Terms</a>
          <a href={creatorLegal("/refund")} className="transition-colors hover:text-[var(--text-primary,#FAFAFA)]">Refunds</a>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Testimonials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function TestimonialsRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const items = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Testimonials");
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props)) return null;

  if (items.length > 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={p} title={title} />
        {/* RCCF-68.3.2: container-aware grid. Desktop keeps the configured
            column count (capped by item count, matching the old behavior);
            mobile is 1 column so testimonials never cram. */}
        <div className={responsiveGridClass(Math.min(columns, items.length))}>
          {items.map((item: Record<string, string>, i: number) => (
            <div key={i} className="rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                {item.avatarUrl ? (
                  <CreatorImage
                    src={item.avatarUrl}
                    alt={item.name || "Testimonial"}
                    variant="avatar"
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[var(--surface-card-hover,#27272A)] flex items-center justify-center text-xs text-[var(--text-muted,#71717A)]">
                    {(item.name || "?")[0]}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary,#FAFAFA)]">{item.name || "Anonymous"}</p>
                  {item.handle && <p className="text-[10px] text-[var(--text-muted,#71717A)]">{item.handle}</p>}
                </div>
              </div>
              {item.rating && Number(item.rating) > 0 && (
                <div className="mb-2 flex items-center gap-0.5">
                  {Array.from({ length: Math.min(5, Number(item.rating)) }).map((_, s) => (
                    <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
              <p className="text-xs italic text-[var(--text-secondary,#A1A1AA)]">{item.content || item.message || ""}</p>
            </div>
          ))}
        </div>
        <ViewAllLink href={p.viewAllHref} />
      </div>
    );
  }

  return <EmptyState label="Add testimonials from your fans" />;
}

/* â”€â”€â”€ FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function FaqRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const items = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "FAQ");
  if (!useVisibility(props)) return null;

  if (items.length > 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={p} title={title} />
        <div className="space-y-3">
          {items.map((item: Record<string, string>, i: number) => (
            <details key={i} className="group rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-[var(--text-primary,#FAFAFA)]">
                {item.question || item.q}
                <svg suppressHydrationWarning className="h-4 w-4 text-[var(--text-muted,#71717A)] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="border-t border-white/5 px-4 py-3 text-xs text-[var(--text-muted,#71717A)]">{item.answer || item.a}</div>
            </details>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add frequently asked questions" />;
}

/* â”€â”€â”€ Contact â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const initialContactState: ContactActionResult = { success: false };

export function ContactRenderer({ props, previewMode }: RendererProps) {
  const p = props as Record<string, string>;
  const tenantId = String(props.tenantId || "");
  const [state, action] = useFormState(submitStorefrontContact, initialContactState);
  const title = p.title || "Get In Touch";

  if (state.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-[var(--section-spacing,3rem)] text-center">
        <SectionHeading p={props} title={title} />
        <div className="rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-6">
          <p className="text-sm text-[var(--text-secondary,#A1A1AA)]">Thanks for reaching out! I&apos;ll get back to you soon.</p>
        </div>
      </div>
    );
  }

  // RCCF-68.3.2 — preview isolation: the form stays visible but is INERT. No
  // server action, no mutation, no network request. Server authorization is
  // untouched (previewMode is a UX layer, not a security boundary).
  if (previewMode) {
    return (
      <div className="mx-auto max-w-lg px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={props} title={title} />
        {!p.description && (
          <p className="mb-6 text-center text-sm text-[var(--text-muted,#71717A)]">Have a question or want to collaborate? Reach out!</p>
        )}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted,#71717A)]">Name</label>
            <input disabled placeholder="Your name" className="w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 opacity-60 disabled:cursor-not-allowed" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted,#71717A)]">Email</label>
            <input disabled type="email" placeholder="your@email.com" className="w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 opacity-60 disabled:cursor-not-allowed" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted,#71717A)]">Message</label>
            <textarea disabled rows={4} className="w-full resize-none rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 opacity-60 disabled:cursor-not-allowed" placeholder="Your message..." />
          </div>
          <button type="button" disabled className="w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#00f5ff)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-fg,#09090b)] opacity-50 disabled:cursor-not-allowed">Send Message</button>
          <p className="text-center text-[10px] font-medium uppercase tracking-widest text-amber-400/80">Preview — submissions disabled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-[var(--section-spacing,3rem)]">
      <SectionHeading p={props} title={title} />
      {!p.description && (
        <p className="mb-6 text-center text-sm text-[var(--text-muted,#71717A)]">Have a question or want to collaborate? Reach out!</p>
      )}
      <form action={async (fd) => {
        fd.set("tenantId", tenantId);
        action(fd);
      }} className="space-y-4">
        <input type="hidden" name="tenantId" value={tenantId} />
        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted,#71717A)]">Name</label>
          <input name="name" required maxLength={200} className="w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="Your name" />
          {state.fieldErrors?.name && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted,#71717A)]">Email</label>
          <input name="email" type="email" required maxLength={200} className="w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="your@email.com" />
          {state.fieldErrors?.email && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.email[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted,#71717A)]">Message</label>
          <textarea name="message" required minLength={10} maxLength={5000} rows={4} className="w-full resize-none rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="Your message..." />
          {state.fieldErrors?.message && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.message[0]}</p>}
        </div>
        {state.error && <p className="text-xs text-red-400">{state.error}</p>}
        <button type="submit" className="w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#00f5ff)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-fg,#09090b)] transition-opacity hover:bg-[var(--button-primary-hover,#00d9f2)]">Send Message</button>
      </form>
    </div>
  );
}

/* â”€â”€â”€ Newsletter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const initialNewsletterState: ContactActionResult = { success: false };

export function NewsletterRenderer({ props, previewMode }: RendererProps) {
  const p = props as Record<string, string>;
  const tenantId = String(props.tenantId || "");
  const [state, action] = useFormState(subscribeNewsletter, initialNewsletterState);
  const title = p.title || "Subscribe";

  if (state.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-[var(--section-spacing,3rem)] text-center">
        <SectionHeading p={props} title={title} />
        <div className="rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-6">
          <p className="text-sm text-[var(--text-secondary,#A1A1AA)]">You&apos;re subscribed! Stay tuned for updates.</p>
        </div>
      </div>
    );
  }

  // RCCF-68.3.2 — preview isolation: subscribe UI stays visible but INERT.
  if (previewMode) {
    return (
      <div className="mx-auto max-w-lg px-4 py-[var(--section-spacing,3rem)] text-center">
        <SectionHeading p={props} title={title} />
        <p className="mb-6 text-sm text-[var(--text-muted,#71717A)]">Stay updated with the latest content and announcements.</p>
        <div className="flex gap-2">
          <input disabled placeholder={p.placeholder || "Your email"} className="flex-1 rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 opacity-60 disabled:cursor-not-allowed" />
          <button type="button" disabled className="rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#00f5ff)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-fg,#09090b)] opacity-50 disabled:cursor-not-allowed">{p.buttonText || "Subscribe"}</button>
        </div>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-amber-400/80">Preview — subscriptions disabled</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-[var(--section-spacing,3rem)] text-center">
      <SectionHeading p={props} title={title} />
      <p className="mb-6 text-sm text-[var(--text-muted,#71717A)]">Stay updated with the latest content and announcements.</p>
      <form action={async (fd) => {
        fd.set("tenantId", tenantId);
        action(fd);
      }} className="flex gap-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input name="email" type="email" required className="flex-1 rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder={p.placeholder || "Your email"} />
        <button type="submit" className="rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#00f5ff)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-fg,#09090b)] transition-opacity hover:bg-[var(--button-primary-hover,#00d9f2)]">{p.buttonText || "Subscribe"}</button>
      </form>
      {state.error && <p className="mt-2 text-xs text-red-400">{state.error}</p>}
      {state.fieldErrors?.email && <p className="mt-2 text-xs text-red-400">{state.fieldErrors.email[0]}</p>}
    </div>
  );
}

/* â”€â”€â”€ Courses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function CoursesRenderer({ props }: RendererProps) {  const p = props as Record<string, unknown>;
  const courses = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Courses");
  if (!useVisibility(props)) return null;

  if (courses.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={p} title={title} />
        <div className="grid gap-4 @sm/main:grid-cols-2 @lg/main:grid-cols-3">
          {courses.map((course: Record<string, unknown>, i: number) => (
            <div key={i} className="group overflow-hidden rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 transition-colors hover:border-[var(--brand-primary,#6366F1)]">
              <div className="relative">
                {course.imageUrl ? (
                  <CreatorImage
                    src={String(course.imageUrl)}
                    alt={String(course.title || "")}
                    variant="card"
                    className="w-full transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900" />
                )}
                {Boolean(course.featured) && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-black">
                    Featured
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-[var(--brand-secondary,#00f5ff)]">{(String(course.category || "")).toUpperCase() || "COURSE"}</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary,#FAFAFA)]">{String(course.title || "")}</p>
                {!!course.description && <p className="mt-1 text-xs text-[var(--text-muted,#71717A)]">{String(course.description)}</p>}
                {!!course.price && <p className="mt-2 text-sm font-semibold text-zinc-200">{typeof course.price === "number" ? formatCurrency(course.price) : String(course.price)}</p>}
              </div>
            </div>
          ))}
        </div>
        <ViewAllLink href={p.viewAllHref} />
      </div>
    );
  }

  return <EmptyState label="Add your courses" />;
}

/* â”€â”€â”€ Services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function ServicesRenderer({ props, previewMode }: RendererProps) {
  const p = props as Record<string, unknown>;
  const services = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Services");
  if (!useVisibility(props)) return null;

  if (services.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={p} title={title} />
        <div className="grid gap-4 @sm/main:grid-cols-2 @lg/main:grid-cols-3">
          {services.map((service: Record<string, unknown>, i: number) => (
            <div key={i} className="group overflow-hidden rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 text-center transition-colors hover:border-[var(--brand-primary,#6366F1)]">
              <div className="relative">
                {service.imageUrl ? (
                  <CreatorImage
                    src={String(service.imageUrl)}
                    alt={String(service.title || "")}
                    variant="card"
                    className="w-full transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900" />
                )}
                {Boolean(service.featured) && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-black">
                    Featured
                  </span>
                )}
              </div>
              <div className="p-6">
                {!!service.category && (
                  <p className="text-xs font-semibold text-[var(--brand-secondary,#00f5ff)]">{String(service.category).toUpperCase()}</p>
                )}
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary,#FAFAFA)]">{String(service.title || "")}</p>
                {!!service.description && <p className="mt-1 text-xs text-[var(--text-muted,#71717A)]">{String(service.description)}</p>}
                <p className="mt-3 text-lg font-bold text-zinc-100">
                  {typeof service.price === "number" ? formatCurrency(service.price) : String(service.price || "")}
                </p>
                {!!service.duration && <p className="mt-1 text-xs text-[var(--text-muted,#71717A)]">{String(service.duration)}</p>}
                <ServiceBookingCta service={service as Record<string, unknown>} previewMode={previewMode} />
              </div>
            </div>
          ))}
        </div>
        <ViewAllLink href={p.viewAllHref} />
      </div>
    );
  }

  return <EmptyState label="Add your services" />;
}

/* â”€â”€â”€ Service Booking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

// RCCF-67.5 — Book Now flow for an explicitly bookable Service. The visitor
// picks a future open slot, enters name/email/phone, and submits through the
// canonical public booking action. Price is display-only (server-derived).
function ServiceBookingCta({ service, previewMode }: { service: Record<string, unknown>; previewMode?: boolean }) {
  const [open, setOpen] = useState(false);
  const slots = (service.bookableSlots as Array<Record<string, unknown>> | undefined) ?? [];
  const bookable = Boolean(service.bookable);

  // Truthful states — never show fake availability.
  if (!bookable) return null;
  if (slots.length === 0) {
    return (
      <p className="mt-4 rounded-[var(--radius-lg,0.5rem)] bg-[var(--surface-card-hover,#27272A)] px-3 py-2 text-[11px] text-[var(--text-muted,#71717A)]">
        No upcoming availability.
      </p>
    );
  }

  // RCCF-68.3.2 — preview isolation: service + availability stay visible but the
  // booking controls are INERT (no slot claim, no submitPublicBooking request).
  if (previewMode) {
    return (
      <div className="mt-4">
        <button
          type="button"
          disabled
          title="Booking available on your live website"
          className="w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#00f5ff)] py-2 text-xs font-semibold text-[var(--button-primary-fg,#09090b)] opacity-50 disabled:cursor-not-allowed"
        >
          Book Now
        </button>
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted,#71717A)]">Available times</p>
          {slots.map((slot) => (
            <div key={String(slot.id || "")} className="rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 px-3 py-2 text-xs text-[var(--text-muted,#71717A)]">
              {formatSlotLabel(slot)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#00f5ff)] py-2 text-xs font-semibold text-[var(--button-primary-fg,#09090b)] transition-colors hover:bg-[var(--button-primary-hover,#00d9f2)]"
      >
        {open ? "Hide times" : "Book Now"}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted,#71717A)]">Choose a time</p>
          {slots.map((slot) => (
            <ServiceSlotBooker key={String(slot.id || "")} slot={slot} />
          ))}
        </div>
      )}
    </div>
  );
}

function formatSlotLabel(slot: Record<string, unknown>): string {
  const slotDate = new Date(String(slot.slotDate || ""));
  const dateLabel = isNaN(slotDate.getTime()) ? String(slot.slotDate || "") : slotDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${dateLabel} · ${String(slot.slotStart || "")}–${String(slot.slotEnd || "")}`;
}

function ServiceSlotBooker({ slot }: { slot: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ status: string } | null>(null);
  const [error, setError] = useState("");
  const slotDate = new Date(String(slot.slotDate || ""));
  const dateLabel = isNaN(slotDate.getTime()) ? String(slot.slotDate || "") : slotDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const approvalRequired = Boolean(slot.approvalRequired);

  const submit = async (fd: FormData) => {
    setSubmitting(true);
    setError("");
    const { submitPublicBooking } = await import("@/actions/storefront-bookings.actions");
    const result = await submitPublicBooking({ success: false }, fd);
    if (result.success) {
      setDone({ status: result.status ?? "confirmed" });
    } else {
      setError(result.error || result.fieldErrors?.customerEmail?.[0] || "Could not submit booking");
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 px-3 py-2">
        <p className="text-xs text-[var(--text-primary,#FAFAFA)]">{dateLabel} · {String(slot.slotStart || "")}–{String(slot.slotEnd || "")}</p>
        <p className="mt-1 text-[11px] text-emerald-300">
          {done.status === "confirmed" ? "Booking confirmed." : "Booking submitted — awaiting approval."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 px-3 py-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-xs text-[var(--text-primary,#FAFAFA)]">
        <span>{dateLabel} · {String(slot.slotStart || "")}–{String(slot.slotEnd || "")}</span>
        <span className="text-[var(--brand-secondary,#00f5ff)]">{open ? "Cancel" : "Select"}</span>
      </button>

      {open && (
        <form action={submit} className="mt-2 space-y-1.5">
          <input type="hidden" name="bookingId" value={String(slot.id || "")} />
          <input name="customerName" required maxLength={200} placeholder="Your name" className="w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] px-2.5 py-1.5 text-xs text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          <input name="customerEmail" type="email" required maxLength={200} placeholder="you@example.com" className="w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] px-2.5 py-1.5 text-xs text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          <input name="customerPhone" maxLength={30} placeholder="Phone (optional)" className="w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] px-2.5 py-1.5 text-xs text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--brand-secondary,#00f5ff)] py-1.5 text-xs font-semibold text-[var(--text-primary,#FAFAFA)] disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Booking…" : approvalRequired ? "Request Booking" : "Confirm"}
          </button>
        </form>
      )}
    </div>
  );
}

/* â”€â”€â”€ Bookings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function BookingsRenderer({ props, previewMode }: RendererProps) {
  const p = props as Record<string, unknown>;
  const slots = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Book a Session");
  if (!useVisibility(props)) return null;

  if (slots.length === 0) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-[var(--section-spacing,3rem)]">
      <SectionHeading p={p} title={title} />
      <div className="grid gap-4 @sm/main:grid-cols-2 @lg/main:grid-cols-3">
        {slots.map((slot, i) => (
          <BookingCard key={i} slot={slot as Record<string, unknown>} previewMode={previewMode} />
        ))}
      </div>
    </div>
  );
}

function BookingCard({ slot, previewMode }: { slot: Record<string, unknown>; previewMode?: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ status: string } | null>(null);
  const [error, setError] = useState("");
  const slotDate = new Date(String(slot.slotDate || ""));
  const dateLabel = isNaN(slotDate.getTime()) ? String(slot.slotDate || "") : slotDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const approvalRequired = Boolean(slot.approvalRequired);

  const submit = async (fd: FormData) => {
    setSubmitting(true);
    setError("");
    // RCCF-67.4: lazy-load the server action so importing this client component
    // never pulls the server-side tenant/rate-limit modules into a node test
    // environment at module-load time (same pattern as AffiliateGrid).
    const { submitPublicBooking } = await import("@/actions/storefront-bookings.actions");
    const result = await submitPublicBooking({ success: false }, fd);
    if (result.success) {
      setDone({ status: result.status ?? "confirmed" });
    } else {
      setError(result.error || result.fieldErrors?.customerEmail?.[0] || "Could not submit booking");
    }
    setSubmitting(false);
  };

  // RCCF-68.3.2 — preview isolation: the booking card stays visible (title,
  // description, time, price) but the booking form is INERT — no slot claim,
  // no submitPublicBooking request, no rate-limit request.
  if (previewMode) {
    return (
      <div className="flex flex-col rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-5">
        <p className="text-sm font-semibold text-[var(--text-primary,#FAFAFA)]">{String(slot.title || "Booking")}</p>
        {slot.description ? <p className="mt-1 text-xs text-[var(--text-muted,#71717A)]">{String(slot.description)}</p> : null}
        <p className="mt-2 text-xs text-[var(--brand-secondary,#00f5ff)]">{dateLabel} · {String(slot.slotStart || "")}–{String(slot.slotEnd || "")}</p>
        <p className="mt-1 text-sm font-bold text-[var(--text-primary,#FAFAFA)]">
          {typeof slot.price === "number" && slot.price > 0 ? formatCurrency(slot.price) : "Free"}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--text-muted,#71717A)]">
          {typeof slot.duration === "number" ? `${slot.duration} min` : ""}
          {approvalRequired ? " · requires approval" : ""}
        </p>
        <button type="button" disabled title="Booking available on your live website" className="mt-4 w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#00f5ff)] py-2 text-xs font-semibold text-[var(--button-primary-fg,#09090b)] opacity-50 disabled:cursor-not-allowed">
          {approvalRequired ? "Request Booking" : "Book Now"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-5">
      <p className="text-sm font-semibold text-[var(--text-primary,#FAFAFA)]">{String(slot.title || "Booking")}</p>
      {slot.description ? <p className="mt-1 text-xs text-[var(--text-muted,#71717A)]">{String(slot.description)}</p> : null}
      <p className="mt-2 text-xs text-[var(--brand-secondary,#00f5ff)]">{dateLabel} · {String(slot.slotStart || "")}–{String(slot.slotEnd || "")}</p>
      <p className="mt-1 text-sm font-bold text-[var(--text-primary,#FAFAFA)]">
        {typeof slot.price === "number" && slot.price > 0 ? formatCurrency(slot.price) : "Free"}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--text-muted,#71717A)]">
        {typeof slot.duration === "number" ? `${slot.duration} min` : ""}
        {approvalRequired ? " · requires approval" : ""}
      </p>

      {done ? (
        <p className="mt-4 rounded-[var(--radius-lg,0.5rem)] bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {done.status === "confirmed" ? "Booking confirmed!" : "Booking submitted — pending approval."}
        </p>
      ) : (
        <form action={submit} className="mt-4 space-y-2">
          <input type="hidden" name="bookingId" value={String(slot.id || "")} />
          <input name="customerName" required maxLength={200} placeholder="Your name" className="w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] px-3 py-2 text-xs text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          <input name="customerEmail" type="email" required maxLength={200} placeholder="you@example.com" className="w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] px-3 py-2 text-xs text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          <input name="customerPhone" maxLength={30} placeholder="Phone (optional)" className="w-full rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] px-3 py-2 text-xs text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          <textarea name="notes" maxLength={2000} rows={2} placeholder="Notes (optional)" className="w-full resize-none rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] px-3 py-2 text-xs text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" />
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#00f5ff)] py-2 text-xs font-semibold text-[var(--button-primary-fg,#09090b)] transition-colors hover:bg-[var(--button-primary-hover,#00d9f2)] disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Booking…" : approvalRequired ? "Request Booking" : "Book Now"}
          </button>
        </form>
      )}
    </div>
  );
}

/* â”€â”€â”€ Embed: Spotify â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function SpotifyRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const url = p.url || "";
  if (!useVisibility(props)) return null;

  const src = url.match(/spotify\.com\/(track|album|playlist|episode)\/(\S+)/)?.[0]
    ? url.replace(/^.*(spotify\.com\/(track|album|playlist|episode)\/\S+).*$/, "https://open.$1")
    : "";

  if (src) {
    return (
      <div className="mx-auto max-w-lg px-4 py-[var(--section-spacing,3rem)]">
        <iframe
          src={src.includes("?") ? `${src}&utm_source=generator` : `${src}?utm_source=generator`}
          width="100%"
          height={p.height || "352"}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-[var(--radius-xl,0.75rem)]"
        />
      </div>
    );
  }

  return <EmptyState label="Add a Spotify track URL" />;
}

/* â”€â”€â”€ Embed: YouTube â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function YouTubeRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const url = p.url || "";
  if (!useVisibility(props)) return null;

  const videoId = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || "";
  const src = videoId
    ? `https://www.youtube.com/embed/${videoId}${p.autoplay ? "?autoplay=1" : ""}`
    : "";

  if (src) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-[var(--section-spacing,3rem)]">
        <div className="aspect-video overflow-hidden rounded-[var(--radius-xl,0.75rem)]">
          <iframe
            src={src}
            width="100%"
            height="100%"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="h-full w-full"
          />
        </div>
      </div>
    );
  }

  return <EmptyState label="Add a YouTube video URL" />;
}

/* â”€â”€â”€ Social: Discord â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function DiscordRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const serverId = p.serverId || "";
  const label = p.label || "Join Discord";
  if (!useVisibility(props)) return null;

  if (serverId) {
    const inviteUrl = p.inviteUrl || `https://discord.gg/${serverId}`;
    return (
      <div className="mx-auto max-w-md px-4 py-[var(--section-spacing,3rem)] text-center">
        <div className="rounded-[var(--radius-lg,0.5rem)] bg-[var(--brand-primary,#6366F1)]/20 p-6">
          <p className="text-3xl">ðŸ’¬</p>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary,#FAFAFA)]">Discord Community</p>
          <p className="mt-1 text-xs text-[var(--text-muted,#71717A)]">Join the conversation</p>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#6366F1)] px-4 py-2 text-xs font-semibold text-[var(--button-primary-fg,#FAFAFA)] transition-colors hover:bg-[var(--button-primary-hover,#4F46E5)]"
          >
            {label}
          </a>
        </div>
      </div>
    );
  }

  return <EmptyState label="Connect your Discord server" />;
}

/* â”€â”€â”€ Social: Instagram â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function InstagramRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const username = String(p.username || "");
  if (!useVisibility(props)) return null;

  // RCCF-67.4 — truth: real Instagram content is delivered by the Content Feed
  // section (cron-synced from the connected account). This component must NOT
  // fabricate a post grid. It renders a truthful profile link only; the live
  // feed lives in contentFeed.default.
  if (username) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-[var(--section-spacing,3rem)] text-center">
        <p className="text-sm font-medium text-[var(--text-secondary,#A1A1AA)]">
          Follow{" "}
          <a
            href={`https://instagram.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--brand-secondary,#00f5ff)] hover:underline"
          >
            @{username}
          </a>{" "}
          on Instagram for the latest posts.
        </p>
        <a
          href={`https://instagram.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-[var(--radius-lg,0.5rem)] bg-[var(--button-primary-bg,#00f5ff)] px-5 py-2 text-xs font-semibold text-[var(--button-primary-fg,#09090b)] transition-colors hover:bg-[var(--button-primary-hover,#00d9f2)]"
        >
          View on Instagram
        </a>
      </div>
    );
  }

  return <EmptyState label="Connect your Instagram account" />;
}

/* â”€â”€â”€ Games â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function GamesRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const games = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || "Games";
  if (!useVisibility(props)) return null;

  if (games.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={p} title={title} />
        <div className="grid gap-4 @sm/main:grid-cols-2 @lg/main:grid-cols-3">
          {games.map((game: Record<string, string>, i: number) => (
            <div key={i} className="rounded-[var(--radius-lg,0.5rem)] border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-4 text-center">
              {game.logoUrl ? (
                <div className="mx-auto mb-3 h-20 w-20">
                  <CreatorImage src={game.logoUrl} alt={game.name} variant="logo" />
                </div>
              ) : (
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--surface-card-hover,#27272A)] text-2xl text-[var(--text-muted,#71717A)]">
                  {(game.name || "G")[0]}
                </div>
              )}
              <p className="text-sm font-medium text-[var(--text-primary,#FAFAFA)]">{game.name}</p>
              {game.genre && <p className="mt-1 text-xs text-[var(--text-muted,#71717A)]">{game.genre}</p>}
              {game.description && <p className="mt-2 text-xs text-[var(--text-muted,#71717A)]">{game.description}</p>}
            </div>
          ))}
        </div>
        <ViewAllLink href={p.viewAllHref} />
      </div>
    );
  }

  return <EmptyState label="Add your games" />;
}

/* â”€â”€â”€ Content Feed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function ContentFeedRenderer({ props, elementId, previewMode }: RendererProps) {
  const p = props as Record<string, unknown>;
  const items = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || "Latest Content";
  if (!useVisibility(props)) return null;

  if (items.length > 0) {
    const isPinned = (idx: number) => idx < 2 && items.length > 4;
    return (
      <div className="mx-auto max-w-5xl px-4 py-[var(--section-spacing,3rem)]">
        <SectionHeading p={p} title={title} elementId={elementId} previewMode={previewMode} />
        <div className="grid grid-cols-2 gap-3 @sm/main:grid-cols-3 @lg/main:grid-cols-4">
          {items.map((item: Record<string, string>, i: number) => {
            const isVideo = item.mediaType === "video";
            const pinned = isPinned(i);
            const platformLabel = (item.platform || "social").toLowerCase();
            const badgeTone = platformLabel.includes("youtube") ? "bg-red-500/90 text-white" : platformLabel.includes("instagram") ? "bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white" : "bg-black/60 text-white/90";
            return (
              <a
                key={i}
                href={item.permalink || "#"}
                target={item.permalink ? "_blank" : undefined}
                rel={item.permalink ? "noopener noreferrer" : undefined}
                className={`group relative overflow-hidden rounded-[var(--radius-xl,0.75rem)] bg-[var(--surface-card,#18181B)] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${pinned ? "ring-1 ring-[var(--brand-primary)]/30 border border-[var(--brand-primary)]/20" : "ring-1 ring-white/[0.06] hover:ring-white/15 border border-transparent"}`}
                style={{ aspectRatio: isVideo ? "9 / 16" : "1 / 1" }}
              >
                {(item.thumbnailUrl || item.url) ? (
                  <CreatorImage
                    src={item.thumbnailUrl || item.url}
                    alt={item.caption ?? ""}
                    variant="gallery"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[var(--surface-card-hover,#27272A)]">
                    <span className="text-xs text-[var(--text-muted,#71717A)]">No media</span>
                  </div>
                )}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none" aria-hidden />
                {isVideo && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm ring-1 ring-white/20 shadow-lg transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none">
                      <svg suppressHydrationWarning className="ml-0.5 h-5 w-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </span>
                )}
                {item.caption && String(item.caption).trim() && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                    <span className="line-clamp-2 text-xs font-medium leading-relaxed text-white/95">{item.caption}</span>
                  </span>
                )}
                <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm ${badgeTone} ${pinned ? "ring-1 ring-amber-300/40" : ""}`}>
                  {platformLabel === "youtube" ? "▶" : platformLabel === "instagram" ? "◈" : "●"}
                  <span>{item.platform || "social"}</span>
                </span>
                {pinned && <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow-sm">Pinned</span>}
              </a>
            );
          })}
        </div>
        <ViewAllLink href={p.viewAllHref} />
      </div>
    );
  }

  return <EmptyState label="No content feed items" />;
}

export function HeroSplitRenderer(props: RendererProps) { return HeroRenderer(props); }
export function TestimonialsMarqueeRenderer(props: RendererProps) { return TestimonialsRenderer(props as any); }
export function ServicesBentoRenderer(props: RendererProps) { return ServicesRenderer(props as any); }
