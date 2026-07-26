"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { courseService } from "./service";
import type { CourseFormInput } from "./types";

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

  const result = await courseService.create(tenantId, input);
  revalidatePath("/admin/courses");
  return result;
}
