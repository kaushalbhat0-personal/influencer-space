"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { courseService } from "./service";
import { courseFormSchema } from "./validators";
import type { CourseFormInput } from "./types";
import { afterContentChange } from "@/lib/publishing/content-change";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";

export async function listCourses() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return courseService.list(tenantId);
}

export async function getCourse(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return courseService.getById(id);
}

export async function createCourse(input: CourseFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = courseFormSchema.parse(input);
  const limit = await enforceContentLimit({ tenantId, featureKey: FEATURE_IDS.COURSES });
  if (!limit.ok) throw new Error(limit.reason);
  const result = await courseService.create(tenantId, parsed as CourseFormInput);
  revalidatePath("/admin/courses");
  await afterContentChange(tenantId);
  return result;
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
