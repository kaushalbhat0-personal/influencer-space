/**
 * Content Change Pipeline — single entry point for post-write cache
 * invalidation across every Creator CMS action.
 *
 * Content is LIVE: an edit is written to the database and served on the
 * next storefront request. No publish is required. This helper keeps
 * any HTTP/ISR cache in sync and is intentionally fire-and-forget.
 *
 * Deliberately does NOT call markChangesPending: the publish state tracks
 * Builder presentation sync only, and content changes never make the
 * published site stale.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";

export interface ContentChangeOptions {
  revalidateDashboard?: boolean;
}

export async function afterContentChange(
  tenantId: string,
  options?: ContentChangeOptions,
): Promise<void> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subdomain: true, customDomain: true },
    });

    const storeRoot = tenant?.customDomain ?? tenant?.subdomain;
    if (storeRoot) {
      revalidatePath(`/${storeRoot}`);
      revalidatePath(`/${storeRoot}`, "layout");
    }

    if (options?.revalidateDashboard) {
      revalidatePath("/admin/dashboard");
    }

    logger.info("afterContentChange: storefront cache invalidated", "content", {
      metadata: { tenantId, storeRoot },
    });
  } catch (error) {
    logger.warn("afterContentChange: cache invalidation skipped", "content", {
      error: error instanceof Error ? error : undefined,
    });
  }
}
