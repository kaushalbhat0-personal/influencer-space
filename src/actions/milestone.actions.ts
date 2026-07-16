"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

export async function fetchMilestones(
  tenantId: string,
): Promise<{ success: boolean; data?: MilestoneData[]; error?: string }> {
  try {
    await requireAdminAccess(tenantId);

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
    await requireAdminAccess(tenantId);

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

    revalidatePath("/admin/milestones");
    return { success: true, data: event };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create milestone",
    };
  }
}

export type MilestoneActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createMilestoneWithState(
  _prevState: MilestoneActionState,
  formData: FormData,
): Promise<MilestoneActionState> {
  const tenant = await getTenantContext();
  if (!tenant) return { success: false, error: "No tenant configured" };
  const result = await createMilestone(tenant.id, formData);
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

export async function updateExistingMilestone(
  tenantId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAccess(tenantId);

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

    revalidatePath("/admin/milestones");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update milestone",
    };
  }
}

export async function updateMilestoneWithState(
  _prevState: MilestoneActionState,
  formData: FormData,
): Promise<MilestoneActionState> {
  const tenant = await getTenantContext();
  if (!tenant) return { success: false, error: "No tenant configured" };
  const result = await updateExistingMilestone(tenant.id, formData);
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

export async function removeMilestone(
  id: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAccess(tenantId);

    const existing = await prisma.timelineEvent.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return { success: false, error: "Milestone not found" };
    }

    await prisma.timelineEvent.delete({ where: { id } });

    revalidatePath("/admin/milestones");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete milestone",
    };
  }
}
