import { prisma } from "@/lib/prisma";
import { publishSnapshotService } from "@/lib/publishing/snapshot";
import type { SnapshotData } from "@/lib/publishing/snapshot";

export interface PublishedPageResult {
  tenantId: string;
  websiteId: string;
  snapshot: SnapshotData | null;
  fromSnapshot: boolean;
}

export async function getPublishedPageData(tenantId: string): Promise<PublishedPageResult> {
  const website = await prisma.website.findUnique({
    where: { tenantId },
    select: { id: true },
  });

  if (!website) {
    return { tenantId, websiteId: "", snapshot: null, fromSnapshot: false };
  }

  const snapshot = await publishSnapshotService.getLive(website.id);

  if (snapshot) {
    return { tenantId, websiteId: website.id, snapshot: snapshot.data, fromSnapshot: true };
  }
  return { tenantId, websiteId: website.id, snapshot: null, fromSnapshot: false };
}
