/**
 * Storefront Data Loader — RCCF-IMPLEMENTATION-09B (Phase 2).
 *
 * The SINGLE snapshot loader for the public storefront. Both the homepage
 * ([domain]/page.tsx) and independent pages ([domain]/[slug]/page.tsx) consume
 * this cached pipeline so a request never rebuilds the ~18-query aggregate
 * twice (generateMetadata + the page component share one pass via React.cache).
 *
 * Published → live snapshot with content re-hydrated from the DB.
 * Preview (?preview=true) → Draft Layout + Live Content through the same
 * LayoutEngine + registry renderers as publish and the builder canvas.
 */

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrl } from "@/lib/config/platform";
import { getPublishedPageData } from "@/services/published.service";
import { mergeLiveContentWithDiagnostics } from "@/lib/storefront/live-content";
import { buildRuntimeSnapshot } from "@/lib/storefront/build-snapshot";
import { BuilderService } from "@/lib/builder/builder-service";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { navigationService } from "@/lib/navigation/service";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import type { AggregateTraceDiagnostics } from "@/lib/observability/runtime-trace";

export { normalizePageSlug, resolvePageBySlug } from "@/lib/storefront/page-resolver";

export interface StorefrontData {
  tenantId: string;
  snapshot: unknown | null;
  diagnostics: AggregateTraceDiagnostics;
}

export interface StorefrontDataOptions {
  /** Homepage curation (Phase 3): featured-first + capped collections. */
  homepage?: boolean;
}

export const getStorefrontData = cache(async (slug: string, preview?: boolean, options?: StorefrontDataOptions): Promise<StorefrontData | null> => {
  const tenant = await prisma.tenant.findFirst({ where: { OR: [{ subdomain: slug }, { customDomain: slug }] } });
  if (!tenant) return null;

  const homepage = options?.homepage ?? false;

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
      websiteAggregateService.buildWithDiagnostics(tenant.id, { homepage }),
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
    { homepage },
  );
  return { tenantId: tenant.id, snapshot, diagnostics };
});

export function getCanonicalUrl(slug: string): string {
  return slug.includes(".") ? `https://${slug}` : buildStorefrontUrl(slug);
}
