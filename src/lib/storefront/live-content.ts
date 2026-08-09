/**
 * Live Storefront Content Composition.
 *
 * The storefront keeps Builder presentation (layout / theme / navigation /
 * sections) from the published snapshot, but reads business content LIVE
 * from the database on every request. Content edits appear instantly and
 * never require a Publish.
 *
 * The aggregate is built with diagnostics (per-module isolation) so a single
 * broken module degrades gracefully instead of hard-failing the page, and the
 * trace reports exactly which module/asset failed.
 */

import type { PublishedSnapshot } from "@/types/snapshot";
import { websiteAggregateService, type AggregateBuildOptions } from "@/modules/tenant/application/website-aggregate.service";
import { logger } from "@/lib/observability/logger";
import type { AggregateTraceDiagnostics } from "@/lib/observability/runtime-trace";

export async function mergeLiveContent(
  snapshot: PublishedSnapshot,
  tenantId: string,
  options?: AggregateBuildOptions,
): Promise<PublishedSnapshot> {
  return (await mergeLiveContentWithDiagnostics(snapshot, tenantId, options)).snapshot;
}

export async function mergeLiveContentWithDiagnostics(
  snapshot: PublishedSnapshot,
  tenantId: string,
  options?: AggregateBuildOptions,
): Promise<{ snapshot: PublishedSnapshot; diagnostics: AggregateTraceDiagnostics }> {
  try {
    const { aggregate, invalidAssetIds, skippedAssets, moduleFailures } =
      await websiteAggregateService.buildWithDiagnostics(tenantId, options);
    return {
      snapshot: { ...snapshot, content: aggregate },
      diagnostics: { invalidAssetIds, skippedAssets, moduleFailures },
    };
  } catch (error) {
    logger.warn("mergeLiveContent: falling back to published snapshot content", "storefront", {
      metadata: { tenantId },
      error: error instanceof Error ? error : undefined,
    });
    return {
      snapshot,
      diagnostics: {
        invalidAssetIds: [],
        skippedAssets: 0,
        moduleFailures: [`mergeLiveContent: ${error instanceof Error ? error.message : String(error)}`],
      },
    };
  }
}
