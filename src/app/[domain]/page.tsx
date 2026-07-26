/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrl } from "@/lib/config/platform";
import { getPublishedPageData, extractSeoFromPages } from "@/services/published.service";
import { buildStorefrontMetadata, buildStorefrontJsonLd } from "@/lib/storefront/metadata";
import { DataBoundRenderer } from "@/lib/renderer/data-bound";
import { ComponentErrorBoundary } from "@/components/ui/ComponentErrorBoundary";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StorefrontNav, NAV_ICONS } from "@/components/storefront/StorefrontNav";

export const revalidate = 60;

async function getPageData(slug: string) {
  const tenant = await prisma.tenant.findFirst({ where: { OR: [{ subdomain: slug }, { customDomain: slug }] } });
  if (!tenant) {
    console.log(`[storefront] Tenant not found for slug=${slug}`);
    return null;
  }
  const published = await getPublishedPageData(tenant.id);
  return { tenantId: published.tenantId, snapshot: published.snapshot, legacy: published.legacy, fromSnapshot: published.fromSnapshot };
}

function getCanonicalUrl(slug: string): string {
  return slug.includes(".") ? `https://${slug}` : buildStorefrontUrl(slug);
}

function extractTheme(snapshot: any, legacy: any, niche: string): Record<string, string> {
  const artifactTheme = snapshot?.theme;
  if (artifactTheme?.primary) {
    return {
      "--brand-primary": artifactTheme.primary,
      "--brand-secondary": artifactTheme.secondary ?? artifactTheme.primary,
      "--brand-accent": artifactTheme.accent ?? artifactTheme.secondary ?? artifactTheme.primary,
      "--surface-root": artifactTheme.mode === "dark" ? "#0F172A" : "#FFFFFF",
      "--surface-base": artifactTheme.mode === "dark" ? "#1E293B" : "#F8FAFC",
      "--text-primary": artifactTheme.mode === "dark" ? "#F8FAFC" : "#0F172A",
      "--text-secondary": artifactTheme.mode === "dark" ? "#94A3B8" : "#64748B",
    };
  }

  const nicheThemes: Record<string, Record<string, string>> = {
    gaming: { "--brand-primary": "#7C3AED", "--brand-secondary": "#10B981", "--brand-accent": "#F43F5E" },
    music: { "--brand-primary": "#EC4899", "--brand-secondary": "#8B5CF6", "--brand-accent": "#F59E0B" },
    technology: { "--brand-primary": "#2563EB", "--brand-secondary": "#06B6D4", "--brand-accent": "#10B981" },
    fitness: { "--brand-primary": "#EF4444", "--brand-secondary": "#F97316", "--brand-accent": "#22C55E" },
    education: { "--brand-primary": "#0EA5E9", "--brand-secondary": "#6366F1", "--brand-accent": "#14B8A6" },
    photography: { "--brand-primary": "#18181B", "--brand-secondary": "#71717A", "--brand-accent": "#F43F5E" },
    fashion: { "--brand-primary": "#D946EF", "--brand-secondary": "#FB923C", "--brand-accent": "#FACC15" },
    food: { "--brand-primary": "#EA580C", "--brand-secondary": "#F59E0B", "--brand-accent": "#22C55E" },
    travel: { "--brand-primary": "#0284C7", "--brand-secondary": "#0EA5E9", "--brand-accent": "#F97316" },
    art: { "--brand-primary": "#8B5CF6", "--brand-secondary": "#EC4899", "--brand-accent": "#10B981" },
  };
  const nicheTheme = nicheThemes[niche.toLowerCase()] ?? { "--brand-primary": "#6366F1", "--brand-secondary": "#8B5CF6", "--brand-accent": "#10B981" };

  return {
    "--brand-primary": nicheTheme["--brand-primary"] ?? "#6366F1",
    "--brand-secondary": nicheTheme["--brand-secondary"] ?? "#818CF8",
    "--brand-accent": nicheTheme["--brand-accent"] ?? "#A5B4FC",
    "--surface-root": "#09090b",
    "--surface-base": "#18181b",
    "--text-primary": "#fafafa",
    "--text-secondary": "#a1a1aa",
  };
}

function extractSlots(snapshot: any): Array<{ id: string; moduleId: string; config: Record<string, unknown> }> {
  if (!snapshot) return [];

  const isArtifact = "sections" in snapshot && Array.isArray(snapshot.sections) && snapshot.sections.length > 0 && !("themePackageId" in snapshot);

  if (isArtifact) {
    return (snapshot.sections as any[])
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((s: any) => ({ id: s.id, moduleId: s.type, config: s.props ?? {} }));
  }

  if (snapshot.pages) {
    const homePage = snapshot.pages.find((p: any) => p.isHome) || snapshot.pages[0];
    const sections = homePage?.sections || [];
    return sections.flatMap((sec: any) =>
      (sec.slots ?? []).map((slot: any) => ({ ...slot, sectionOrder: sec.order }))
    ).sort((a: any, b: any) => (a.sectionOrder ?? 0) - (b.sectionOrder ?? 0) || (a.order ?? 0) - (b.order ?? 0))
    .map((s: any) => ({ id: s.id, moduleId: s.moduleId, config: s.config }));
  }

  return [];
}

