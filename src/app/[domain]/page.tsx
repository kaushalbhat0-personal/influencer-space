import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrl } from "@/lib/config/platform";
import { themeService } from "@/lib/theme/service";
import { getPublishedPageData, extractSeoFromPages } from "@/services/published.service";
import { buildStorefrontMetadata, buildStorefrontJsonLd } from "@/lib/storefront/metadata";
import { ComponentRenderer } from "@/lib/renderer";
import { HeroBanner } from "./_components/hero-banner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export const dynamic = "force-dynamic";

async function getPageData(slug: string) {
  const tenant = await prisma.tenant.findFirst({ where: { OR: [{ subdomain: slug }, { customDomain: slug }] } });
  if (!tenant) return null;
  const published = await getPublishedPageData(tenant.id);
  return { tenantId: published.tenantId, snapshot: published.snapshot, legacy: published.legacy, fromSnapshot: published.fromSnapshot };
}

function getCanonicalUrl(slug: string): string {
  return slug.includes(".") ? `https://${slug}` : buildStorefrontUrl(slug);
}

export async function generateMetadata({ params }: { params: { domain: string } }): Promise<Metadata> {
  const pd = await getPageData(params.domain);
  if (!pd) return {};

  const canonicalUrl = getCanonicalUrl(params.domain);

  if (pd.fromSnapshot && pd.snapshot) {
    const seo = extractSeoFromPages(pd.snapshot.pages);
    return {
      title: seo.title, description: seo.description, robots: { index: true, follow: true },
      alternates: { canonical: canonicalUrl },
      openGraph: { title: seo.title, description: seo.description, url: canonicalUrl, siteName: "CreatorStore", type: "profile" },
      twitter: { card: "summary_large_image", title: seo.title, description: seo.description },
    };
  }

  return buildStorefrontMetadata(pd.legacy, canonicalUrl);
}

export default async function PublicPage({ params }: { params: { domain: string } }) {
  const pd = await getPageData(params.domain);
  if (!pd) notFound();

  const { tenantId, legacy } = pd;
  const canonicalUrl = getCanonicalUrl(params.domain);
  const { profileLd, productListLd } = buildStorefrontJsonLd(legacy, canonicalUrl);

  const website = await prisma.website.findUnique({ where: { tenantId } });
  const resolvedTheme = website ? await themeService.getResolved(website) : themeService.getPreset("neon-dark")!;
  const themeStyle = resolvedTheme ? themeService.toStyle(resolvedTheme) : {};

  // ── PUBLISHED SNAPSHOT PATH (authoritative) ──────────────
  if (pd.fromSnapshot && pd.snapshot) {
    const homePage = pd.snapshot.pages.find((p) => p.isHome) || pd.snapshot.pages[0];
    const sections = homePage?.sections || [];
    const allSlots = sections.flatMap((sec) =>
      sec.slots.map((slot) => ({ ...slot, sectionOrder: sec.order }))
    ).sort((a, b) => a.sectionOrder - b.sectionOrder || a.order - b.order);

    return (
      <main className="min-h-screen bg-zinc-950 text-white" style={themeStyle as React.CSSProperties}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profileLd) }} />
        {productListLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productListLd) }} />}
        <div className="mx-auto max-w-2xl px-4">
          {allSlots.map((slot, i) => (
            <ComponentRenderer key={`${slot.id}-${i}`} componentId={slot.moduleId} props={slot.config} />
          ))}
        </div>
      </main>
    );
  }

  // ── LEGACY FALLBACK (no published snapshot) ──────────────
  const { profile, hero } = legacy;
  const sectionRegistry = (await import("@/lib/storefront")).sectionRegistry;

  if (sectionRegistry.size === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dAny = (d: any) => d;
    sectionRegistry.register({
      type: "hero", name: "Hero", priority: 1, isVisible: () => true,
      render: (d) => { const h = dAny(d).hero; return <HeroBanner videoUrl={h.videoUrl || undefined} posterUrl={h.posterUrl || undefined} videoDesktopAlignment={h.videoDesktopAlignment} videoMobileAlignment={h.videoMobileAlignment} imageDesktopAlignment={h.imageDesktopAlignment} imageMobileAlignment={h.imageMobileAlignment} />; },
    });
    sectionRegistry.register({
      type: "footer", name: "Footer", priority: 99, isVisible: () => true,
      render: () => (<footer className="mt-12 border-t border-white/5 pt-6 pb-8 text-center"><p className="text-xs text-zinc-700">Powered by <a href={process.env.NEXT_PUBLIC_APP_URL || "https://influencer-space-alpha.vercel.app"} target="_blank" rel="follow" className="font-semibold text-zinc-500 transition-colors hover:text-zinc-300">CreatorStore</a></p></footer>),
    });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white" style={themeStyle as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profileLd) }} />
      {productListLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productListLd) }} />}
      <div className="mx-auto max-w-2xl px-4">
        <Suspense fallback={<div className="py-12"><LoadingSpinner size="sm" /></div>}>
          {sectionRegistry.get("hero")?.render(legacy, tenantId)}
        </Suspense>
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
        {sectionRegistry.getAll().filter((s) => s.type !== "hero" && s.type !== "footer" && s.isVisible(legacy)).map((section) => (
          <Suspense key={section.type} fallback={<div className="py-8 flex justify-center"><LoadingSpinner size="sm" /></div>}>
            {section.render(legacy, tenantId)}
          </Suspense>
        ))}
        {sectionRegistry.get("footer")?.render(legacy, tenantId)}
      </div>
    </main>
  );
}
