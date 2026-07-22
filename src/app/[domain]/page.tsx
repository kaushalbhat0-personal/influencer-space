import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getPublicPageData } from "@/services/public.service";
import { themeAdapter } from "@/lib/compatibility";
import { buildStorefrontMetadata, buildStorefrontJsonLd } from "@/lib/storefront/metadata";
import { buildStorefrontUrl } from "@/lib/config/platform";
import { sectionRegistry } from "@/lib/storefront";
import { HeroBanner } from "./_components/hero-banner";
import { ContentFeed } from "@/components/public/ContentFeed";
import { ProductGrid } from "@/components/public/ProductGrid";
import { TimelineSection } from "@/components/public/TimelineSection";
import { GallerySection } from "@/components/public/GallerySection";
import { EditableSection } from "@/components/public/EditableSection";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { PublicPageData } from "@/services/public.service";

registerSections();

function registerSections() {
  if (sectionRegistry.size > 0) return; // idempotent

  sectionRegistry.register({
    type: "hero", name: "Hero Banner", priority: 1,
    isVisible: () => true,
    render: (d) => <HeroBanner videoUrl={d.hero.videoUrl || undefined} posterUrl={d.hero.posterUrl || undefined} videoDesktopAlignment={d.hero.videoDesktopAlignment} videoMobileAlignment={d.hero.videoMobileAlignment} imageDesktopAlignment={d.hero.imageDesktopAlignment} imageMobileAlignment={d.hero.imageMobileAlignment} />,
  });

  sectionRegistry.register({
    type: "links", name: "Affiliate Links", priority: 3,
    isVisible: (d) => d.links.length > 0,
    render: (d) => (
      <section className="mt-8 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Links</h2>
        {d.links.map((link) => (
          <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 px-5 py-3.5 text-sm font-medium text-white transition-all hover:bg-zinc-800 hover:border-white/20">
            {link.imageUrl && <img src={link.imageUrl} alt="" className="h-6 w-6 flex-shrink-0 rounded-full object-cover" />}
            <span className="flex-1 truncate">{link.title}</span>
          </a>
        ))}
      </section>
    ),
  });

  sectionRegistry.register({
    type: "products", name: "Product Grid", priority: 4,
    isVisible: (d) => d.products.length > 0,
    render: (d) => (<section className="mt-10"><ProductGrid products={d.products} themeColor="var(--secondary)" /></section>),
  });

  sectionRegistry.register({
    type: "timeline", name: "Career Timeline", priority: 5,
    isVisible: (d) => d.milestones.length > 0,
    render: (d) => <TimelineSection milestones={d.milestones} colors={{ primary: "var(--primary)", secondary: "var(--secondary)", accent: "var(--accent)" }} />,
  });

  sectionRegistry.register({
    type: "gallery", name: "Media Gallery", priority: 6,
    isVisible: (d) => d.gallery.length > 0,
    render: (d) => <GallerySection items={d.gallery} />,
  });

  sectionRegistry.register({
    type: "content-feed", name: "Social Content Feed", priority: 7,
    isVisible: (d) => d.feed.length > 0,
    render: (d) => (<EditableSection className="mt-10" editHref="/admin/settings/content"><ContentFeed items={d.feed} /></EditableSection>),
  });

  sectionRegistry.register({
    type: "footer", name: "Storefront Footer", priority: 99,
    isVisible: () => true,
    render: () => (
      <footer className="mt-12 border-t border-white/5 pt-6 pb-8 text-center">
        <p className="text-xs text-zinc-700">Powered by <a href={process.env.NEXT_PUBLIC_APP_URL || "https://influencer-space-alpha.vercel.app"} target="_blank" rel="follow" className="font-semibold text-zinc-500 transition-colors hover:text-zinc-300">CreatorStore</a></p>
      </footer>
    ),
  });
}

export const dynamic = "force-dynamic";

async function getPageData(slug: string): Promise<{ tenantId: string; data: PublicPageData } | null> {
  const tenant = await prisma.tenant.findFirst({ where: { OR: [{ subdomain: slug }, { customDomain: slug }] } });
  if (!tenant) return null;
  return { tenantId: tenant.id, data: await getPublicPageData(tenant.id) };
}

function getCanonicalUrl(slug: string): string {
  return slug.includes(".") ? `https://${slug}` : buildStorefrontUrl(slug);
}

export async function generateMetadata({ params }: { params: { domain: string } }): Promise<Metadata> {
  const pd = await getPageData(params.domain);
  if (!pd) return {};
  return buildStorefrontMetadata(pd.data, getCanonicalUrl(params.domain));
}

export default async function PublicPage({ params }: { params: { domain: string } }) {
  const pd = await getPageData(params.domain);
  if (!pd) notFound();

  const { tenantId, data } = pd;
  const { profile, hero } = data;
  const colors = themeAdapter.getColors();
  const canonicalUrl = getCanonicalUrl(params.domain);
  const { profileLd, productListLd } = buildStorefrontJsonLd(data, canonicalUrl);

  return (
    <main className="min-h-screen bg-zinc-950 text-white" style={{ "--accent": colors.accent, "--primary": colors.primary, "--secondary": colors.secondary, "--brand-primary": colors.primary, "--brand-secondary": colors.secondary, "--brand-accent": colors.accent, "--brand-bg": colors.background, "--brand-text": colors.text } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profileLd) }} />
      {productListLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productListLd) }} />}

      <div className="mx-auto max-w-2xl px-4">
        {/* Hero */}
        <Suspense fallback={<div className="py-12"><LoadingSpinner size="sm" /></div>}>
          {sectionRegistry.get("hero")?.render(data, tenantId)}
        </Suspense>

        {/* Profile (inline — uses social SVG icons) */}
        <div className="relative z-10 -mt-16 flex flex-col items-center text-center">
          {hero.showLiveBadge && hero.liveBadgeText && (
            <div className="mb-4 flex items-center justify-center gap-2">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>
              <span className="text-sm font-semibold uppercase tracking-wider text-red-400">{hero.liveBadgeText}</span>
            </div>
          )}
          {profile.profileImage && <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 ring-2 ring-white/5"><img src={profile.profileImage} alt={profile.name} className="h-full w-full object-cover" /></div>}
          <h1 className="text-xl font-bold tracking-tight">{profile.name}</h1>
          {profile.tagline && <p className="mt-1 text-sm text-zinc-400">{profile.tagline}</p>}
          {hero.subtitle && <p className="mt-2 max-w-xs text-base font-semibold text-zinc-300">{hero.subtitle}</p>}
          {(hero.ctaText || hero.ctaSecondaryText) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {hero.ctaText && hero.ctaLink && <a href={hero.ctaLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[var(--secondary)] px-5 py-2.5 text-sm font-semibold text-black transition-all hover:opacity-90">{hero.ctaText}</a>}
              {hero.ctaSecondaryText && hero.ctaSecondaryLink && <a href={hero.ctaSecondaryLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10">{hero.ctaSecondaryText}</a>}
            </div>
          )}
          {profile.bio && <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-500">{profile.bio}</p>}
        </div>

        {/* Sections from registry (skip hero, profile, footer) */}
        {sectionRegistry.getAll().filter((s) => s.type !== "hero" && s.type !== "footer" && s.isVisible(data)).map((section) => (
          <Suspense key={section.type} fallback={<div className="py-8 flex justify-center"><LoadingSpinner size="sm" /></div>}>
            {section.render(data, tenantId)}
          </Suspense>
        ))}

        {/* Footer */}
        {sectionRegistry.get("footer")?.render(data, tenantId)}
      </div>
    </main>
  );
}
