import { prisma } from "@/lib/prisma";
import { publishSnapshotService } from "@/lib/publishing/snapshot";
import type { SnapshotData } from "@/lib/publishing/snapshot";

export interface PublishedPageResult {
  tenantId: string;
  websiteId: string;
  snapshot: SnapshotData | null;
  fromSnapshot: boolean;
  isPreview: boolean;
}

export async function getPublishedPageData(
  tenantId: string,
  mode?: "live" | "preview",
): Promise<PublishedPageResult> {
  const website = await prisma.website.findUnique({
    where: { tenantId },
    select: { id: true },
  });

  if (!website) {
    return { tenantId, websiteId: "", snapshot: null, fromSnapshot: false, isPreview: false };
  }

  const snapshot = mode === "preview"
    ? await publishSnapshotService.getPreview(website.id)
    : await publishSnapshotService.getLive(website.id);

  if (snapshot) {
    return { tenantId, websiteId: website.id, snapshot: snapshot.data, fromSnapshot: true, isPreview: mode === "preview" };
  }
  return { tenantId, websiteId: website.id, snapshot: null, fromSnapshot: false, isPreview: false };
}
