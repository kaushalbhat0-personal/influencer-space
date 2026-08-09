"use client";

import type { ComponentDefinition } from "./types";
import { useState } from "react";
import { useFormState } from "react-dom";
import {
  submitStorefrontContact,
  subscribeNewsletter,
  type ContactActionResult,
} from "@/actions/storefront.actions";
import { CreatorImage, CreatorVideo } from "@/components/shared";
import { HeroMedia, responsiveAlignmentClass } from "@/components/shared/HeroMedia";
import type { HeroMediaKind } from "@/lib/media/hero-media";
import { BuyNowButton } from "@/app/[domain]/_components/buy-now-button";
import { Star } from "lucide-react";
import { shouldRenderSection } from "@/modules/section-presentation";
import { formatCurrency } from "@/lib/utils";
import { ViewAllLink } from "@/components/storefront/ViewAllLink";


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
    <div className="mx-auto max-w-5xl px-4 py-12 text-center">
      <div className="rounded-lg border border-dashed border-white/10 p-8 text-sm text-zinc-600">
        {label}
      </div>
    </div>
  );
}

// RCCF-LAUNCH-TRACK-04: shared section heading â€” honors presentation
// (hideTitle, descriptionOverride). Every data-driven renderer uses it; no
// duplicated title logic.
function SectionHeading({ p, title }: { p: Record<string, unknown>; title: string }) {
  if (p.hideTitle) return null;
  const description = p.description ? String(p.description) : null;
  return (
    <div className="mb-6 text-center">
      <h2 className="text-2xl font-bold text-[var(--text-primary,#FAFAFA)]">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-400">{description}</p>}
    </div>
  );
}

