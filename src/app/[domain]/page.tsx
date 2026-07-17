import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getPublicPageData } from "@/services/public.service";
import { HeroBanner } from "./_components/hero-banner";
import { EditableSection } from "@/components/public/EditableSection";
import { ContentFeed } from "@/components/public/ContentFeed";
import { ProductGrid } from "@/components/public/ProductGrid";
import { TimelineSection } from "@/components/public/TimelineSection";
import { GallerySection } from "@/components/public/GallerySection";
import { generateProfileJsonLd, generateProductListJsonLd } from "@/lib/json-ld";
import type { PublicPageData } from "@/services/public.service";

export const dynamic = "force-dynamic";

async function getPageData(slug: string): Promise<{ tenantId: string; data: PublicPageData; theme: { primaryColor: string; secondaryColor: string; accentColor: string; backgroundColor: string; textColor: string; fontFamily: string; borderRadius: string } | null } | null> {
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ subdomain: slug }, { customDomain: slug }],
    },
    include: { theme: true },
  });
  if (!tenant) return null;
  const data = await getPublicPageData(tenant.id);
  return { tenantId: tenant.id, data, theme: tenant.theme ?? null };
}

export async function generateMetadata({
  params,
}: {
  params: { domain: string };
}): Promise<Metadata> {
  const pageData = await getPageData(params.domain);
  if (!pageData) return {};

  const domain = params.domain;
  const { profile } = pageData.data;
  const title = profile.name
    ? `${profile.name} — CreatorStore`
    : "CreatorStore";
  const description = profile.tagline || profile.bio || "Creator profile on CreatorStore";
  const canonical = `https://${domain}`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "CreatorStore",
      type: "profile",
      ...(profile.profileImage && { images: [{ url: profile.profileImage, width: 800, height: 800 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(profile.profileImage && { images: [profile.profileImage] }),
    },
  };
}

export default async function PublicPage({
  params,
}: {
  params: { domain: string };
}) {
  const pageData = await getPageData(params.domain);
  if (!pageData) notFound();

  const { tenantId, data, theme } = pageData;
  const { profile, hero, products, links, gallery, milestones, feed } = data;
  const c = profile.colors;

  const socialUrls = [profile.social.instagram, profile.social.youtube, profile.social.twitter, profile.social.tiktok];
  const profileJsonLd = generateProfileJsonLd(profile, `https://${params.domain}`, socialUrls);
  const productListJsonLd = generateProductListJsonLd(products);

  return (
    <main
      className="min-h-screen bg-zinc-950 text-white"
      style={
        {
          "--accent": c.accent,
          "--primary": c.primary,
          "--secondary": c.secondary,
          "--brand-primary": theme?.primaryColor ?? "#2D1B69",
          "--brand-secondary": theme?.secondaryColor ?? "#00f5ff",
          "--brand-accent": theme?.accentColor ?? "#ff00e5",
          "--brand-bg": theme?.backgroundColor ?? "#09090b",
          "--brand-text": theme?.textColor ?? "#ffffff",
        } as React.CSSProperties
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
      />
      {productListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productListJsonLd) }}
        />
      )}
      {/* ─── Hero Banner ─── */}
      <HeroBanner
        videoUrl={hero.videoUrl || undefined}
        posterUrl={hero.posterUrl || undefined}
        videoDesktopAlignment={hero.videoDesktopAlignment}
        videoMobileAlignment={hero.videoMobileAlignment}
        imageDesktopAlignment={hero.imageDesktopAlignment}
        imageMobileAlignment={hero.imageMobileAlignment}
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* ─── Profile Header (overlaps banner) ─── */}
        <div className="relative z-10 -mt-16 flex flex-col items-center text-center">
          {/* ─── Live Badge ─── */}
          {hero.showLiveBadge && hero.liveBadgeText && (
            <div className="mb-4 flex items-center justify-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-sm font-semibold uppercase tracking-wider text-red-400">
                {hero.liveBadgeText}
              </span>
            </div>
          )}

          {profile.profileImage && (
            <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 ring-2 ring-white/5">
              <img
                src={profile.profileImage}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight">{profile.name}</h1>
          {profile.tagline && (
            <p className="mt-1 text-sm text-zinc-400">{profile.tagline}</p>
          )}

          {hero.subtitle && (
            <p className="mt-2 max-w-xs text-base font-semibold text-zinc-300">
              {hero.subtitle}
            </p>
          )}

          {(hero.ctaText || hero.ctaSecondaryText) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {hero.ctaText && hero.ctaLink && (
                <a
                  href={hero.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-5 py-2.5 text-sm font-semibold text-black transition-all hover:opacity-90 active:scale-95"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  {hero.ctaText}
                </a>
              )}
              {hero.ctaSecondaryText && hero.ctaSecondaryLink && (
                <a
                  href={hero.ctaSecondaryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
                >
                  {hero.ctaSecondaryText}
                </a>
              )}
            </div>
          )}

          {profile.bio && (
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-500">
              {profile.bio}
            </p>
          )}

          {/* Social links */}
          <div className="mt-4 flex items-center gap-3">
            {profile.social.instagram && (
              <a
                href={profile.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-pink-400"
                aria-label="Instagram"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}
            {profile.social.youtube && (
              <a
                href={profile.social.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400"
                aria-label="YouTube"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            )}
            {profile.social.twitter && (
              <a
                href={profile.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-zinc-900 p-2.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-sky-400"
                aria-label="Twitter"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* ─── Links Section ─── */}
        {links.length > 0 && (
          <section className="mt-8 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Links
            </h2>
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 px-5 py-3.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 hover:border-white/20 active:scale-[0.98]"
              >
                {link.imageUrl && (
                  <img
                    src={link.imageUrl}
                    alt=""
                    className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                  />
                )}
                <span className="flex-1 truncate">{link.title}</span>
                <svg
                  className="h-4 w-4 flex-shrink-0 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ))}
          </section>
        )}

        {/* ─── Products Section ─── */}
        {products.length > 0 && (
          <section className="mt-10">
            <ProductGrid
              products={products}
              tenantId={tenantId}
              themeColor={data.profile.colors.secondary}
            />
          </section>
        )}

        {/* ─── Milestones Section ─── */}
        {milestones.length > 0 && (
          <TimelineSection milestones={milestones} colors={c} />
        )}

        {/* ─── Gallery Section ─── */}
        {gallery.length > 0 && (
          <GallerySection items={gallery} />
        )}

        {/* ─── Content Feed Section ─── */}
        {feed.length > 0 && (
          <EditableSection
            className="mt-10"
            editHref="/admin/settings/content"
          >
            <ContentFeed items={feed} />
          </EditableSection>
        )}

        {/* ─── Footer ─── */}
        <footer className="mt-12 border-t border-white/5 pt-6 pb-8 text-center">
          <p className="text-xs text-zinc-700">
            Powered by{" "}
            <a
              href={process.env.NEXT_PUBLIC_APP_URL || "https://creatorshop.io"}
              target="_blank"
              rel="follow"
              className="font-semibold text-zinc-500 transition-colors hover:text-zinc-300"
            >
              CreatorStore
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
