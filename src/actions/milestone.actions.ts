"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const createMilestoneSchema = z.object({
  year: z.string().min(1, "Year is required").max(10),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(1000),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  stats: z.string().max(100).optional().or(z.literal("")),
});

export type MilestoneData = {
  id: string;
  year: string;
  title: string;
  description: string;
  imageUrl: string | null;
  stats: string | null;
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

export async function fetchMilestones(
  tenantId: string,
): Promise<{ success: boolean; data?: MilestoneData[]; error?: string }> {
  try {
    await requireAuth(tenantId);

    const events = await prisma.timelineEvent.findMany({
      where: { tenantId },
      orderBy: { year: "desc" },
    });

    return { success: true, data: events };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch milestones",
    };
  }
}

export async function createMilestone(
  tenantId: string,
  formData: FormData,
): Promise<{ success: boolean; data?: MilestoneData; error?: string }> {
  try {
    await requireAuth(tenantId);

    const parsed = createMilestoneSchema.safeParse({
      year: formData.get("year"),
      title: formData.get("title"),
      description: formData.get("description"),
      imageUrl: formData.get("imageUrl"),
      stats: formData.get("stats"),
    });

    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const first =
        fields.year?.[0] || fields.title?.[0] || fields.description?.[0] || "Invalid input";
      return { success: false, error: first };
    }

    const maxOrder = await prisma.timelineEvent.aggregate({
      where: { tenantId },
      _max: { order: true },
    });

    const event = await prisma.timelineEvent.create({
      data: {
        tenantId,
        year: parsed.data.year,
        title: parsed.data.title,
        description: parsed.data.description,
        imageUrl: parsed.data.imageUrl || null,
        stats: parsed.data.stats || null,
        order: (maxOrder._max.order ?? 0) + 1,
      },
    });

    await logAction(tenantId, "createMilestone", { milestoneId: event.id, title: event.title });
    revalidatePath("/admin/milestones");
    return { success: true, data: event };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create milestone",
    };
  }
}

export async function updateExistingMilestone(
  tenantId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth(tenantId);

    const id = formData.get("id");
    if (!id || typeof id !== "string") {
      return { success: false, error: "Milestone ID is required" };
    }

    const parsed = createMilestoneSchema.safeParse({
      year: formData.get("year"),
      title: formData.get("title"),
      description: formData.get("description"),
      imageUrl: formData.get("imageUrl"),
      stats: formData.get("stats"),
    });

    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const first =
        fields.year?.[0] || fields.title?.[0] || fields.description?.[0] || "Invalid input";
      return { success: false, error: first };
    }

    const existing = await prisma.timelineEvent.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return { success: false, error: "Milestone not found" };
    }

    await prisma.timelineEvent.update({
      where: { id },
      data: {
        year: parsed.data.year,
        title: parsed.data.title,
        description: parsed.data.description,
        imageUrl: parsed.data.imageUrl || null,
        stats: parsed.data.stats || null,
      },
    });

    await logAction(tenantId, "updateMilestone", { milestoneId: id });
    revalidatePath("/admin/milestones");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update milestone",
    };
  }
}

export async function removeMilestone(
  id: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth(tenantId);

    const existing = await prisma.timelineEvent.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return { success: false, error: "Milestone not found" };
    }

    await prisma.timelineEvent.delete({ where: { id } });

    await logAction(tenantId, "deleteMilestone", { milestoneId: id, title: existing.title });
    revalidatePath("/admin/milestones");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete milestone",
    };
  }
}
