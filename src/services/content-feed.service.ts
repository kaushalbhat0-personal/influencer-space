import { prisma } from "@/lib/prisma";

export type FeedItemRow = {
  id: string;
  platform: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  permalink: string | null;
  pinned: boolean;
  hidden: boolean;
  externalId: string | null;
  order: number;
  syncedAt: Date;
  createdAt: Date;
};

export async function getAllContentFeedItems(
  tenantId: string,
): Promise<FeedItemRow[]> {
  return prisma.contentFeedItem.findMany({
    where: { tenantId },
    orderBy: [{ pinned: "desc" }, { order: "asc" }, { createdAt: "desc" }],
  });
}

export async function togglePin(
  id: string,
  tenantId: string,
): Promise<void> {
  const item = await prisma.contentFeedItem.findFirst({
    where: { id, tenantId },
    select: { pinned: true },
  });
  if (!item) throw new Error("Content item not found");

  await prisma.contentFeedItem.update({
    where: { id },
    data: { pinned: !item.pinned },
  });
}

export async function toggleHide(
  id: string,
  tenantId: string,
): Promise<void> {
  const item = await prisma.contentFeedItem.findFirst({
    where: { id, tenantId },
    select: { hidden: true },
  });
  if (!item) throw new Error("Content item not found");

  await prisma.contentFeedItem.update({
    where: { id },
    data: { hidden: !item.hidden },
  });
}

export async function deleteFeedItem(
  id: string,
  tenantId: string,
): Promise<void> {
  const item = await prisma.contentFeedItem.findFirst({
    where: { id, tenantId },
  });
  if (!item) throw new Error("Content item not found");

  await prisma.contentFeedItem.delete({ where: { id } });
}
