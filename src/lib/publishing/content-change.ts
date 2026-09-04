/**
 * Content Change Pipeline — single entry point for post-write cache
 * invalidation across every Creator CMS action.
 *
 * The published storefront is SNAPSHOT-DRIVEN (RCCF-01): an edit is written to
 * the canonical content model, but the published website only changes when the
 * creator publishes. Therefore every CMS mutation that calls this helper ALSO
 * marks the publish state as pending (live → draft) so the dashboard signals
 * "Changes pending" and the creator knows to publish for the change to go live.
 *
 * Content is NOT automatically live. The contract is:
 *   CMS edit → persist → markChangesPending → publish → new PublishedSnapshot
 *
 * Cache invalidation is kept for backwards compatibility (it re-renders the
 * same snapshot); the authoritative gate is the pending flag + republish.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { publishingService } from "./service";

export interface ContentChangeOptions {
  revalidateDashboard?: boolean;
}

export async function afterContentChange(
  tenantId: string,
  options?: ContentChangeOptions,
): Promise<void> {
  let storeRoots: string[] = [];
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true, customDomain: true },
    });

    // A tenant can be reached via BOTH the subdomain and any custom domain.
    // Revalidate every route that serves the storefront so live content
    // updates appear regardless of how the fan reached the site.
    storeRoots = [tenant?.customDomain, tenant?.subdomain].filter(
      (r): r is string => Boolean(r),
    );
    for (const root of storeRoots) {
      try {
        revalidatePath(`/${root}`);
        revalidatePath(`/${root}`, "layout");
      } catch {
        // cache invalidation is best-effort; pending flag is authoritative
      }
    }

    if (options?.revalidateDashboard) {
      try {
        revalidatePath("/admin/dashboard");
      } catch {
        // best-effort
      }
    }
  } catch (error) {
    logger.warn("afterContentChange: storefront revalidation skipped", "content", {
      error: error instanceof Error ? error : undefined,
    });
  }

  try {
    // RCCF-15: the published storefront is snapshot-only, so a CMS edit does
    // not reach the live site until the creator publishes. Flip the publish
    // state to pending so the dashboard stops claiming the site is "Live".
    // Idempotent: only transitions "live" → "draft"; repeated edits while
    // already pending are no-ops.
    await publishingService.markChangesPending(tenantId);

    logger.info("afterContentChange: storefront cache invalidated", "content", {
      metadata: { tenantId, storeRoots },
    });
  } catch (error) {
    logger.warn("afterContentChange: markChangesPending failed", "content", {
      error: error instanceof Error ? error : undefined,
    });
  }
}
