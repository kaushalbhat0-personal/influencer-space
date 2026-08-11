/**
 * Storefront Data Loader — RCCF-IMPLEMENTATION-09B (Phase 2) + RCCF-02.
 *
 * The SINGLE snapshot loader for the public storefront. Both the homepage
 * ([domain]/page.tsx) and independent pages ([domain]/[slug]/page.tsx) consume
 * this cached pipeline.
 *
 * Published → the persisted PublishedSnapshot AS-IS. RCCF-01 bakes the full
 * WebsiteAggregate into `content`; RCCF-02 bakes the curated homepage variant,
 * storefront gates (goal profile presence, maintenance) and the capability-
 * resolved experience into the snapshot. The published storefront performs ZERO
 * business-table reads / content reconstruction / live CMS aggregation.
 * Preview (?preview=true) → Draft Layout + Live Content through the same
 * LayoutEngine + registry renderers as publish and the builder canvas.
 */

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { buildStorefrontUrl } from "@/lib/config/platform";
import { getPublishedPageData } from "@/services/published.service";
import { buildRuntimeSnapshot } from "@/lib/storefront/build-snapshot";
import { BuilderService } from "@/lib/builder/builder-service";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { navigationService } from "@/lib/navigation/service";
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

  // RCCF-02: published storefront is SNAPSHOT-ONLY. The persisted snapshot
  // carries the full aggregate (content), the curated homepage variant
  // (homepageContent), the baked storefront gates and the resolved experience.
  // No mergeLiveContent — zero business-table reads at render time.
  const published = await getPublishedPageData(tenant.id);
  if (!published.snapshot) {
    return { tenantId: tenant.id, snapshot: null, diagnostics: { invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] } };
  }
  return {
    tenantId: tenant.id,
    snapshot: published.snapshot as unknown,
    diagnostics: { invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] },
  };
});

export function getCanonicalUrl(slug: string): string {
  return slug.includes(".") ? `https://${slug}` : buildStorefrontUrl(slug);
}
