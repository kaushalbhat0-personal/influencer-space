"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createLinkSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  url: z.string().url("Must be a valid URL").max(2000),
});

export type LinkData = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  clicks: number;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

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

    const link = await prisma.affiliateLink.create({
      data: {
        tenantId,
        title: parsed.data.title,
        url: parsed.data.url,
        clicks: 0,
        isActive: true,
      },
    });

    revalidatePath("/admin/links");
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

    await prisma.affiliateLink.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/admin/links");
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
    await requireAuth(tenantId);

    await prisma.$transaction(
      updates.map((u) =>
        prisma.affiliateLink.update({
          where: { id: u.id },
          data: { order: u.order },
        }),
      ),
    );

    revalidatePath("/admin/links");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder links",
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

    await prisma.affiliateLink.delete({ where: { id } });

    revalidatePath("/admin/links");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete link",
    };
  }
}
