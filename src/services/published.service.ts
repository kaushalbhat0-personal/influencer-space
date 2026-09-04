import { prisma } from "@/lib/prisma";
import { publishSnapshotService } from "@/lib/publishing/snapshot";
import type { SnapshotData } from "@/lib/publishing/snapshot";

function getUnstableCache(): typeof import("next/cache").unstable_cache | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("next/cache") as { unstable_cache?: typeof import("next/cache").unstable_cache };
    return typeof mod.unstable_cache === "function" ? mod.unstable_cache : null;
  } catch {
    return null;
  }
}

export interface PublishedPageResult {
  tenantId: string;
  websiteId: string;
  snapshot: SnapshotData | null;
  fromSnapshot: boolean;
}

export async function getPublishedPageData(
  tenantId: string,
): Promise<PublishedPageResult> {
  const website = await prisma.website.findUnique({
    where: { tenantId },
    select: { id: true },
  });

  if (!website) {
    return { tenantId, websiteId: "", snapshot: null, fromSnapshot: false };
  }

  // P2: persistent cache for immutable live snapshot — tags allow precise invalidation on publish
  const snapshot = await publishSnapshotService.getLiveCached(website.id, tenantId).catch(() => publishSnapshotService.getLive(website.id));

  if (snapshot) {
    return { tenantId, websiteId: website.id, snapshot: snapshot.data, fromSnapshot: true };
  }
  return { tenantId, websiteId: website.id, snapshot: null, fromSnapshot: false };
}
