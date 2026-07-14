"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TimelineService } from "@/services/timeline.service";
import { TIMELINE_ROUTE } from "@/lib/constants";

const timelineSchema = z.object({
  year: z.string().min(1, "Year is required").max(10),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(1000),
  imageUrl: z.string().optional().or(z.literal("")),
  stats: z.string().max(100).optional().or(z.literal("")),
});

export type TimelineActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createTimelineEvent(
  _prevState: TimelineActionState,
  formData: FormData,
): Promise<TimelineActionState> {
  const parsed = timelineSchema.safeParse({
    year: formData.get("year"),
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    stats: formData.get("stats"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await TimelineService.create({
      year: parsed.data.year,
      title: parsed.data.title,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl || undefined,
      stats: parsed.data.stats || undefined,
    });
    revalidatePath(TIMELINE_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create timeline event" };
  }
}

export async function updateTimelineEvent(
  _prevState: TimelineActionState,
  formData: FormData,
): Promise<TimelineActionState> {
  const id = formData.get("id") as string;
  if (!id) {
    return { success: false, error: "Event ID is required" };
  }

  const parsed = timelineSchema.safeParse({
    year: formData.get("year"),
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    stats: formData.get("stats"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await TimelineService.update(id, {
      year: parsed.data.year,
      title: parsed.data.title,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl || undefined,
      stats: parsed.data.stats || undefined,
    });
    revalidatePath(TIMELINE_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update timeline event" };
  }
}

export async function deleteTimelineEvent(
  id: string,
): Promise<TimelineActionState> {
  try {
    await TimelineService.delete(id);
    revalidatePath(TIMELINE_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete timeline event" };
  }
}