/* â”€â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function HeroRenderer({ props, elementId: _elementId }: RendererProps) {
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

  const alignment = resolvedMedia === "video" ? videoAlign : resolvedMedia === "background" ? "object-center" : imageAlign;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" data-resolved-media={resolvedMedia} data-renderer-decision={String(p.rendererDecision || "")}>
      {/* â”€â”€ Hero media â€” ALWAYS renders first; avatar never replaces it â”€â”€ */}
      <div className="relative aspect-[16/10] w-full sm:aspect-[16/8]">
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
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800/60 via-zinc-900/60 to-black">
            {process.env.NODE_ENV !== "production" && (
              <div className="flex flex-col items-center gap-2 text-zinc-600">
                <span className="text-2xl">âœ¦</span>
                <span className="text-xs tracking-wide">Your hero goes here</span>
              </div>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-zinc-950" />
      </div>

      {/* â”€â”€ Overlapping profile picture + identity (never above the media) â”€â”€ */}
      <div className="-mt-[35%] sm:-mt-[24%] relative z-10">
        <div className="mx-auto max-w-2xl px-4 pb-16 pt-2 text-center sm:pb-20">
          {profilePictureUrl && (
            <div className="relative mx-auto mb-4 h-28 w-28 overflow-hidden rounded-full border-4 border-zinc-950 shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:h-36 sm:w-36">
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
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">{name || title}</h1>
          ) : null}

          {title && title !== name && (
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
          )}
          {tagline && <p className="mt-3 text-base text-zinc-400">{tagline}</p>}
          {bio && <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-500">{bio}</p>}
          {!bio && subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {cta && (
              ctaLink ? (
                <a href={ctaLink} className="inline-flex items-center gap-2 rounded-lg bg-[var(--button-primary-bg,#00f5ff)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-fg,#09090b)] transition-opacity hover:bg-[var(--button-primary-hover,#00d9f2)]">
                  {cta}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--button-primary-bg,#00f5ff)] px-5 py-2.5 text-sm font-semibold text-[var(--button-primary-fg,#09090b)]">
                  {cta}
                </span>
              )
            )}
            {ctaSecondaryText && (
              ctaSecondaryLink ? (
                <a href={ctaSecondaryLink} className="inline-flex items-center gap-2 rounded-lg border border-[var(--button-secondary-border,rgba(255,255,255,0.2))] px-5 py-2.5 text-sm font-semibold text-[var(--button-secondary-fg,#D4D4D8)] transition-colors hover:border-[var(--button-secondary-hover-fg,#FAFAFA)] hover:text-[var(--button-secondary-hover-fg,#FAFAFA)]">
                  {ctaSecondaryText}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--button-secondary-border,rgba(255,255,255,0.2))] px-5 py-2.5 text-sm font-semibold text-[var(--button-secondary-fg,#D4D4D8)]">
                  {ctaSecondaryText}
                </span>
              )
            )}
          </div>

          {socialLinks.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {socialLinks.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
                >
                  {l.label || platformLabel(l.platform || "Link")}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Gallery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function GalleryRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const images = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || "Gallery";
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props)) return null;

  if (images.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <SectionHeading p={p} title={title} />
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` } as React.CSSProperties}>
          {images.slice(0, 12).map((img: Record<string, unknown>, i: number) => (
            <div key={i} className="aspect-square overflow-hidden rounded-lg bg-[var(--surface-card-hover,#27272A)]">
              {img.isVideo && img.videoUrl ? (
                <video
                  src={img.videoUrl as string}
                  poster={(img.url as string) || undefined}
                  muted
                  loop
                  playsInline
                  controls
                  className="h-full w-full object-cover"
                />
              ) : img.url ? (
                <CreatorImage
                  src={img.url as string}
                  alt={String(img.altText || img.caption || "")}
                  variant="gallery"
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--text-muted,#71717A)]">
                  {img.isVideo ? "Video" : "Image"}
                </div>
              )}
            </div>
          ))}
        </div>
        <ViewAllLink href={p.viewAllHref} />
      </div>
    );
  }

  return <EmptyState label="Add images to your gallery" />;
}

/* â”€â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function ProductsRenderer({ props, previewMode }: RendererProps) {
  const p = props as Record<string, unknown>;
  const products = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Products");
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props)) return null;

  if (products.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <SectionHeading p={p} title={title} />
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` } as React.CSSProperties}>
          {products.map((prod: Record<string, unknown>, idx: number) => (
            <div key={idx} className="group rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-4 transition-colors hover:border-[var(--brand-primary,#6366F1)] hover:bg-[var(--surface-card,#18181B)]">
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
                <BuyNowButton
                  productId={String(prod.id)}
                  productName={String(prod.name || "")}
                  imageUrl={prod.imageUrl ? String(prod.imageUrl) : undefined}
                  previewMode={previewMode}
                />
              ) : (
                <p className="mt-1.5 w-full rounded-lg bg-[var(--surface-card-hover,#27272A)] py-2 text-center text-xs font-semibold text-[var(--text-muted,#71717A)]">
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
      <div className="mx-auto max-w-3xl px-4 py-12">
        <SectionHeading p={p} title={title} />
        <div className="space-y-6">
          {milestones.map((m: Record<string, string>, i: number) => (
            <div key={i} className="relative border-l-2 border-zinc-800 pl-6">
              <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full border-2 border-zinc-800 bg-[var(--surface-root,#0A0A0B)]" />
              {m.imageUrl && (
                <div className="mb-2 w-full max-w-xs overflow-hidden rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card-hover,#27272A)]">
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
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <SectionHeading p={p} title={title} />
        <div className="space-y-3">
          {links.map((link: Record<string, string>, i: number) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg bg-[var(--surface-card-hover,#27272A)] px-4 py-3 text-sm font-medium text-[var(--text-primary,#FAFAFA)] hover:bg-[var(--surface-card-hover,#27272A)] transition-colors">
              <span>{link.platform || link.label || "Link"}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add your social links" />;
}

/* â”€â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function FooterRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const socialLinks = (p.socialLinks as Array<{ url: string; platform?: string; label?: string }>) ?? [];
  const platformLabel = (platform: string) => platform.charAt(0).toUpperCase() + platform.slice(1);
  return (
    <footer className="border-t border-[var(--border,rgba(255,255,255,0.08))] py-8 text-center text-sm text-[var(--text-muted,#71717A)]">
      {socialLinks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          {socialLinks.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--text-muted,#71717A)] transition-colors hover:text-[var(--text-primary,#FAFAFA)]"
            >
              {l.label || platformLabel(l.platform || "Link")}
            </a>
          ))}
        </div>
      )}
      {String(p.copyright || "Â© All rights reserved")}
      {/* VALIDATION-01 V-032: legal links on the storefront footer. */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px]">
        <a href="/terms" className="text-[var(--text-muted,#71717A)] transition-colors hover:text-[var(--text-primary,#FAFAFA)]">Terms</a>
        <a href="/privacy" className="text-[var(--text-muted,#71717A)] transition-colors hover:text-[var(--text-primary,#FAFAFA)]">Privacy</a>
        <a href="/refund" className="text-[var(--text-muted,#71717A)] transition-colors hover:text-[var(--text-primary,#FAFAFA)]">Refunds</a>
      </div>
    </footer>
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
      <div className="mx-auto max-w-4xl px-4 py-12">
        <SectionHeading p={p} title={title} />
        <div className="grid gap-4 sm:grid-cols-2" style={{ gridTemplateColumns: `repeat(${Math.min(columns, items.length)}, 1fr)` } as React.CSSProperties}>
          {items.map((item: Record<string, string>, i: number) => (
            <div key={i} className="rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-4">
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
      <div className="mx-auto max-w-3xl px-4 py-12">
        <SectionHeading p={p} title={title} />
        <div className="space-y-3">
          {items.map((item: Record<string, string>, i: number) => (
            <details key={i} className="group rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-[var(--text-primary,#FAFAFA)]">
                {item.question || item.q}
                <svg className="h-4 w-4 text-[var(--text-muted,#71717A)] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
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

export function ContactRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const tenantId = String(props.tenantId || "");
  const [state, action] = useFormState(submitStorefrontContact, initialContactState);
  const title = p.title || "Get In Touch";

  if (state.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <SectionHeading p={props} title={title} />
        <div className="rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-6">
          <p className="text-sm text-[var(--text-secondary,#A1A1AA)]">Thanks for reaching out! I&apos;ll get back to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
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
          <input name="name" required maxLength={200} className="w-full rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="Your name" />
          {state.fieldErrors?.name && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted,#71717A)]">Email</label>
          <input name="email" type="email" required maxLength={200} className="w-full rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="your@email.com" />
          {state.fieldErrors?.email && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.email[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted,#71717A)]">Message</label>
          <textarea name="message" required minLength={10} maxLength={5000} rows={4} className="w-full resize-none rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="Your message..." />
          {state.fieldErrors?.message && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.message[0]}</p>}
        </div>
        {state.error && <p className="text-xs text-red-400">{state.error}</p>}
        <button type="submit" className="w-full rounded-lg bg-[var(--button-primary-bg,#00f5ff)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-fg,#09090b)] transition-opacity hover:bg-[var(--button-primary-hover,#00d9f2)]">Send Message</button>
      </form>
    </div>
  );
}

/* â”€â”€â”€ Newsletter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const initialNewsletterState: ContactActionResult = { success: false };

export function NewsletterRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const tenantId = String(props.tenantId || "");
  const [state, action] = useFormState(subscribeNewsletter, initialNewsletterState);
  const title = p.title || "Subscribe";

  if (state.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <SectionHeading p={props} title={title} />
        <div className="rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-6">
          <p className="text-sm text-[var(--text-secondary,#A1A1AA)]">You&apos;re subscribed! Stay tuned for updates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <SectionHeading p={props} title={title} />
      <p className="mb-6 text-sm text-[var(--text-muted,#71717A)]">Stay updated with the latest content and announcements.</p>
      <form action={async (fd) => {
        fd.set("tenantId", tenantId);
        action(fd);
      }} className="flex gap-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input name="email" type="email" required className="flex-1 rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] px-4 py-2.5 text-sm text-[var(--text-primary,#FAFAFA)] placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder={p.placeholder || "Your email"} />
        <button type="submit" className="rounded-lg bg-[var(--button-primary-bg,#00f5ff)] px-4 py-2.5 text-sm font-semibold text-[var(--button-primary-fg,#09090b)] transition-opacity hover:bg-[var(--button-primary-hover,#00d9f2)]">{p.buttonText || "Subscribe"}</button>
      </form>
      {state.error && <p className="mt-2 text-xs text-red-400">{state.error}</p>}
      {state.fieldErrors?.email && <p className="mt-2 text-xs text-red-400">{state.fieldErrors.email[0]}</p>}
    </div>
  );
}

/* â”€â”€â”€ Pricing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function PricingRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const plans = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Plans");
  if (!useVisibility(props)) return null;

  if (plans.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <SectionHeading p={p} title={title} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan: Record<string, unknown>, i: number) => {
            const isPopular = Boolean(plan.isPopular);
            return (
              <div key={i} className={`relative rounded-lg border ${isPopular ? "border-[var(--brand-secondary,#00f5ff)]/30 bg-[var(--brand-secondary,#00f5ff)]/5" : "border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60"} p-6 text-center`}>
                {isPopular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--brand-secondary,#00f5ff)] px-3 py-0.5 text-[10px] font-semibold text-black">Popular</span>}
                <p className="text-sm font-medium text-[var(--text-secondary,#A1A1AA)]">{String(plan.name || "")}</p>
                <p className="mt-2 text-3xl font-bold text-[var(--text-primary,#FAFAFA)]">{typeof plan.price === "number" ? formatCurrency(plan.price) : String(plan.price || "")}</p>
                <p className="mt-1 text-xs text-[var(--text-muted,#71717A)]">{String(plan.description || plan.desc || "")}</p>
                {!!plan.cta && (
                  <button className={`mt-4 w-full rounded-lg ${isPopular ? "bg-[var(--button-primary-bg,#00f5ff)] text-[var(--button-primary-fg,#09090b)] hover:bg-[var(--button-primary-hover,#00d9f2)]" : "border border-[var(--button-secondary-border,rgba(255,255,255,0.08))] text-[var(--button-secondary-fg,#FAFAFA)]"} px-4 py-2 text-sm font-semibold`}>
                    {String(plan.cta)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add pricing plans" />;
}

/* â”€â”€â”€ Courses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function CoursesRenderer({ props }: RendererProps) {  const p = props as Record<string, unknown>;
  const courses = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Courses");
  if (!useVisibility(props)) return null;

  if (courses.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <SectionHeading p={p} title={title} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: Record<string, unknown>, i: number) => (
            <div key={i} className="group overflow-hidden rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 transition-colors hover:border-[var(--brand-primary,#6366F1)]">
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

export function ServicesRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const services = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Services");
  if (!useVisibility(props)) return null;

  if (services.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <SectionHeading p={p} title={title} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service: Record<string, unknown>, i: number) => (
            <div key={i} className="group overflow-hidden rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 text-center transition-colors hover:border-[var(--brand-primary,#6366F1)]">
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
      <div className="mx-auto max-w-lg px-4 py-12">
        <iframe
          src={src.includes("?") ? `${src}&utm_source=generator` : `${src}?utm_source=generator`}
          width="100%"
          height={p.height || "352"}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
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
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="aspect-video overflow-hidden rounded-xl">
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
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="rounded-lg bg-[var(--brand-primary,#6366F1)]/20 p-6">
          <p className="text-3xl">ðŸ’¬</p>
          <p className="mt-2 text-sm font-medium text-[var(--text-primary,#FAFAFA)]">Discord Community</p>
          <p className="mt-1 text-xs text-[var(--text-muted,#71717A)]">Join the conversation</p>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg bg-[var(--button-primary-bg,#6366F1)] px-4 py-2 text-xs font-semibold text-[var(--button-primary-fg,#FAFAFA)] transition-colors hover:bg-[var(--button-primary-hover,#4F46E5)]"
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
  const limit = Math.min(Math.max(Number(p.limit) || 6, 1), 30);
  if (!useVisibility(props)) return null;

  if (username) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="mb-4 text-center text-sm font-medium text-[var(--text-secondary,#A1A1AA)]">
          <a
            href={`https://instagram.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-zinc-200"
          >
            @{username}
          </a>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
            <div key={i} className="aspect-square rounded bg-gradient-to-br from-pink-900/30 to-purple-900/30 flex items-center justify-center text-xs text-[var(--text-muted,#71717A)]">
              ðŸ“·
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[10px] text-[var(--text-muted,#71717A)]">
          <a href={`https://instagram.com/${username}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-secondary,#A1A1AA)] transition-colors">View on Instagram</a>
        </p>
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
      <div className="mx-auto max-w-5xl px-4 py-12">
        <SectionHeading p={p} title={title} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game: Record<string, string>, i: number) => (
            <div key={i} className="rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/60 p-4 text-center">
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

export function ContentFeedRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const items = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || "Latest Content";
  if (!useVisibility(props)) return null;

  if (items.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <SectionHeading p={p} title={title} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item: Record<string, string>, i: number) => {
            const isVideo = item.mediaType === "video";
            return (
              <a
                key={i}
                href={item.permalink || "#"}
                target={item.permalink ? "_blank" : undefined}
                rel={item.permalink ? "noopener noreferrer" : undefined}
                className="group relative overflow-hidden rounded-xl bg-[var(--surface-card,#18181B)] ring-1 ring-white/[0.06] transition-all hover:ring-white/20"
                style={{ aspectRatio: isVideo ? "9 / 16" : "1 / 1" }}
              >
                {(item.thumbnailUrl || item.url) ? (
                  <CreatorImage
                    src={item.thumbnailUrl || item.url}
                    alt={item.caption ?? ""}
                    variant="gallery"
                    className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[var(--surface-card-hover,#27272A)]">
                    <span className="text-xs text-[var(--text-muted,#71717A)]">No media</span>
                  </div>
                )}
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-transform group-hover:scale-110">
                      <svg className="ml-0.5 h-5 w-5 text-[var(--text-primary,#FAFAFA)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
                {item.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-primary,#FAFAFA)]/90">{item.caption}</p>
                  </div>
                )}
                <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-primary,#FAFAFA)]/80 backdrop-blur-sm">
                  {item.platform || "social"}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  return <EmptyState label="No content feed items" />;
}