export async function generateMetadata({ params }: { params: { domain: string } }): Promise<Metadata> {
  const pd = await getPageData(params.domain);
  if (!pd) return {};
  const canonicalUrl = getCanonicalUrl(params.domain);
  if (pd.fromSnapshot && pd.snapshot) {
    const seo = extractSeoFromPages(pd.snapshot);
    return {
      title: seo.title, description: seo.description,
      robots: { index: true, follow: true }, alternates: { canonical: canonicalUrl },
      openGraph: { title: seo.title, description: seo.description, url: canonicalUrl, siteName: "CreatorStore", type: "profile" },
      twitter: { card: "summary_large_image", title: seo.title, description: seo.description },
    };
  }
  return buildStorefrontMetadata(pd.legacy, canonicalUrl);
}

export default async function PublicPage({ params }: { params: { domain: string } }) {
  let pd;
  try {
    pd = await getPageData(params.domain);
  } catch (error) {
    console.error(`[storefront] Failed to resolve page data for domain=${params.domain}`, error);
    throw error;
  }
  if (!pd) notFound();

  const { tenantId, snapshot, legacy } = pd;
  const canonicalUrl = getCanonicalUrl(params.domain);
  const { profileLd, productListLd } = buildStorefrontJsonLd(legacy, canonicalUrl);
  const profileMeta = (legacy.profile ?? {}) as unknown as Record<string, string>;
  const niche = profileMeta.niche ?? "";

  const slots = extractSlots(snapshot);
  const themeStyle = extractTheme(snapshot, legacy, niche);

  const hasProducts = legacy.products.length > 0;
  const hasGallery = legacy.gallery.length > 0;
  const hasFeed = legacy.feed.length > 0;
  const hasMilestones = legacy.milestones.length > 0;
  const hasGames = legacy.games.length > 0;

  const sectionDefs = [
    { id: "hero", label: "Home", exists: true },
    ...(hasProducts ? [{ id: "products", label: "Products", exists: true }] : []),
    ...(hasGallery ? [{ id: "gallery", label: "Gallery", exists: true }] : []),
    ...(hasFeed ? [{ id: "feed", label: "Content", exists: true }] : []),
    ...(hasMilestones ? [{ id: "milestones", label: "Timeline", exists: true }] : []),
    ...(hasGames ? [{ id: "games", label: "Games", exists: true }] : []),
  ];

  return (
    <main className="min-h-screen text-white pb-20 md:pb-0" style={themeStyle as React.CSSProperties}>
      <StorefrontNav sections={sectionDefs.map((s) => ({ id: s.id, label: s.label, exists: s.exists, icon: NAV_ICONS[s.id] }))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profileLd) }} />
      {productListLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productListLd) }} />}
      <div className="mx-auto max-w-2xl px-4 pt-4">
        {slots.length > 0 ? slots.map((slot, i) => (
          <ComponentErrorBoundary key={`${slot.id}-${i}`} componentId={slot.moduleId}>
            <DataBoundRenderer slot={{ moduleId: slot.moduleId, config: slot.config }} tenantId={tenantId} />
          </ComponentErrorBoundary>
        )) : (
          <Suspense fallback={<div className="py-8 flex justify-center"><LoadingSpinner size="sm" /></div>}>
            <FallbackStorefront legacy={legacy} tenantId={tenantId} />
          </Suspense>
        )}
      </div>
    </main>
  );
}

async function FallbackStorefront({ legacy, tenantId }: {
  legacy: any; tenantId: string;
}) {
  const sectionsModule = await import("@/lib/storefront/sections").catch(() => null);
  const storefrontModule = await import("@/lib/storefront").catch(() => null);
  const registerDefaultSections = sectionsModule?.registerDefaultSections ?? (() => {});
  const sectionRegistry = storefrontModule?.sectionRegistry ?? null;
  if (registerDefaultSections) registerDefaultSections();

  return (
    <>
      {(sectionRegistry?.getAll() ?? []).filter((s: any) => s.type !== "hero" && s.type !== "footer").map((section: any) => section.isVisible(legacy) ? (
        <Suspense key={section.type} fallback={<div className="py-8 flex justify-center"><LoadingSpinner size="sm" /></div>}>
          {section.render(legacy, tenantId)}
        </Suspense>
      ) : null)}
    </>
  );
}
