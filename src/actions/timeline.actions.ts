"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TimelineService } from "@/services/timeline.service";
import { StorageService } from "@/services/storage.service";
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
  const raw = Object.fromEntries(formData);
  console.log("📅 createTimelineEvent called with:", raw);

  const parsed = timelineSchema.safeParse({
    year: formData.get("year"),
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    stats: formData.get("stats"),
  });

  if (!parsed.success) {
    console.log("📅 createTimelineEvent validation failed:", parsed.error.flatten().fieldErrors);
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await TimelineService.create({
      year: parsed.data.year,
      title: parsed.data.title,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl || undefined,
      stats: parsed.data.stats || undefined,
    });
    console.log("📅 createTimelineEvent success:", result.id);
    revalidatePath(TIMELINE_ROUTE);
    return { success: true };
  } catch (error) {
    console.error("📅 createTimelineEvent error:", error);
    return { success: false, error: "Failed to create timeline event" };
  }
}

export async function updateTimelineEvent(
  _prevState: TimelineActionState,
  formData: FormData,
): Promise<TimelineActionState> {
  const id = formData.get("id") as string;
  const raw = Object.fromEntries(formData);
  console.log("📅 updateTimelineEvent called — id:", id, "data:", raw);

  if (!id) {
    console.log("📅 updateTimelineEvent missing id");
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
    console.log("📅 updateTimelineEvent validation failed:", parsed.error.flatten().fieldErrors);
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
    console.log("📅 updateTimelineEvent success — id:", id);
    revalidatePath(TIMELINE_ROUTE);
    return { success: true };
  } catch (error) {
    console.error("📅 updateTimelineEvent error:", error);
    return { success: false, error: "Failed to update timeline event" };
  }
}

export async function deleteTimelineEvent(
  id: string,
): Promise<TimelineActionState> {
  console.log("📅 deleteTimelineEvent called — id:", id);
  try {
    const event = await TimelineService.findById(id);
    console.log("📅 deleteTimelineEvent found:", event?.id);
    if (event?.imageUrl) {
      const path = StorageService.extractPathFromUrl(event.imageUrl);
      console.log("📅 deleteTimelineEvent extracting storage path:", path);
      if (path) {
        await StorageService.delete(path);
        console.log("📅 deleteTimelineEvent storage file deleted:", path);
      }
    }
    await TimelineService.delete(id);
    console.log("📅 deleteTimelineEvent success — id:", id);
    revalidatePath(TIMELINE_ROUTE);
    return { success: true };
  } catch (error) {
    console.error("📅 deleteTimelineEvent error:", error);
    return { success: false, error: "Failed to delete timeline event" };
  }
}
