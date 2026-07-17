"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import type { FeedItemRow } from "@/services/content-feed.service";

async function requireAuth(tenantId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
}

export async function fetchContentFeedItems(
  tenantId: string,
): Promise<{ success: boolean; data?: FeedItemRow[]; error?: string }> {
  try {
    await requireAuth(tenantId);

    const rows = await prisma.contentFeedItem.findMany({
      where: { tenantId },
      orderBy: [{ pinned: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: rows as unknown as FeedItemRow[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch content feed items",
    };
  }
}

export async function togglePinItem(
  id: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth(tenantId);

    const item = await prisma.contentFeedItem.findFirst({
      where: { id, tenantId },
      select: { pinned: true },
    });
    if (!item) return { success: false, error: "Content item not found" };

    const newPinned = !item.pinned;
    await prisma.contentFeedItem.update({
      where: { id },
      data: { pinned: newPinned },
    });

    await logAction(tenantId, "togglePinItem", { itemId: id, pinned: newPinned });
    revalidatePath("/admin/settings/content");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle pin",
    };
  }
}

export async function toggleHideItem(
  id: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth(tenantId);

    const item = await prisma.contentFeedItem.findFirst({
      where: { id, tenantId },
      select: { hidden: true },
    });
    if (!item) return { success: false, error: "Content item not found" };

    const newHidden = !item.hidden;
    await prisma.contentFeedItem.update({
      where: { id },
      data: { hidden: newHidden },
    });

    await logAction(tenantId, "toggleHideItem", { itemId: id, hidden: newHidden });
    revalidatePath("/admin/settings/content");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle visibility",
    };
  }
}

export async function deleteFeedItem(
  id: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth(tenantId);

    const existing = await prisma.contentFeedItem.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return { success: false, error: "Content item not found" };

    await prisma.contentFeedItem.delete({ where: { id } });

    await logAction(tenantId, "deleteFeedItem", { itemId: id, caption: existing.caption ?? null, platform: existing.platform });
    revalidatePath("/admin/settings/content");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete content item",
    };
  }
}
