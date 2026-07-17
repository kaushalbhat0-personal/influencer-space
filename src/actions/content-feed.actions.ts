"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import type { FeedItemRow } from "@/services/content-feed.service";

async function requireAdminAccess(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized — Admin access required");
  }

  const tenant = await getTenantContext();
  if (!tenant || tenant.id !== tenantId) {
    throw new Error("Unauthorized — tenant mismatch");
  }

  return tenant;
}

export async function fetchContentFeedItems(
  tenantId: string,
): Promise<{ success: boolean; data?: FeedItemRow[]; error?: string }> {
  try {
    await requireAdminAccess(tenantId);

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
    await requireAdminAccess(tenantId);

    const item = await prisma.contentFeedItem.findFirst({
      where: { id, tenantId },
      select: { pinned: true },
    });
    if (!item) return { success: false, error: "Content item not found" };

    await prisma.contentFeedItem.update({
      where: { id },
      data: { pinned: !item.pinned },
    });

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
    await requireAdminAccess(tenantId);

    const item = await prisma.contentFeedItem.findFirst({
      where: { id, tenantId },
      select: { hidden: true },
    });
    if (!item) return { success: false, error: "Content item not found" };

    await prisma.contentFeedItem.update({
      where: { id },
      data: { hidden: !item.hidden },
    });

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
    await requireAdminAccess(tenantId);

    const existing = await prisma.contentFeedItem.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return { success: false, error: "Content item not found" };

    await prisma.contentFeedItem.delete({ where: { id } });

    revalidatePath("/admin/settings/content");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete content item",
    };
  }
}
