/**
 * Live Storefront Content Composition.
 *
 * The storefront keeps Builder presentation (layout / theme / navigation /
 * sections) from the published snapshot, but reads business content LIVE
 * from the database on every request. Content edits appear instantly and
 * never require a Publish.
 *
 * If the live build fails, the snapshot's baked content is used as a
 * degraded fallback so the page never hard-fails.
 */

import type { PublishedSnapshot } from "@/types/snapshot";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { logger } from "@/lib/observability/logger";

export async function mergeLiveContent(
  snapshot: PublishedSnapshot,
  tenantId: string,
): Promise<PublishedSnapshot> {
  try {
    const content = await websiteAggregateService.build(tenantId);
    return { ...snapshot, content };
  } catch (error) {
    logger.warn("mergeLiveContent: falling back to published snapshot content", "storefront", {
      metadata: { tenantId },
      error: error instanceof Error ? error : undefined,
    });
    return snapshot;
  }
}
