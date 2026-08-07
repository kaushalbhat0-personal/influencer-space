import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrl } from "@/lib/config/platform";
import { getPublishedPageData } from "@/services/published.service";
import { mergeLiveContentWithDiagnostics } from "@/lib/storefront/live-content";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { buildRuntimeSnapshot } from "@/lib/storefront/build-snapshot";
import { BuilderService } from "@/lib/builder/builder-service";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { navigationService } from "@/lib/navigation/service";
import { DataBoundRenderer } from "@/lib/renderer/data-bound";
import { ComponentErrorBoundary } from "@/components/ui/ComponentErrorBoundary";
import { StorefrontNav } from "@/components/storefront/StorefrontNav";
import { TrustIndicators } from "@/components/storefront/TrustIndicators";
import { themeRegistry } from "@/lib/theme/registry-new";
import { experienceRegistry, ExperienceSection } from "@/modules/theme/runtime/experience";
import { traceRuntime, type AggregateTraceDiagnostics } from "@/lib/observability/runtime-trace";
import type { PublishedSnapshot } from "@/types/snapshot";
import { applyGoalSectionOrder, applyGoalNavigation, goalProfileService } from "@/modules/goals-runtime";
import { contentFromAggregate, resolveAdaptiveVisibility, baseOf } from "@/modules/experience-intelligence";
import { isFlagEnabled } from "@/lib/platform/platform-config";
import Link from "next/link";

// IMPLEMENTATION-16: no ISR/content cache on the storefront. Content is ALWAYS
// live (websiteAggregate.build on every request); a cached page would show
// stale content and diverge from the Builder. The page is dynamic.
export const dynamic = "force-dynamic";

// VALIDATION-05: React.cache memoizes the pipeline within a single render
// pass. generateMetadata + the page component otherwise each ran the full
// ~18-query aggregate build — doubling storefront DB load.
const getSnapshotData = cache(async (slug: string, preview?: boolean): Promise<{
  tenantId: string;
  snapshot: unknown | null;
  diagnostics: AggregateTraceDiagnostics;
} | null> => {
  const tenant = await prisma.tenant.findFirst({ where: { OR: [{ subdomain: slug }, { customDomain: slug }] } });
  if (!tenant) return null;

  if (preview) {
    // Preview IS the Builder Runtime full-page: Draft Layout + Live CMS
    // Content, resolved through the same LayoutEngine + registry renderers as
    // publish and the builder canvas. No preview snapshot is ever persisted.
    const website = await prisma.website.findUnique({
      where: { tenantId: tenant.id },
      select: { id: true, themePackageId: true, themeColors: true, themeFonts: true },
    });
    if (!website) return { tenantId: tenant.id, snapshot: null, diagnostics: { invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] } };

    const builderService = new BuilderService();
    const [builderPages, aggResult, navItems] = await Promise.all([
      builderService.load(website.id),
      websiteAggregateService.buildWithDiagnostics(tenant.id),
      navigationService.getOrGenerate(tenant.id),
    ]);
    if (builderPages.length === 0) {
      return {
        tenantId: tenant.id,
        snapshot: null,
        diagnostics: { invalidAssetIds: aggResult.invalidAssetIds, skippedAssets: aggResult.skippedAssets, moduleFailures: aggResult.moduleFailures },
      };
    }

    const snapshot = buildRuntimeSnapshot({
      websiteId: website.id,
      correlationId: `preview_${website.id}`,
      builderPages,
      aggregate: aggResult.aggregate,
      navItems,
      themePackageId: website.themePackageId,
      themeColors: (website.themeColors ?? {}) as Record<string, string>,
      themeFonts: (website.themeFonts ?? {}) as Record<string, string>,
    });
    return {
      tenantId: tenant.id,
      snapshot,
      diagnostics: { invalidAssetIds: aggResult.invalidAssetIds, skippedAssets: aggResult.skippedAssets, moduleFailures: aggResult.moduleFailures },
    };
  }

  const published = await getPublishedPageData(tenant.id);
  if (!published.snapshot) {
    return { tenantId: tenant.id, snapshot: null, diagnostics: { invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] } };
  }
  const { snapshot, diagnostics } = await mergeLiveContentWithDiagnostics(
    published.snapshot as unknown as Parameters<typeof layoutEngine.resolve>[0],
    tenant.id,
  );
  return { tenantId: tenant.id, snapshot, diagnostics };
});

function getCanonicalUrl(slug: string): string {
  return slug.includes(".") ? `https://${slug}` : buildStorefrontUrl(slug);
}

