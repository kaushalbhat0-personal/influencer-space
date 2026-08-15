"use server";
import type { LinkData } from "./link.types";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { afterContentChange } from "@/lib/publishing/content-change";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";

const createLinkSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  url: z.string().url("Must be a valid URL").max(2000),
});

async function requireAuth(tenantId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
}

export async function getLinks(
  tenantId: string,
): Promise<{ success: boolean; data?: LinkData[]; error?: string }> {
  try {
    await requireAuth(tenantId);

    const links = await prisma.affiliateLink.findMany({
      where: { tenantId },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: links };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch links",
    };
  }
}

export async function createLink(
  tenantId: string,
  formData: FormData,
): Promise<{ success: boolean; data?: LinkData; error?: string }> {
  try {
    await requireAuth(tenantId);

    const parsed = createLinkSchema.safeParse({
      title: formData.get("title"),
      url: formData.get("url"),
    });

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      return {
        success: false,
        error: first.title?.[0] || first.url?.[0] || "Invalid input",
      };
    }

    const limit = await enforceContentLimit({ tenantId, featureKey: FEATURE_IDS.LINKS });
    if (!limit.ok) return { success: false, error: limit.reason };

    const link = await prisma.$transaction(async (tx) => {
      const l = await tx.affiliateLink.create({
        data: {
          tenantId,
          title: parsed.data.title,
          url: parsed.data.url,
          clicks: 0,
          isActive: true,
        },
      });
      await logAction(tenantId, "createLink", { linkId: l.id, title: l.title }, tx);
      return l;
    });

    revalidatePath("/admin/links");
    await afterContentChange(tenantId);
    return { success: true, data: link };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create link",
    };
  }
}

export async function toggleLinkStatus(
  id: string,
  tenantId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth(tenantId);

    const existing = await prisma.affiliateLink.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return { success: false, error: "Link not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.affiliateLink.update({
        where: { id },
        data: { isActive },
      });
      await logAction(tenantId, "toggleLinkStatus", { linkId: id, isActive }, tx);
    });

    revalidatePath("/admin/links");
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle link",
    };
  }
}

export async function updateLinkOrder(
  tenantId: string,
  updates: { id: string; order: number }[],
): Promise<{ success: boolean; error?: string }> {
  try {
    // RCCF-67.2: the session is authoritative — requireAuth rejects any
    // non-super-admin whose client-supplied tenantId differs from the session,
    // so tenantId used below is always the session tenant for creators.
    await requireAuth(tenantId);

    // RCCF-67.2 (P1 IDOR): each write is scoped by tenantId so a foreign link
    // id can never be mutated. `updateMany` with the tenant in the WHERE
    // guarantees zero cross-tenant mutation even for a mixed A/B id list.
    await prisma.$transaction(
      updates.map((u) =>
        prisma.affiliateLink.updateMany({
          where: { id: u.id, tenantId },
          data: { order: u.order },
        }),
      ),
    );

    await logAction(tenantId, "reorderLinks", { count: updates.length });
    revalidatePath("/admin/links");
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder links",
    };
  }
}

export async function updateExistingLink(
  tenantId: string,
  formData: FormData,
): Promise<{ success: boolean; data?: LinkData; error?: string }> {
  try {
    await requireAuth(tenantId);

    const id = formData.get("id");
    if (!id || typeof id !== "string") {
      return { success: false, error: "Link ID is required" };
    }

    const parsed = createLinkSchema.safeParse({
      title: formData.get("title"),
      url: formData.get("url"),
    });

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      return { success: false, error: first.title?.[0] || first.url?.[0] || "Invalid input" };
    }

    const existing = await prisma.affiliateLink.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return { success: false, error: "Link not found" };

    const link = await prisma.$transaction(async (tx) => {
      const l = await tx.affiliateLink.update({
        where: { id },
        data: {
          title: parsed.data.title,
          url: parsed.data.url,
        },
      });
      await logAction(tenantId, "updateLink", { linkId: id }, tx);
      return l;
    });

    revalidatePath("/admin/links");
    await afterContentChange(tenantId);
    return { success: true, data: link };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update link",
    };
  }
}

export async function deleteLink(
  id: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth(tenantId);

    const existing = await prisma.affiliateLink.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return { success: false, error: "Link not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.affiliateLink.delete({ where: { id } });
      await logAction(tenantId, "deleteLink", { linkId: id, title: existing.title }, tx);
    });

    revalidatePath("/admin/links");
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete link",
    };
  }
}


