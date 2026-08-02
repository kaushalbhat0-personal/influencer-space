"use client";

import type { ComponentDefinition } from "./types";
import { useFormState } from "react-dom";
import {
  submitStorefrontContact,
  subscribeNewsletter,
  type ContactActionResult,
} from "@/actions/storefront.actions";
import { CreatorImage, CreatorVideo } from "@/components/shared";
import { HeroMedia, responsiveAlignmentClass } from "@/components/shared/HeroMedia";
import { BuyNowButton } from "@/app/[domain]/_components/buy-now-button";
import { Star } from "lucide-react";


interface RendererProps {
  props: Record<string, unknown>;
  elementId?: string;
  definition?: ComponentDefinition;
}

function useVisibility(props: Record<string, unknown>, hasData: boolean): boolean {
  const mode = String(props.visibilityMode || "always");
  if (mode === "hidden") return false;
  if (mode === "auto" && !hasData) return false;
  return true;
}

function EmptyState({ label = "No content yet" }: { label?: string }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 text-center">
      <div className="rounded-lg border border-dashed border-white/10 p-8 text-sm text-zinc-600">
        {label}
      </div>
    </div>
  );
}

/* ─── Hero ─────────────────────────────────────────────── */

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
  const videoUrl = String(p.videoUrl || "");
  const posterUrl = String(p.posterUrl || "");
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

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      {/* ── Hero media — ALWAYS renders first (video → poster → placeholder) ── */}
      <div className="relative aspect-[16/10] w-full sm:aspect-[16/8]">
        {videoUrl ? (
          <HeroMedia
            type="video"
            url={videoUrl}
            poster={posterUrl}
            alignmentClass={videoAlign}
            className="absolute inset-0"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
          />
        ) : posterUrl ? (
          <HeroMedia
            type="image"
            url={posterUrl}
            alignmentClass={imageAlign}
            className="absolute inset-0"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800/60 via-zinc-900/60 to-black">
            <div className="flex flex-col items-center gap-2 text-zinc-600">
              <span className="text-2xl">✦</span>
              <span className="text-xs tracking-wide">Your hero goes here</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-zinc-950" />
      </div>

      {/* ── Overlapping profile picture + identity (never above the media) ── */}
      <div className="-mt-[30%] sm:-mt-[22%] relative z-10">
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

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">{name || title}</h1>

          {title && title !== name && (
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
          )}
          {tagline && <p className="mt-3 text-base text-zinc-400">{tagline}</p>}
          {bio && <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-500">{bio}</p>}
          {!bio && subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {cta && (
              ctaLink ? (
                <a href={ctaLink} className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-secondary,#00f5ff)] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">
                  {cta}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-secondary,#00f5ff)] px-5 py-2.5 text-sm font-semibold text-black">
                  {cta}
                </span>
              )
            )}
            {ctaSecondaryText && (
              ctaSecondaryLink ? (
                <a href={ctaSecondaryLink} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/40 hover:text-white">
                  {ctaSecondaryText}
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-semibold text-zinc-300">
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

/* ─── Gallery ──────────────────────────────────────────── */

export function GalleryRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const images = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || "Gallery";
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props, images.length > 0)) return null;

  if (images.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` } as React.CSSProperties}>
          {images.slice(0, 12).map((img: Record<string, unknown>, i: number) => (
            <div key={i} className="aspect-square overflow-hidden rounded-lg bg-zinc-800">
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
                <div className="flex h-full items-center justify-center text-zinc-700">
                  {img.isVideo ? "Video" : "Image"}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add images to your gallery" />;
}

/* ─── Products ─────────────────────────────────────────── */

export function ProductsRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const products = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Products");
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props, products.length > 0)) return null;

  if (products.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` } as React.CSSProperties}>
          {products.map((prod: Record<string, unknown>, idx: number) => (
            <div key={idx} className="group rounded-lg border border-white/10 bg-zinc-900/50 p-4 transition-colors hover:border-white/25 hover:bg-zinc-900">
              <div className="relative mb-2 overflow-hidden rounded">
                {prod.imageUrl ? (
                  <CreatorImage
                    src={String(prod.imageUrl)}
                    alt={String(prod.name || "")}
                    variant="product"
                    className="w-full transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded bg-zinc-800">
                    <span className="text-xs text-zinc-600">{String((prod.name as string)?.[0] ?? "P")}</span>
                  </div>
                )}
                {Boolean(prod.isFeatured) && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-black">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-zinc-300">{String(prod.name || "")}</p>
              <p className="text-xs text-zinc-500">{prod.price ? `₹${Number(prod.price).toLocaleString()}` : ""}</p>
              {prod.id ? (
                <BuyNowButton
                  productId={String(prod.id)}
                  productName={String(prod.name || "")}
                  imageUrl={prod.imageUrl ? String(prod.imageUrl) : undefined}
                />
              ) : (
                <p className="mt-1.5 w-full rounded-lg bg-white/5 py-2 text-center text-xs font-semibold text-zinc-600">
                  Buy Now
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add products in Dashboard" />;
}

/* ─── Timeline ─────────────────────────────────────────── */

export function TimelineRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const milestones = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Timeline");
  if (!useVisibility(props, milestones.length > 0)) return null;

  if (milestones.length > 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="space-y-6">
          {milestones.map((m: Record<string, string>, i: number) => (
            <div key={i} className="relative border-l-2 border-zinc-800 pl-6">
              <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full border-2 border-zinc-800 bg-zinc-950" />
              {m.imageUrl && (
                <div className="mb-2 w-full max-w-xs overflow-hidden rounded-lg border border-white/10 bg-zinc-800">
                  <CreatorImage
                    src={m.imageUrl}
                    alt={m.title || m.name || "Milestone"}
                    variant="gallery"
                    className="h-full w-full"
                  />
                </div>
              )}
              <p className="text-xs font-semibold text-s8ul-cyan">{m.year}</p>
              <p className="mt-1 text-sm font-medium text-white">{m.title || m.name}</p>
              <p className="text-xs text-zinc-500">{m.description || ""}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add milestones to your timeline" />;
}

/* ─── Social Links ─────────────────────────────────────── */

export function LinksRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const links = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Connect With Me");
  if (!useVisibility(props, links.length > 0)) return null;

  if (links.length > 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h2 className="mb-6 text-xl font-bold text-white">{title}</h2>
        <div className="space-y-3">
          {links.map((link: Record<string, string>, i: number) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-white/10 transition-colors">
              <span>{link.platform || link.label || "Link"}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add your social links" />;
}

/* ─── Footer ───────────────────────────────────────────── */

export function FooterRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const socialLinks = (p.socialLinks as Array<{ url: string; platform?: string; label?: string }>) ?? [];
  const platformLabel = (platform: string) => platform.charAt(0).toUpperCase() + platform.slice(1);
  return (
    <footer className="border-t border-white/10 py-8 text-center text-sm text-zinc-600">
      {socialLinks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          {socialLinks.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              {l.label || platformLabel(l.platform || "Link")}
            </a>
          ))}
        </div>
      )}
      {String(p.copyright || "© All rights reserved")}
    </footer>
  );
}

/* ─── Testimonials ─────────────────────────────────────── */

export function TestimonialsRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const items = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Testimonials");
  const columns = Math.min(Math.max(Number(p.columns) || 3, 1), 6);
  if (!useVisibility(props, items.length > 0)) return null;

  if (items.length > 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2" style={{ gridTemplateColumns: `repeat(${Math.min(columns, items.length)}, 1fr)` } as React.CSSProperties}>
          {items.map((item: Record<string, string>, i: number) => (
            <div key={i} className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                {item.avatarUrl ? (
                  <CreatorImage
                    src={item.avatarUrl}
                    alt={item.name || "Testimonial"}
                    variant="avatar"
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                    {(item.name || "?")[0]}
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-zinc-300">{item.name || "Anonymous"}</p>
                  {item.handle && <p className="text-[10px] text-zinc-600">{item.handle}</p>}
                </div>
              </div>
              {item.rating && Number(item.rating) > 0 && (
                <div className="mb-2 flex items-center gap-0.5">
                  {Array.from({ length: Math.min(5, Number(item.rating)) }).map((_, s) => (
                    <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
              <p className="text-xs italic text-zinc-400">{item.content || item.message || ""}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add testimonials from your fans" />;
}

/* ─── FAQ ──────────────────────────────────────────────── */

export function FaqRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const items = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "FAQ");
  if (!useVisibility(props, items.length > 0)) return null;

  if (items.length > 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="space-y-3">
          {items.map((item: Record<string, string>, i: number) => (
            <details key={i} className="group rounded-lg border border-white/10 bg-zinc-900/50">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-zinc-300">
                {item.question || item.q}
                <svg className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="border-t border-white/5 px-4 py-3 text-xs text-zinc-500">{item.answer || item.a}</div>
            </details>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add frequently asked questions" />;
}

/* ─── Contact ──────────────────────────────────────────── */

const initialContactState: ContactActionResult = { success: false };

export function ContactRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const tenantId = String(props.tenantId || "");
  const [state, action] = useFormState(submitStorefrontContact, initialContactState);

  if (state.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-white">{p.title || "Get In Touch"}</h2>
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-6">
          <p className="text-sm text-zinc-400">Thanks for reaching out! I&apos;ll get back to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h2 className="mb-2 text-center text-2xl font-bold text-white">{p.title || "Get In Touch"}</h2>
      <p className="mb-6 text-center text-sm text-zinc-500">Have a question or want to collaborate? Reach out!</p>
      <form action={async (fd) => {
        fd.set("tenantId", tenantId);
        action(fd);
      }} className="space-y-4">
        <input type="hidden" name="tenantId" value={tenantId} />
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Name</label>
          <input name="name" required maxLength={200} className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="Your name" />
          {state.fieldErrors?.name && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Email</label>
          <input name="email" type="email" required maxLength={200} className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="your@email.com" />
          {state.fieldErrors?.email && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.email[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Message</label>
          <textarea name="message" required minLength={10} maxLength={5000} rows={4} className="w-full resize-none rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder="Your message..." />
          {state.fieldErrors?.message && <p className="mt-1 text-xs text-red-400">{state.fieldErrors.message[0]}</p>}
        </div>
        {state.error && <p className="text-xs text-red-400">{state.error}</p>}
        <button type="submit" className="w-full rounded-lg bg-[var(--brand-secondary,#00f5ff)] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">Send Message</button>
      </form>
    </div>
  );
}

/* ─── Newsletter ───────────────────────────────────────── */

const initialNewsletterState: ContactActionResult = { success: false };

export function NewsletterRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const tenantId = String(props.tenantId || "");
  const [state, action] = useFormState(subscribeNewsletter, initialNewsletterState);

  if (state.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h2 className="mb-2 text-2xl font-bold text-white">{p.title || "Subscribe"}</h2>
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-6">
          <p className="text-sm text-zinc-400">You&apos;re subscribed! Stay tuned for updates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <h2 className="mb-2 text-2xl font-bold text-white">{p.title || "Subscribe"}</h2>
      <p className="mb-6 text-sm text-zinc-500">Stay updated with the latest content and announcements.</p>
      <form action={async (fd) => {
        fd.set("tenantId", tenantId);
        action(fd);
      }} className="flex gap-2">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input name="email" type="email" required className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:border-zinc-600 focus:outline-none" placeholder={p.placeholder || "Your email"} />
        <button type="submit" className="rounded-lg bg-[var(--brand-secondary,#00f5ff)] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">{p.buttonText || "Subscribe"}</button>
      </form>
      {state.error && <p className="mt-2 text-xs text-red-400">{state.error}</p>}
      {state.fieldErrors?.email && <p className="mt-2 text-xs text-red-400">{state.fieldErrors.email[0]}</p>}
    </div>
  );
}

/* ─── Pricing ──────────────────────────────────────────── */

export function PricingRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const plans = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Plans");
  if (!useVisibility(props, plans.length > 0)) return null;

  if (plans.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan: Record<string, unknown>, i: number) => {
            const isPopular = Boolean(plan.isPopular);
            return (
              <div key={i} className={`relative rounded-lg border ${isPopular ? "border-s8ul-cyan/30 bg-s8ul-cyan/5" : "border-white/10 bg-zinc-900/50"} p-6 text-center`}>
                {isPopular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-s8ul-cyan px-3 py-0.5 text-[10px] font-semibold text-black">Popular</span>}
                <p className="text-sm font-medium text-zinc-400">{String(plan.name || "")}</p>
                <p className="mt-2 text-3xl font-bold text-white">{typeof plan.price === "number" ? `₹${plan.price.toLocaleString()}` : String(plan.price || "")}</p>
                <p className="mt-1 text-xs text-zinc-500">{String(plan.description || plan.desc || "")}</p>
                {!!plan.cta && (
                  <button className={`mt-4 w-full rounded-lg ${isPopular ? "bg-s8ul-cyan text-black" : "border border-white/10 text-zinc-300"} px-4 py-2 text-sm font-semibold`}>
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

/* ─── Courses ──────────────────────────────────────────── */

export function CoursesRenderer({ props }: RendererProps) {  const p = props as Record<string, unknown>;
  const courses = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Courses");
  if (!useVisibility(props, courses.length > 0)) return null;

  if (courses.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: Record<string, unknown>, i: number) => (
            <div key={i} className="group overflow-hidden rounded-lg border border-white/10 bg-zinc-900/50 transition-colors hover:border-white/25">
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
                <p className="text-xs font-semibold text-s8ul-cyan">{(String(course.category || "")).toUpperCase() || "COURSE"}</p>
                <p className="mt-1 text-sm font-medium text-white">{String(course.title || "")}</p>
                {!!course.description && <p className="mt-1 text-xs text-zinc-500">{String(course.description)}</p>}
                {!!course.price && <p className="mt-2 text-sm font-semibold text-zinc-200">{typeof course.price === "number" ? `₹${course.price.toLocaleString()}` : String(course.price)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add your courses" />;
}

/* ─── Services ─────────────────────────────────────────── */

export function ServicesRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const services = (p.resolvedData as Record<string, unknown>[]) || [];
  const title = (p.resolvedTitle as string) || String(p.title || "Services");
  if (!useVisibility(props, services.length > 0)) return null;

  if (services.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service: Record<string, unknown>, i: number) => (
            <div key={i} className="group overflow-hidden rounded-lg border border-white/10 bg-zinc-900/50 text-center transition-colors hover:border-white/25">
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
                  <p className="text-xs font-semibold text-s8ul-cyan">{String(service.category).toUpperCase()}</p>
                )}
                <p className="mt-1 text-sm font-semibold text-white">{String(service.title || "")}</p>
                {!!service.description && <p className="mt-1 text-xs text-zinc-500">{String(service.description)}</p>}
                <p className="mt-3 text-lg font-bold text-zinc-100">
                  {typeof service.price === "number" ? `₹${service.price.toLocaleString()}` : String(service.price || "")}
                </p>
                {!!service.duration && <p className="mt-1 text-xs text-zinc-500">{String(service.duration)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add your services" />;
}

/* ─── Embed: Spotify ───────────────────────────────────── */

export function SpotifyRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const url = p.url || "";
  if (!useVisibility(props, Boolean(url))) return null;

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

/* ─── Embed: YouTube ───────────────────────────────────── */

export function YouTubeRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const url = p.url || "";
  if (!useVisibility(props, Boolean(url))) return null;

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

/* ─── Social: Discord ──────────────────────────────────── */

export function DiscordRenderer({ props }: RendererProps) {
  const p = props as Record<string, string>;
  const serverId = p.serverId || "";
  const label = p.label || "Join Discord";
  if (!useVisibility(props, Boolean(serverId))) return null;

  if (serverId) {
    const inviteUrl = p.inviteUrl || `https://discord.gg/${serverId}`;
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="rounded-lg bg-indigo-900/20 p-6">
          <p className="text-3xl">💬</p>
          <p className="mt-2 text-sm font-medium text-zinc-300">Discord Community</p>
          <p className="mt-1 text-xs text-zinc-500">Join the conversation</p>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            {label}
          </a>
        </div>
      </div>
    );
  }

  return <EmptyState label="Connect your Discord server" />;
}

/* ─── Social: Instagram ────────────────────────────────── */

export function InstagramRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const username = String(p.username || "");
  const limit = Math.min(Math.max(Number(p.limit) || 6, 1), 30);
  if (!useVisibility(props, Boolean(username))) return null;

  if (username) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="mb-4 text-center text-sm font-medium text-zinc-400">
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
            <div key={i} className="aspect-square rounded bg-gradient-to-br from-pink-900/30 to-purple-900/30 flex items-center justify-center text-xs text-zinc-600">
              📷
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[10px] text-zinc-600">
          <a href={`https://instagram.com/${username}`} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">View on Instagram</a>
        </p>
      </div>
    );
  }

  return <EmptyState label="Connect your Instagram account" />;
}

/* ─── Games ────────────────────────────────────────────── */

export function GamesRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const games = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || "Games";
  if (!useVisibility(props, games.length > 0)) return null;

  if (games.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game: Record<string, string>, i: number) => (
            <div key={i} className="rounded-lg border border-white/10 bg-zinc-900/50 p-4 text-center">
              {game.logoUrl ? (
                <div className="mx-auto mb-3 h-20 w-20">
                  <CreatorImage src={game.logoUrl} alt={game.name} variant="logo" />
                </div>
              ) : (
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800 text-2xl text-zinc-600">
                  {(game.name || "G")[0]}
                </div>
              )}
              <p className="text-sm font-medium text-white">{game.name}</p>
              {game.genre && <p className="mt-1 text-xs text-zinc-500">{game.genre}</p>}
              {game.description && <p className="mt-2 text-xs text-zinc-500">{game.description}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState label="Add your games" />;
}

/* ─── Content Feed ─────────────────────────────────────── */

export function ContentFeedRenderer({ props }: RendererProps) {
  const p = props as Record<string, unknown>;
  const items = (p.resolvedData as Record<string, string>[]) || [];
  const title = (p.resolvedTitle as string) || "Latest Content";
  if (!useVisibility(props, items.length > 0)) return null;

  if (items.length > 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-center text-2xl font-bold text-white">{title}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item: Record<string, string>, i: number) => {
            const isVideo = item.mediaType === "video";
            return (
              <a
                key={i}
                href={item.permalink || "#"}
                target={item.permalink ? "_blank" : undefined}
                rel={item.permalink ? "noopener noreferrer" : undefined}
                className="group relative overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/[0.06] transition-all hover:ring-white/20"
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
                  <div className="flex h-full items-center justify-center bg-zinc-800">
                    <span className="text-xs text-zinc-600">No media</span>
                  </div>
                )}
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-transform group-hover:scale-110">
                      <svg className="ml-0.5 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
                {item.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="line-clamp-2 text-xs leading-relaxed text-white/90">{item.caption}</p>
                  </div>
                )}
                <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
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
