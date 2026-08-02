import { notFound } from "next/navigation";
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
import { traceRuntime, type AggregateTraceDiagnostics } from "@/lib/observability/runtime-trace";
import type { PublishedSnapshot } from "@/types/snapshot";

// IMPLEMENTATION-16: no ISR/content cache on the storefront. Content is ALWAYS
// live (websiteAggregate.build on every request); a cached page would show
// stale content and diverge from the Builder. The page is dynamic.
export const dynamic = "force-dynamic";

async function getSnapshotData(slug: string, preview?: boolean): Promise<{
  tenantId: string;
  snapshot: unknown | null;
  diagnostics: AggregateTraceDiagnostics;
} | null> {
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
}

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

  const snap = data.snapshot as unknown as PublishedSnapshot;
  const resolveStart = performance.now();
  const doc = layoutEngine.resolve(snap);
  const resolveMs = performance.now() - resolveStart;
  const { theme, navigation, jsonLd, pages } = doc;

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

  const allSections = pages.flatMap((p) => p.sections).filter((s) => s.visible !== false);

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
      <main id="main-content" className="min-h-screen text-white pb-20 md:pb-0" style={theme as React.CSSProperties} data-runtime-signature={runtimeSignature}>
        {jsonLd.map((ld: Record<string, unknown>, i: number) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        ))}
        {allSections.map((section, i) => (
          <section
            key={`${section.id}-${i}`}
            id={section.moduleId?.split(".")[0] ?? `section-${i}`}
          >
            <ComponentErrorBoundary componentId={section.moduleId}>
              <DataBoundRenderer slot={{ moduleId: section.moduleId, config: section.config }} />
            </ComponentErrorBoundary>
          </section>
        ))}
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
