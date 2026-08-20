"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { courseService } from "./service";
import { courseFormSchema } from "./validators";
import type { CourseData, CourseFormInput } from "./types";
import { afterContentChange } from "@/lib/publishing/content-change";
import { withLaunchCoreContentCapacity } from "@/modules/billing/application/content-limit.enforcement";
import { contentLimitRejection, type ContentMutationResult } from "@/modules/billing/application/content-limit.result";
import { FEATURE_IDS } from "@/lib/capabilities/constants";

export async function listCourses() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return courseService.list(tenantId);
}

export async function getCourse(id: string) {
  // RCCF-63.3 — tenant-authoritative read. The course id alone never selects a
  // foreign-tenant course; ownership is derived from the authenticated session.
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return courseService.getById(tenantId, id);
}

export async function createCourse(input: CourseFormInput): Promise<ContentMutationResult<CourseData>> {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId) throw new Error("Unauthorized");

    const parsed = courseFormSchema.parse(input);
    const outcome = await withLaunchCoreContentCapacity(tenantId, FEATURE_IDS.COURSES, (tx) =>
      courseService.create(tenantId, parsed as CourseFormInput, tx),
    );
    if (typeof outcome === "object" && outcome !== null && "ok" in outcome) {
      if (!outcome.ok) return contentLimitRejection(outcome);
      return { success: false, error: "Failed to create course" };
    }
    const result = outcome as CourseData;
    revalidatePath("/admin/courses");
    await afterContentChange(tenantId);
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to create course" };
  }
}

export async function updateCourse(id: string, input: CourseFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = courseFormSchema.parse(input);
  const result = await courseService.update(tenantId, id, parsed as CourseFormInput);
  revalidatePath("/admin/courses");
  await afterContentChange(tenantId);
  return result;
}

export async function deleteCourse(id: string) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  await courseService.delete(tenantId, id);
  revalidatePath("/admin/courses");
  await afterContentChange(tenantId);
}