export async function generateMetadata({ params }: { params: { domain: string } }): Promise<Metadata> {
  const data = await getSnapshotData(params.domain);
  if (!data?.snapshot) return {};

  const doc = layoutEngine.resolve(data.snapshot as unknown as Parameters<typeof layoutEngine.resolve>[0]);
  const { metadata } = doc;

  return {
    title: metadata.title,
    description: metadata.description,
    robots: { index: true, follow: true },
    alternates: { canonical: metadata.canonicalUrl || getCanonicalUrl(params.domain) },
    openGraph: metadata.openGraph,
    twitter: metadata.twitter,
    other: {
      "application/ld+json": doc.jsonLd.map((j) => JSON.stringify(j)).join("\n"),
    },
  };
}

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: { domain: string };
  searchParams: { preview?: string };
}) {
  const isPreview = searchParams.preview === "true";
  const data = await getSnapshotData(params.domain, isPreview);
  if (!data?.snapshot) notFound();

  // VALIDATION-04: honor the `maintenanceMode` platform flag — this is the
  // first real consumer of the feature-flag store (previously cosmetic).
  if (!isPreview && (await isFlagEnabled("maintenanceMode"))) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-neutral-50">Under maintenance</h1>
          <p className="text-sm leading-relaxed text-neutral-400">
            This site is temporarily unavailable while we perform scheduled maintenance. Please check back shortly.
          </p>
        </div>
      </main>
    );
  }

  const snap = data.snapshot as unknown as PublishedSnapshot;
  const resolveStart = performance.now();
  const doc = layoutEngine.resolve(snap);
  const resolveMs = performance.now() - resolveStart;
  const { theme, jsonLd } = doc;

  // RCCF-EPIC-05: goals compose with the storefront. When the creator has set
  // a weighted goal profile, navigation and homepage sections are RE-ORDERED
  // to lead with what the creator wants to achieve. With no profile this is a
  // no-op, so existing storefronts behave exactly as before.
  const goalProfile = await goalProfileService.getProfile(data.tenantId);
  const navigation = applyGoalNavigation(doc.navigation, goalProfile);
  const pages = applyGoalSectionOrder(doc.pages, goalProfile);

  const runtimeSignature = traceRuntime({
    runtimeType: isPreview ? "preview" : process.env.NODE_ENV === "production" ? "production" : "storefront",
    creator: snap.content?.identity?.name ?? "",
    theme: snap.theme,
    layout: snap.layout,
    aggregate: snap.content,
    tenantId: data.tenantId,
    slug: params.domain,
    timings: { resolveMs, totalMs: resolveMs },
    diagnostics: data.diagnostics,
  });

  // RCCF-EPIC-08 Phase 3: adaptive visibility — conditional sections with empty
  // content are hidden when a goal profile is set ("no empty sections").
  // Without a goal profile this is a no-op, so existing storefronts are unchanged.
  const hiddenBases = new Set(resolveAdaptiveVisibility(contentFromAggregate(snap.content), !!goalProfile));
  const allSections = pages
    .flatMap((p) => p.sections)
    .filter((s) => s.visible !== false)
    .filter((s) => !hiddenBases.has(baseOf(s.moduleId) as never));

  // IMPLEMENTATION-45: resolve the theme's Experience (configuration-driven —
  // sections never hardcode backgrounds/decorations).
  const themeDef = snap.theme?.packageId ? themeRegistry.getById(snap.theme.packageId) : undefined;
  const experience = experienceRegistry.resolve({
    id: snap.theme?.packageId ?? null,
    category: themeDef?.category ?? null,
    premium: themeDef?.premium ?? null,
  });

  return (
    <>
      <SkipLink />
      <StorefrontNav sections={navigation} />
      {isPreview && (
        <div
          className="sticky top-0 z-50 bg-amber-900/80 backdrop-blur-sm text-center py-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-200"
          role="alert"
        >
          Preview Mode — changes are not public
        </div>
      )}
      <main id="main-content" className="min-h-screen bg-[var(--surface-root,#0A0A0B)] text-[var(--text-primary,#FAFAFA)] pb-20 md:pb-0" style={theme as React.CSSProperties} data-runtime-signature={runtimeSignature}>
        {jsonLd.map((ld: Record<string, unknown>, i: number) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        ))}
        {allSections.map((section, i) => {
          const isFirst = i === 0;
          const isLast = i === allSections.length - 1;
          const sectionVariant = isFirst ? "hero" as const : isLast ? "footer" as const : "default" as const;
          return (
          <ExperienceSection
            key={`${section.id}-${i}`}
            id={section.moduleId?.split(".")[0] ?? `section-${i}`}
            experience={experience}
            index={i}
            variant={sectionVariant}
            divider="bottom"
            data-testid={`experience-section-${i}`}
          >
            <ComponentErrorBoundary componentId={section.moduleId}>
              <DataBoundRenderer slot={{ moduleId: section.moduleId, config: section.config }} />
            </ComponentErrorBoundary>
          </ExperienceSection>
          );
        })}
        <TrustIndicators declaredFacts={snap.content?.declaredFacts} />
      </main>
    </>
  );
}

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-s8ul-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
    >
      Skip to main content
    </a>
  );
}
