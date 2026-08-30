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
import { canPreviewTenant } from "@/lib/storefront/preview-auth";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { experienceRegistry, applyExperienceOverride, resolveExperienceForCapabilities } from "@/modules/theme/runtime/experience";
import { renderableNavBases, reconcileNavigation } from "@/lib/navigation/reconcile";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import type { AggregateTraceDiagnostics } from "@/lib/observability/runtime-trace";

export { normalizePageSlug, resolvePageBySlug } from "@/lib/storefront/page-resolver";

export interface StorefrontData {
  tenantId: string;
  snapshot: unknown | null;
  diagnostics: AggregateTraceDiagnostics;
  /**
   * RCCF-72.9 — whether the `?preview=true` request was actually authorized for
   * this tenant. Consumers must render the preview chrome ONLY when this is true;
   * anonymous/wrong-tenant requests receive the published snapshot and this flag
   * is false (the request degrades to the public storefront).
   */
  previewAuthorized: boolean;
}

export interface StorefrontDataOptions {
  /** Homepage curation (Phase 3): featured-first + capped collections. */
  homepage?: boolean;
}

export const getStorefrontData = cache(async (slug: string, preview?: boolean, options?: StorefrontDataOptions): Promise<StorefrontData | null> => {
  const tenant = await prisma.tenant.findFirst({ where: { OR: [{ subdomain: slug }, { customDomain: slug }] } });
  if (!tenant) return null;

  const homepage = options?.homepage ?? false;

  if (preview && (await canPreviewTenant(tenant.id))) {
    // Preview IS the Builder Runtime full-page: Draft Layout + Live CMS
    // Content, resolved through the same LayoutEngine + registry renderers as
    // publish and the builder canvas. No preview snapshot is ever persisted.
    // RCCF-72.9: gated on tenant ownership — anonymous/wrong-tenant requests
    // fall through to the public published snapshot below (never draft).
    const website = await prisma.website.findUnique({
      where: { tenantId: tenant.id },
      select: { id: true, themePackageId: true, themeColors: true, themeFonts: true, themeConfig: true },
    });
    if (!website) return { tenantId: tenant.id, snapshot: null, previewAuthorized: true, diagnostics: { invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] } };

    const builderService = new BuilderService();
    const [builderPages, aggResult, persistedNav] = await Promise.all([
      builderService.load(website.id),
      websiteAggregateService.buildWithDiagnostics(tenant.id, { homepage }),
      navigationService.get(tenant.id),
    ]);
    if (builderPages.length === 0) {
      return {
        tenantId: tenant.id,
        snapshot: null,
        previewAuthorized: true,
        diagnostics: { invalidAssetIds: aggResult.invalidAssetIds, skippedAssets: aggResult.skippedAssets, moduleFailures: aggResult.moduleFailures },
      };
    }

    // RCCF-71.2: canonical experience resolution chain — same order as
    // publishing (service.ts:219-234) and builder canvas (interactive-canvas.tsx:240-250).
    // 1) Resolve base experience from theme package
    const { themeRegistry } = await import("@/lib/theme/registry-new");
    const themeDef = website.themePackageId ? themeRegistry.getById(website.themePackageId) : undefined;
    const experienceBase = experienceRegistry.resolve({
      id: website.themePackageId ?? null,
      category: themeDef?.category ?? null,
      premium: themeDef?.premium ?? null,
    });

    // 2) Apply experience overrides from Website.themeConfig (persisted creator configs)
    const overridden = applyExperienceOverride(
      experienceBase,
      (website.themeConfig ?? {}) as Record<string, string>,
    );

    // 3) Resolve capability filtering using the active plan (server-authoritative)
    const activePlan = await resolveActivePlan(undefined, tenant.id);
    const experience = resolveExperienceForCapabilities(
      overridden,
      activePlan.code ?? null,
    );

    // RCCF-08: preview navigation parity — derive the renderable section graph
    // from the SAME pipeline the published storefront uses (buildRuntimeSnapshot
    // → layoutEngine.resolve → renderableNavBases) and reconcile IN-MEMORY.
    // This is the identical logic to publishing/service.ts reconcileForPublish,
    // but WITHOUT persistence (preview GET is side-effect free). Manual overrides
    // survive per reconcileNavigation contract; generated anchors for non-rendering
    // sections are dropped, newly renderable sections gain anchors.
    // No second registry, no template nav, no Hero/Footer derivation.
    const { goalProfileService } = await import("@/modules/goals-runtime");
    const goalProfilePresent = !!(await goalProfileService.getProfile(tenant.id));

    // Need a snapshot with the persisted nav to resolve the document and derive
    // the graph (same snapshot shape publish uses before reconciliation).
    const draftSnapshotForGraph = buildRuntimeSnapshot({
      websiteId: website.id,
      correlationId: `preview_graph_${website.id}`,
      builderPages,
      aggregate: aggResult.aggregate,
      navItems: persistedNav,
      themePackageId: website.themePackageId,
      themeColors: (website.themeColors ?? {}) as Record<string, string>,
      themeFonts: (website.themeFonts ?? {}) as Record<string, string>,
      themeConfig: (website.themeConfig ?? {}) as Record<string, string>,
      experience,
    });
    const doc = layoutEngine.resolve({ ...draftSnapshotForGraph, content: aggResult.aggregate });
    const home = doc.pages.find((p) => p.isHome) ?? doc.pages[0];
    const graphBases = renderableNavBases(home?.sections ?? [], aggResult.aggregate, goalProfilePresent);
    // Pure in-memory reconciliation — side-effect free, no persistence.
    const previewNav = reconcileNavigation(persistedNav, graphBases);

    const snapshot = buildRuntimeSnapshot({
      websiteId: website.id,
      correlationId: `preview_${website.id}`,
      builderPages,
      aggregate: aggResult.aggregate,
      navItems: previewNav,
      themePackageId: website.themePackageId,
      themeColors: (website.themeColors ?? {}) as Record<string, string>,
      themeFonts: (website.themeFonts ?? {}) as Record<string, string>,
      themeConfig: (website.themeConfig ?? {}) as Record<string, string>,
      experience,
    });
    return {
      tenantId: tenant.id,
      snapshot,
      previewAuthorized: true,
      diagnostics: { invalidAssetIds: aggResult.invalidAssetIds, skippedAssets: aggResult.skippedAssets, moduleFailures: aggResult.moduleFailures },
    };
  }

  // RCCF-02: published storefront is SNAPSHOT-ONLY. The persisted snapshot
  // carries the full aggregate (content), the curated homepage variant
  // (homepageContent), the baked storefront gates and the resolved experience.
  // No mergeLiveContent — zero business-table reads at render time.
  const published = await getPublishedPageData(tenant.id);
  if (!published.snapshot) {
    return { tenantId: tenant.id, snapshot: null, previewAuthorized: false, diagnostics: { invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] } };
  }
  return {
    tenantId: tenant.id,
    snapshot: published.snapshot as unknown,
    previewAuthorized: false,
    diagnostics: { invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] },
  };
});

export function getCanonicalUrl(slug: string): string {
  return slug.includes(".") ? `https://${slug}` : buildStorefrontUrl(slug);
}
